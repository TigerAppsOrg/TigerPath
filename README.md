# TigerPath

TigerPath is a COS 333 project that helps Princeton University students plan out their four-year course schedules. It is currently in development by Richard Chu, Barak Nehoran, Adeniji Ogunlana, and Daniel Leung.

You can visit TigerPath at [http://tigerpath.io](http://tigerpath.io).

## Setup (with Docker)

1. `git clone` this repository.

2. Install the [Docker Community Edition](https://www.docker.com/community-edition).

3. You'll have to modify the environment variables in the `Dockerfile.dev` file in order to get your development environment set up properly. Specifically, you should replace `ENV DATABASE_URL postgres://username:password@localhost:port/name` with the proper database url for your Postgres server.

3. Use the following commands to build your project and then run it on a local server:
    ```
    ./build.sh                                                  # Build code changes
    ./run.sh                                                    # Run a local server at http://localhost:8000
    ```

## Setup (with pipenv)

1. `git clone` this repository. Install [Python 3.6](https://www.python.org) and [pipenv](https://docs.pipenv.org).

2. Using pipenv makes it easy to manage your dependencies. Use `pipenv install` to install all of the current dependencies from Pipfile.lock.

3. The settings for production are used by default. If you are making changes and testing locally, you should use development settings. You can start a server with development settings by running `python manage.py runserver --settings=config.settings.development`.

## Development

To run a command in a Docker container, do `docker exec -it [CONTAINER_NAME_OR_ID] [YOUR_COMMAND]`

#### Make migrations and update database

```
python manage.py makemigrations                             # Makes migrations based on models.py
python manage.py migrate                                    # Migrates the database
```

#### Custom django-admin commands

```
python manage.py tigerpath_get_courses                      # Scrapes for courses and puts them in the database
```

## Deployment

If you want to push your changes to the [Heroku development server](http://tigerpath333-dev.herokuapp.com), then run the following command:
```
heroku container:push web --remote heroku-dev               # Push to the Heroku development server
```

The command for pushing to the production server is analogous.
