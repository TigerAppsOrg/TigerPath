import json
import pathlib

from django.contrib.auth.models import User
from django.test import TestCase

from tigerpath import forms
from tigerpath.majors_and_certificates.scripts.verifier import list_minor_definitions
from tigerpath.models import Major, SchedulePlan, UserProfile


class UserProfileSignalTest(TestCase):
    def test_user_profile_created_on_user_save(self):
        """Verify that creating a User automatically creates a UserProfile via signal."""
        user = User.objects.create_user(username="testuser", password="testpass")
        self.assertTrue(UserProfile.objects.filter(user=user).exists())

    def test_user_profile_default_state(self):
        """Verify the default user_state has onboarding_complete=False."""
        user = User.objects.create_user(username="testuser2", password="testpass")
        profile = user.profile
        self.assertFalse(profile.user_state["onboarding_complete"])

    def test_user_profile_default_plan_created(self):
        """Verify that each new user has a default schedule plan and active plan id."""
        user = User.objects.create_user(username="testuser3", password="testpass")
        profile = user.profile

        plans = SchedulePlan.objects.filter(user_profile=profile)
        self.assertEqual(plans.count(), 1)

        plan = plans.first()
        self.assertEqual(plan.name, "My Plan")
        self.assertEqual(profile.user_state["active_plan_id"], plan.id)


class PageViewTest(TestCase):
    def test_landing_page_anonymous(self):
        """GET / returns 200 for anonymous users (landing page)."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)

    def test_about_page(self):
        """GET /about returns 200."""
        response = self.client.get("/about")
        self.assertEqual(response.status_code, 200)

    def test_api_requires_auth(self):
        """GET /api/v1/get_schedule/ returns 302 redirect for unauthenticated users."""
        response = self.client.get("/api/v1/get_schedule/")
        self.assertEqual(response.status_code, 302)


class OnboardingFlowTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="onboard_user", password="testpass")
        self.client.force_login(self.user)

    def test_index_shows_onboarding_when_major_choices_exist(self):
        Major.objects.create(name="Computer Science", code="COS", degree="AB", supported=True)
        response = self.client.get("/")
        self.assertContains(response, 'id="onboarding-modal"')

    def test_index_shows_onboarding_when_year_missing_and_no_major_choices(self):
        """Even without majors loaded, users should still set class year."""
        response = self.client.get("/")
        self.assertContains(response, 'id="onboarding-modal"')

    def test_index_marks_onboarding_incomplete_if_profile_fields_are_missing(self):
        profile = self.user.profile
        profile.user_state = {"onboarding_complete": True}
        profile.save(update_fields=["user_state"])

        response = self.client.get("/")
        self.assertContains(response, 'id="onboarding-modal"')

        profile.refresh_from_db()
        self.assertFalse(profile.user_state["onboarding_complete"])

    def test_post_onboarding_without_majors_is_not_blocking(self):
        valid_year = forms.create_year_choices()[0][0]
        response = self.client.post("/onboarding/save", {"year": valid_year}, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "startIntro();")

        profile = self.user.profile
        profile.refresh_from_db()
        self.assertTrue(profile.user_state["onboarding_complete"])

    def test_index_does_not_require_major_for_onboarding_when_year_exists(self):
        Major.objects.create(name="Computer Science", code="COS", degree="AB", supported=True)
        profile = self.user.profile
        profile.year = forms.create_year_choices()[0][0]
        profile.major = None
        profile.user_state = {"onboarding_complete": False}
        profile.save(update_fields=["year", "major", "user_state"])

        response = self.client.get("/")
        self.assertNotContains(response, 'id="onboarding-modal"')


class SchedulePlanApiTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="planner_user", password="testpass")
        self.client.force_login(self.user)
        self.profile = self.user.profile
        self.default_plan = self.profile.schedule_plans.get()

    def test_get_plans_returns_default_active_plan(self):
        response = self.client.get("/api/v1/get_plans/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["activePlanId"], self.default_plan.id)
        self.assertEqual(len(payload["plans"]), 1)
        self.assertEqual(payload["plans"][0]["name"], "My Plan")
        self.assertTrue(payload["plans"][0]["isActive"])

    def test_create_plan_starts_fresh_and_copy_plan_duplicates_schedule(self):
        original_schedule = [[{"id": "COS126", "settled": []}], [], [], [], [], [], [], [], []]
        self.default_plan.schedule = original_schedule
        self.default_plan.save(update_fields=["schedule"])

        create_response = self.client.post(
            "/api/v1/create_plan/",
            {"name": "Four Year Draft"},
        )

        self.assertEqual(create_response.status_code, 200)
        created_plan = self.profile.schedule_plans.exclude(id=self.default_plan.id).get()
        self.assertEqual(created_plan.name, "Four Year Draft")
        self.assertEqual(created_plan.schedule, [])

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.user_state["active_plan_id"], created_plan.id)

        created_plan.schedule = original_schedule
        created_plan.save(update_fields=["schedule"])

        copy_response = self.client.post(
            "/api/v1/copy_plan/",
            {"sourcePlanId": created_plan.id},
        )

        self.assertEqual(copy_response.status_code, 200)
        copied_plan = self.profile.schedule_plans.order_by("-id").first()
        self.assertEqual(copied_plan.name, "Four Year Draft Copy")
        self.assertEqual(copied_plan.schedule, original_schedule)

    def test_rename_and_delete_plan_enforce_minimum_plan_count(self):
        rename_response = self.client.post(
            "/api/v1/rename_plan/",
            {"planId": self.default_plan.id, "name": "Main Plan"},
        )
        self.assertEqual(rename_response.status_code, 200)
        self.default_plan.refresh_from_db()
        self.assertEqual(self.default_plan.name, "Main Plan")

        delete_last_response = self.client.post(
            "/api/v1/delete_plan/",
            {"planId": self.default_plan.id},
        )
        self.assertEqual(delete_last_response.status_code, 400)
        self.assertEqual(delete_last_response.json()["error"], "At least one plan is required")

        second_plan = SchedulePlan.objects.create(
            user_profile=self.profile,
            name="Backup",
            schedule=[],
        )
        delete_response = self.client.post(
            "/api/v1/delete_plan/",
            {"planId": self.default_plan.id},
        )
        self.assertEqual(delete_response.status_code, 200)

        self.profile.refresh_from_db()
        self.assertFalse(self.profile.schedule_plans.filter(id=self.default_plan.id).exists())
        self.assertEqual(self.profile.user_state["active_plan_id"], second_plan.id)

    def test_plan_editor_options_and_update_settings(self):
        major = Major.objects.create(
            name="Economics",
            code="ECO",
            degree="AB",
            supported=True,
        )

        supported_codes = sorted(minor["code"] for minor in list_minor_definitions())
        selected_minor_codes = supported_codes[:1]

        options_response = self.client.get("/api/v1/get_plan_editor_options/")
        self.assertEqual(options_response.status_code, 200)
        options_payload = options_response.json()
        self.assertIn("majorOptions", options_payload)
        self.assertIn("minorOptions", options_payload)
        self.assertTrue(
            any(option["id"] == major.id for option in options_payload["majorOptions"])
        )

        update_response = self.client.post(
            "/api/v1/update_plan_settings/",
            {
                "planId": self.default_plan.id,
                "name": "Econ Path",
                "majorId": major.id,
                "minorCodes": json.dumps(selected_minor_codes),
            },
        )
        self.assertEqual(update_response.status_code, 200)

        self.default_plan.refresh_from_db()
        self.assertEqual(self.default_plan.name, "Econ Path")
        self.assertEqual(self.default_plan.major_id, major.id)
        self.assertEqual(self.default_plan.minors, selected_minor_codes)

    def test_plan_editor_minor_options_only_include_supported_certificates(self):
        response = self.client.get("/api/v1/get_plan_editor_options/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        supported_codes = {minor["code"] for minor in list_minor_definitions()}

        option_codes = {option["code"] for option in payload.get("minorOptions", [])}
        self.assertEqual(option_codes, supported_codes)

        supported_option_codes = {
            option["code"]
            for option in payload.get("minorOptions", [])
            if option.get("supported")
        }
        self.assertEqual(supported_option_codes, supported_codes)

    def test_set_active_plan_and_update_schedule_are_plan_specific(self):
        second_plan = SchedulePlan.objects.create(
            user_profile=self.profile,
            name="Alt Plan",
            schedule=[
                [{"id": "ext-1", "name": "Transfer Math", "external": True, "settled": []}],
                [],
                [],
                [],
                [],
                [],
                [],
                [],
                [],
            ],
        )

        activate_response = self.client.post(
            "/api/v1/set_active_plan/",
            {"planId": second_plan.id},
        )
        self.assertEqual(activate_response.status_code, 200)

        schedule_response = self.client.get("/api/v1/get_schedule/")
        self.assertEqual(schedule_response.status_code, 200)
        schedule_payload = schedule_response.json()
        self.assertEqual(schedule_payload[0][0]["id"], "ext-1")

        updated_schedule = [
            [{"id": "ext-2", "name": "AP Physics", "external": True, "settled": []}],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
        ]
        update_response = self.client.post(
            "/api/v1/update_schedule/",
            {"schedule": json.dumps(updated_schedule)},
        )
        self.assertEqual(update_response.status_code, 200)

        second_plan.refresh_from_db()
        self.default_plan.refresh_from_db()
        self.assertEqual(second_plan.schedule, updated_schedule)
        self.assertNotEqual(self.default_plan.schedule, updated_schedule)

    def test_requirements_use_active_plan_major_not_profile_major(self):
        profile_major = Major.objects.create(
            name="Profile Major",
            code="PMJ",
            degree="AB",
            supported=False,
        )

        self.profile.year = forms.create_year_choices()[0][0]
        self.profile.major = profile_major
        self.profile.save(update_fields=["year", "major"])

        self.default_plan.major = None
        self.default_plan.minors = []
        self.default_plan.save(update_fields=["major", "minors", "updated_at"])

        response_without_plan_major = self.client.get("/api/v1/get_requirements/")
        self.assertEqual(response_without_plan_major.status_code, 200)
        self.assertEqual(response_without_plan_major.json(), [])

        self.default_plan.major = profile_major
        self.default_plan.save(update_fields=["major", "updated_at"])

        response_with_plan_major = self.client.get("/api/v1/get_requirements/")
        self.assertEqual(response_with_plan_major.status_code, 200)
        requirements_payload = response_with_plan_major.json()
        self.assertGreaterEqual(len(requirements_payload), 2)
        self.assertEqual(requirements_payload[0], "Profile Major")

    def test_requirements_returns_empty_when_year_missing(self):
        major = Major.objects.create(
            name="Economics",
            code="ECO",
            degree="AB",
            supported=True,
        )

        self.profile.year = None
        self.profile.save(update_fields=["year"])

        self.default_plan.major = major
        self.default_plan.minors = []
        self.default_plan.save(update_fields=["major", "minors", "updated_at"])

        response = self.client.get("/api/v1/get_requirements/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])
