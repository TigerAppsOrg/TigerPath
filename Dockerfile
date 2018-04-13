# Use Python 3.6
FROM python:3.6

# Arguments
ARG APP_DIR=/opt/tigerpath

# Create a new folder
RUN mkdir "$APP_DIR"

# Set working directory
WORKDIR "$APP_DIR"

# Install dependencies
ADD requirements.txt "$APP_DIR"
RUN pip install -r "$APP_DIR/requirements.txt"

# Expose port (not used in Heroku)
EXPOSE "$PORT"

# Add all the files
ADD . "$APP_DIR"

# Collect static files and apply migrations
RUN python manage.py collectstatic --noinput
RUN python manage.py migrate --noinput

# Start server
CMD gunicorn config.wsgi:application \
    --bind 0.0.0.0:$PORT
