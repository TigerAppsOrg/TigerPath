from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
import django_cas_ng.views


# cas auth login
@csrf_exempt
def login(request):
    if request.user.is_authenticated:
        return render(request, 'tigerpath/index.html', None)
    else:
        return django_cas_ng.views.login(request)


# cas auth logout
def logout(request):
    return django_cas_ng.views.logout(request)


# index page
def index(request):
    if request.user.is_authenticated:
        return render(request, 'tigerpath/index.html', None)
    else:
        return render(request, 'tigerpath/landing.html', None)


# landing page
def landing(request):
    return render(request, 'tigerpath/landing.html', None)


# about page
def about(request):
    return render(request, 'tigerpath/about.html', None)
