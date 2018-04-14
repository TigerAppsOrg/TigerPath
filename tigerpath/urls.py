from django.urls import path
from django.conf.urls import include
from . import views
from .resources import CourseResource

course_resource = CourseResource()

urlpatterns = [
    # app urls
    path('', views.index, name='index'),
    path('landing', views.landing, name='landing'),
    path('about', views.about, name='about'),
    # cas auth
    path('login', views.login, name='cas_ng_login'),
    path('logout', views.logout, name='cas_ng_logout'),
    path('search', views.search, name='search'),
    path('get_courses/', include(course_resource.urls)),
]
