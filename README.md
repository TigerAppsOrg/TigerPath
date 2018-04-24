# TigerPath

TigerPath is a COS 333 project that helps Princeton University students plan out their four-year course schedules. It is currently in development by Richard Chu, Barak Nehoran, Adeniji Ogunlana, and Daniel Leung.

You can visit TigerPath at [http://tigerpath.io](http://tigerpath.io).

## Setup (with Docker)

1. `git clone` this repository.

2. Install the [Docker Community Edition](https://www.docker.com/community-edition). Make sure you also have [Docker Compose](https://docs.docker.com/compose/install) installed (should be automatically installed on Windows and Mac).

3. Rename the `.env-example` file to `.env` and set your environment variables. Specifically, you should replace `DATABASE_URL=postgres://username:password@localhost:port/name` with the proper database url for your Postgres server.

3. Use the following commands to build your project and run it on a local server:
    ```
    docker-compose build                                        # Build code changes
    docker-compose up                                           # Run a local server at http://localhost:8000
    docker-compose down                                         # Stop the server
    ```

## Setup (with pipenv)

1. `git clone` this repository. Install [Python 3.6](https://www.python.org) and [pipenv](https://docs.pipenv.org) (which helps you manage your dependencies).

2. Use `pipenv install` to install all of the current dependencies from Pipfile.lock.

3. Navigate to the folder "frontend" and run `npm install` to install the necessary node modules for React to work.

4. The settings for production are used by default. If you are making changes and testing locally, you should use development settings. You can start a server with development settings by running `python manage.py runserver --settings=config.settings.development`. For development, run the webpack server (React) along with the Django server by calling `npm start` in the folder "frontend".

5. If running with production settings, navigate to the folder "frontend" and run `npm run build` to create bundles of the webpack (React) server (Running the webpack (React) server will no longer be necessary). Then run `python manage.py runserver --settings=config.settings.production`

## Development

To run a command in a Docker container, do `docker exec -it [CONTAINER_NAME_OR_ID] [YOUR_COMMAND]`

#### Make migrations and update database

If you're using Docker, then once you make the migration files, you should copy them from the container to the host (your local computer) by running `docker cp <containerId>:/file/path/within/container /host/path/target`. You should then push the migration files to Git.

```
python manage.py makemigrations                             # Makes migrations based on models.py
python manage.py migrate                                    # Migrates the database
```

#### Custom django-admin commands

```
python manage.py tigerpath_get_courses                      # Scrapes courses and puts them in the database
```

## Deployment

You shouldn't need to deploy manually, as deploys are set up to happen automatically based on the code in GitHub. The development server tracks the `dev` branch, and the production server tracks the `master` branch.

However, if you do need to push your changes manually, then run the following command:
```
git push heroku <local_branch_name>:master                    # Push to the Heroku server
```
