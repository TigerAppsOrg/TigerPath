from django.contrib.auth.models import User
from django.test import TestCase

from tigerpath import forms
from tigerpath.models import Major, UserProfile


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

    def test_post_onboarding_without_majors_is_not_blocking(self):
        valid_year = forms.create_year_choices()[0][0]
        response = self.client.post("/onboarding/save", {"year": valid_year}, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "startIntro();")

        profile = self.user.profile
        profile.refresh_from_db()
        self.assertTrue(profile.user_state["onboarding_complete"])
