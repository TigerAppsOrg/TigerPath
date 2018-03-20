from .base import *


# This secret key is used only for development
SECRET_KEY = 'no7bxov1^uh=ksbp-xyw=#%4pn@01naitpdfj=-3*kao-3w93a'


DEBUG = True


# The host/domain names that can be served
ALLOWED_HOSTS = []


# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': 'tigerpath',
        'USER': '',
        'PASSWORD': '',
        'HOST': 'localhost',
        'PORT': '',
    }
}
