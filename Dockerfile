# Use Node
FROM node:8.11 AS reactapp

ARG APP_DIR=/opt/tigerpath
RUN mkdir "$APP_DIR"
RUN mkdir "$APP_DIR/frontend"

WORKDIR "$APP_DIR/frontend"
ADD frontend .

RUN npm install
RUN npm run build

WORKDIR "$APP_DIR"
ADD . "$APP_DIR"


# Use Python
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
COPY --from=reactapp "$APP_DIR" .
ADD . "$APP_DIR"

# Collect static files and apply migrations
RUN python manage.py collectstatic --noinput
RUN python manage.py migrate --noinput

# Start server
CMD gunicorn config.wsgi:application \
    --bind 0.0.0.0:$PORT
