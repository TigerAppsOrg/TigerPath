release: python manage.py migrate --noinput
web: gunicorn config.wsgi:application -w 4 --log-file -
