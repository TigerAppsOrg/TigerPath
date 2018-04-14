import os
import dj_database_url


# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REACT_BASE_DIR = os.path.dirname(BASE_DIR)


# Application definition

INSTALLED_APPS = [
    'tigerpath.apps.TigerPathConfig',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django_cas_ng',
    'webpack_loader',
]

WEBPACK_LOADER = {
    'DEFAULT': {
            'BUNDLE_DIR_NAME': 'bundles/',
            'STATS_FILE': os.path.join(REACT_BASE_DIR, 'webpack-stats.dev.json'),
        }
}

MIDDLEWARE = [
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
    'django_cas_ng.backends.CASBackend',
)

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Password validation
# https://docs.djangoproject.com/en/2.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/2.0/topics/i18n/

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'America/New_York'
USE_I18N = True
USE_L10N = True
USE_TZ = True


# Set secret key, database
SECRET_KEY = os.getenv('SECRET_KEY', 'no7bxov1^uh=ksbp-xyw=#%4pn@01naitpdfj=-3*kao-3w93a')

DATABASES = {}
DATABASES['default'] = dj_database_url.config(default='postgres://tigerpath:e7e5f0ee15f81d80076716add445d5dacc0b74f0e5c27638a3b47e47017d80abb170c5f64b7f385f87e2eb7f0cf6928a6f@67.207.80.210:5432/tigerpath')


# Static files (CSS, JavaScript, Images)

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'

# Ensure STATIC_ROOT exists.
os.makedirs(STATIC_ROOT, exist_ok=True)

# Enable gzip functionality for static files
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# Security

SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'


# CAS Authentication

CAS_SERVER_URL = 'https://fed.princeton.edu/cas/'
CAS_FORCE_CHANGE_USERNAME_CASE = 'lower'
CAS_LOGIN_MSG = None
CAS_LOGGED_MSG = None

# GLOBAL VARIABLES

# Apparent term numbering system (unconfirmed):
#   Fall: 1{last 2 digits of ending year}2
#   Spring: 1{last 2 digits of ending year}4
# For example, the Fall 2016 term is 1172 - the ending year is 2017.
# Similarly, the Spring 2017 term is 1174 - the ending year is 2017.
# Note: generally, limit this to three terms. This defines the terms that are
#   scraped and the default terms displayed on schedules.
ACTIVE_TERMS = [1182, 1184]
