release: bash bin/release-migrate.sh
web: gunicorn config.wsgi:application -w 4 --timeout 600 --log-file -
