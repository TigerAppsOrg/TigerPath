from django.urls import path
from . import views

urlpatterns = [
    # app urls
    path('', views.index, name='index'),
    path('landing', views.landing, name='landing'),
    path('about', views.about, name='about'),
    path('privacy', views.privacy_policy, name='privacy_policy'),
    path('onboarding/save', views.save_onboarding, name='save_onboarding'),
    path('settings/save', views.save_user_settings, name='save_settings'),
    path('transcript/save', views.save_transcript_courses, name='save_transcript'),
    # cas auth
    path('login', views.login, name='login'),
    path('logout', views.logout, name='logout'),
    # api
    path('api/v1/get_courses/<search_query>', views.get_courses, name='get_courses'),
    path('api/v1/get_courses/', views.get_courses, name='get_courses'),
    path('api/v1/update_schedule/', views.update_schedule, name='update_schedule'),
    path('api/v1/get_schedule/', views.get_schedule, name='get_schedule'),
    path('api/v1/get_requirements/', views.get_requirements, name='get_requirements'),
    path('api/v1/get_req_courses/<req_path>', views.get_req_courses, name='get_req_courses'),
    path('api/v1/get_profile/', views.get_profile, name='get_profile'),
]
