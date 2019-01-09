from .base import *
import os


DEBUG = False
ADMIN_ENABLED = DEBUG

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
