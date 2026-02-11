from .base import *

DEBUG = False
ADMIN_ENABLED = True

DJANGO_VITE["default"]["dev_mode"] = False
DJANGO_VITE["default"]["static_url_prefix"] = "dist"

# Security
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
