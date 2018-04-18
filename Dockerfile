# Use Node
FROM node:8.11

ARG APP_DIR=/opt/tigerpath
ADD frontend "$APP_DIR"
WORKDIR "$APP_DIR/frontend"

RUN npm install
ADD . "$APP_DIR"


# Use Python
FROM python:3.6

# Arguments
ARG APP_DIR=/opt/tigerpath

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
