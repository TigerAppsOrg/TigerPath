from .base import *
import os


DEBUG = False
ADMIN_ENABLED = DEBUG

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')

WEBPACK_LOADER = {
    'DEFAULT': {
            'BUNDLE_DIR_NAME': 'bundles/',
            'STATS_FILE': os.path.join(REACT_BASE_DIR, 'webpack-stats.prod.json'),
        }
}


# Security
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True


# Get email notifs about errors. Not scalable, so look into sentry later: https://docs.sentry.io
ADMINS = [('Richard', 'rc11@princeton.edu')]
