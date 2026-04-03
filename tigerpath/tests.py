import json

from django.contrib.auth.models import User
from django.test import TestCase

from tigerpath import forms
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
                "minorCodes": json.dumps(["SML"]),
            },
        )
        self.assertEqual(update_response.status_code, 200)

        self.default_plan.refresh_from_db()
        self.assertEqual(self.default_plan.name, "Econ Path")
        self.assertEqual(self.default_plan.major_id, major.id)
        self.assertEqual(self.default_plan.minors, ["SML"])

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
