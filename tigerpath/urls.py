from django.urls import path
from . import views

urlpatterns = [
    # app urls
    path("", views.index, name="index"),
    path("landing", views.landing, name="landing"),
    path("about", views.about, name="about"),
    path("privacy", views.privacy_policy, name="privacy_policy"),
    path("onboarding/save", views.save_onboarding, name="save_onboarding"),
    path("settings/save", views.save_user_settings, name="save_settings"),
    # cas auth
    path("login", views.login, name="login"),
    path("logout", views.logout, name="logout"),
    # api
    path("api/v1/get_courses/<search_query>", views.get_courses, name="get_courses"),
    path("api/v1/get_courses/", views.get_courses, name="get_courses"),
    path("api/v1/update_schedule/", views.update_schedule, name="update_schedule"),
    path("api/v1/get_schedule/", views.get_schedule, name="get_schedule"),
    path("api/v1/get_requirements/", views.get_requirements, name="get_requirements"),
    path("api/v1/get_plans/", views.get_plans, name="get_plans"),
    path("api/v1/create_plan/", views.create_plan, name="create_plan"),
    path("api/v1/copy_plan/", views.copy_plan, name="copy_plan"),
    path("api/v1/rename_plan/", views.rename_plan, name="rename_plan"),
    path("api/v1/delete_plan/", views.delete_plan, name="delete_plan"),
    path("api/v1/set_active_plan/", views.set_active_plan, name="set_active_plan"),
    path(
        "api/v1/get_plan_editor_options/",
        views.get_plan_editor_options,
        name="get_plan_editor_options",
    ),
    path(
        "api/v1/update_plan_settings/",
        views.update_plan_settings,
        name="update_plan_settings",
    ),
    path(
        "api/v1/get_req_courses/<req_path>",
        views.get_req_courses,
        name="get_req_courses",
    ),
    path("api/v1/get_profile/", views.get_profile, name="get_profile"),
    path(
        "api/v1/update_schedule_and_get_requirements/",
        views.update_schedule_and_get_requirements,
        name="update_schedule_and_get_requirements",
    ),
    path('admin/admin-dashboard/', views.admin_dashboard, name='admin_dashboard'),
]
