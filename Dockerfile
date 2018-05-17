# Use Python
FROM python:3.6

# Arguments
ARG APP_DIR=/opt/tigerpath

# Create a new folder
RUN mkdir "$APP_DIR"

# Set working directory
WORKDIR "$APP_DIR"

# Install pipenv and python dependencies
RUN pip install pipenv
ADD Pipfile "$APP_DIR"
ADD Pipfile.lock "$APP_DIR"
RUN pipenv install

# Generate webpack stats file
RUN echo '{"status":"done","publicPath":"http://localhost:3000/","chunks":{"main":[{"name":"static/js/bundle.js","publicPath":"http://localhost:3000/static/js/bundle.js","path":"/opt/tigerpath/frontend/static/js/bundle.js"},{"name":"static/js/bundle.js.map","publicPath":"http://localhost:3000/static/js/bundle.js.map","path":"/opt/tigerpath/frontend/static/js/bundle.js.map"}]}}' > webpack-stats.dev.json

# Expose ports
EXPOSE 8000

# Add all the files
ADD . "$APP_DIR"

# Collect static files and apply migrations
RUN pipenv run python manage.py collectstatic --noinput
