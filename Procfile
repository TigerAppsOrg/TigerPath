release: python manage.py migrate --noinput
web: gunicorn config.wsgi:application -w 4 --timeout 600 --log-file -
