from .base import *
import os
from os import environ


#DEBUG = False
DEBUG = environ.get('DJANGO_DEBUG', False)
ADMIN_ENABLED = DEBUG

#ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')
ALLOWED_HOSTS = environ.get('ALLOWED_HOSTS', '*').split(',')


def get_cache():
    try:
        environ['MEMCACHE_SERVERS'] = environ[
            'MEMCACHIER_SERVERS'].replace(',', ';')
        environ['MEMCACHE_USERNAME'] = environ['MEMCACHIER_USERNAME']
        environ['MEMCACHE_PASSWORD'] = environ['MEMCACHIER_PASSWORD']
        return {
            'default': {
                'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
                'LOCATION': 'my_cache_table',
                'TIMEOUT': 60 * 60
            },
            'courses': {
                'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
                'LOCATION': 'courses_cache_table',
                'TIMEOUT': 60 * 60
            },
            'courseapi': {
                'BACKEND': 'django.core.cache.backends.db.DatabaseCache',
                'LOCATION': 'courseapi_cache_table',
                'TIMEOUT': 60 * 60
            },
            'memcache': {
                'BACKEND': 'django_pylibmc.memcached.PyLibMCCache',
                'TIMEOUT': 500,
                'BINARY': True,
                'OPTIONS': {
                    'tcp_nodelay': True
                }
            }
        }
    except:
        # local memory caches
        return {
            'default': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'
            },
            'courses': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'
            },
            'courseapi': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'
            }
        }

CACHES = get_cache()

# Security
# CSRF_COOKIE_SECURE = True  # should be uncommented when SSL is implemented

# SESSION_COOKIE_SECURE = True  # should be uncommented when SSL is implemented

# SECURE_SSL_REDIRECT = True  # should be uncommented when SSL is implemented


# Get email notifs about errors. Not scalable, so look into sentry later: https://docs.sentry.io
ADMINS = [('Richard', 'rc11@princeton.edu')]
