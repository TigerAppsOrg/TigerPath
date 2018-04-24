# use ubuntu as base image
FROM ubuntu:17.10

# setup react
ARG APP_DIR=/opt/tigerpath
RUN mkdir "$APP_DIR"
RUN mkdir "$APP_DIR/frontend"

WORKDIR "$APP_DIR/frontend"
ADD frontend .

# install npm and react dependencies
RUN apt-get update; apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get install -y nodejs
RUN npm install

# Set working directory
WORKDIR "$APP_DIR"

# Install pip and python dependencies
ADD requirements.txt "$APP_DIR"
RUN apt-get install -y python3-pip
RUN pip3 install -r "$APP_DIR/requirements.txt"

# Expose ports (8000 for django, 3000 for react)
EXPOSE 8000 3000

# Add all the files
ADD . "$APP_DIR"

# Collect static files and apply migrations
RUN python3 manage.py collectstatic --noinput
