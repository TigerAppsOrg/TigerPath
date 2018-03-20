from .base import *


# This secret key is used only for development
SECRET_KEY = 'no7bxov1^uh=ksbp-xyw=#%4pn@01naitpdfj=-3*kao-3w93a'


DEBUG = True


# Database (may need to change some values so it references your local db)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'NAME': 'tigerpath',
        'HOST': 'localhost'
    }
}
