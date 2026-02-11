# TigerPath

TigerPath is a web app that helps Princeton University students plan out their four-year course schedules. It began as a COS 333 project by Richard Chu, Barak Nehoran, Adeniji Ogunlana, and Daniel Leung.

You can visit TigerPath at [tigerpath.io](https://www.tigerpath.io).

To learn about contributing to TigerPath, take a look at the [contributing guidelines](https://github.com/PrincetonUSG/TigerPath/blob/master/CONTRIBUTING.md).

# Running locally

## Initial setup

### Python environment

1. Install `uv`: https://docs.astral.sh/uv/getting-started/installation/
2. Clone this repo and `cd` into the base TigerPath directory
3. Install Python 3.11 with `uv`: `uv python install 3.11`
4. Create a virtual environment: `uv venv --python 3.11`
5. Activate it: `source .venv/bin/activate`
6. Install dependencies: `uv pip sync requirements.txt`
   - This uses `psycopg2-binary` (wheel-backed on modern Python), so you should not need local PostgreSQL headers/tools for dependency install in normal dev setups.
7. Set all environment variables:
   - Login to Heroku and go to the Settings tab for the `tigerpath333-dev` app (do NOT use prod!)
   - Reveal Config Vars
   - Copy `.env-example` to `.env`, then add each Config Var key-value pair to `.env` (replace placeholders with real values)
   - Note that for `SECRET_KEY`, you might get an error so you can set its value to `1`
8. Export env vars into your shell before running Django:
   - `set -a; source .env; set +a`

### Frontend packages

1. Install Bun: https://bun.sh/docs/installation
2. Run `cd frontend && bun install` to install all required frontend packages

## Running the dev server

After following the initial setup steps above, you can run the local development server:

1. Activate your environment: `source .venv/bin/activate`
2. Export env vars: `set -a; source .env; set +a`
3. Run the backend server: `python manage.py runserver`
4. Run the frontend server in a separate terminal window: `cd frontend && bun run start`
   - Visit `http://localhost:8000/` to verify the server is up and running

# Other important things

#### Make migrations and update database

You can do this by running the following commands:

```
python manage.py makemigrations                             # Makes migrations based on models.py
python manage.py migrate                                    # Migrates the database
```

#### Custom django-admin commands

```
python manage.py tigerpath_get_courses                      # Scrapes courses and puts them in the database
```

#### Load static data

To load the major mappings fixture, which populates the major table in the database, run the following command:

```
python manage.py loaddata major_mappings
```
