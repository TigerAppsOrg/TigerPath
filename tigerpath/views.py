from django.shortcuts import render
from django.http import HttpResponse


def index(request):
    return render(request, 'tigerpath/landing.html', None)


def landing(request):
    return render(request, 'tigerpath/landing.html', None)


def about(request):
    return render(request, 'tigerpath/about.html', None)
