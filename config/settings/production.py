from .base import *
from os import environ
import dj_database_url


SECRET_KEY = environ.get(
    'DJANGO_SECRET_KEY', 'ne&m%&p7edpsx0=g9k+5tbs@4x$cs!=kvb4m@t!1o5(tj=kjk8')


DEBUG = False


# The host/domain names that can be served
ALLOWED_HOSTS = environ.get('ALLOWED_HOSTS', '*').split(',')


# Database
DATABASES['default'] = dj_database_url.config()


# Security
# CSRF_COOKIE_SECURE = True  # should be uncommented when SSL is implemented

# SESSION_COOKIE_SECURE = True  # should be uncommented when SSL is implemented

# SECURE_SSL_REDIRECT = True  # should be uncommented when SSL is implemented


# Get email notifs about errors. Not scalable, so look into sentry later: https://docs.sentry.io
ADMINS = [('Richard', 'rc11@princeton.edu')]
