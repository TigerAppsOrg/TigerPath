from .base import *

DEBUG = True
ADMIN_ENABLED = DEBUG

DJANGO_VITE["default"]["dev_mode"] = True

# Use simple static files storage in development (no manifest needed)
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# redirect to index after logging in as admin
LOGIN_REDIRECT_URL = "index"
