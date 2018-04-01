from django.urls import path
from . import views

urlpatterns = [
    # app urls
    path('', views.index, name='index'),
    path('landing', views.landing, name='landing'),
    path('about', views.about, name='about'),
    # cas auth
    path('login', views.login, name='cas_ng_login'),
    path('logout', views.logout, name='cas_ng_logout'),
]
