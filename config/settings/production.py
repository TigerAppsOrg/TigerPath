from .base import *
import os


DEBUG = False
ADMIN_ENABLED = DEBUG

ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '*').split(',')

STATICFILES_DIRS = [
    os.path.join(REACT_BASE_DIR, "assets"),
]

WEBPACK_LOADER = {
    'DEFAULT': {
            'BUNDLE_DIR_NAME': 'bundles/',
            'STATS_FILE': os.path.join(REACT_BASE_DIR, 'webpack-stats.prod.json'),
        }
}

# Security
# CSRF_COOKIE_SECURE = True  # should be uncommented when SSL is implemented

# SESSION_COOKIE_SECURE = True  # should be uncommented when SSL is implemented

# SECURE_SSL_REDIRECT = True  # should be uncommented when SSL is implemented


# Get email notifs about errors. Not scalable, so look into sentry later: https://docs.sentry.io
ADMINS = [('Richard', 'rc11@princeton.edu')]
