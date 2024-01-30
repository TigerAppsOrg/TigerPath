release: python manage.py migrate --noinput
web: gunicorn config.wsgi:application -w 3 --log-file -
