from django.urls import path
from . import views

urlpatterns = [
    # app urls
    path('', views.index, name='index'),
    path('landing', views.landing, name='landing'),
    path('about', views.about, name='about'),
    path('onboarding', views.onboarding, name='onboarding'),
    path('settings', views.user_settings, name='settings'),
    # cas auth
    path('login', views.login, name='login'),
    path('logout', views.logout, name='logout'),
    # api
    path('api/v1/get_courses/<search_query>', views.get_courses, name='get_courses'),
    path('api/v1/update_schedule/', views.update_schedule, name='update_schedule'),
    path('api/v1/get_schedule/', views.get_schedule, name='get_schedule'),
]
