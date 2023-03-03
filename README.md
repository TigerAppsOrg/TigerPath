# TigerPath

TigerPath is a web app that helps Princeton University students plan out their four-year course schedules. It began as a COS 333 project by Richard Chu, Barak Nehoran, Adeniji Ogunlana, and Daniel Leung.

You can visit TigerPath at [tigerpath.io](https://www.tigerpath.io).

To learn about contributing to TigerPath, take a look at the [contributing guidelines](https://github.com/PrincetonUSG/TigerPath/blob/master/CONTRIBUTING.md).

<!-- ## Setup

1. `git clone` this repository. Install [Python 3.6](https://www.python.org), [node.js](https://nodejs.org/en/), and [pipenv](https://github.com/pypa/pipenv) (which helps you manage your dependencies).

2. Run `cd tigerpath && pipenv install` to install all of the current dependencies from Pipfile.lock.

3. Run `cd frontend && npm install` to install the necessary node modules for React to work.

4. Run `cd .. && cp .env-example .env`. Then, set the environment variables in your `.env` file; specifically, you should replace the value of `DATABASE_URL` with the proper database URL for your Postgres server. You should also fill in the `TIGERBOOK_USERNAME` and `TIGERBOOK_API_KEY` fields if you want the prepopulation of the user's year and major in the onboarding flow to work (you can get a TigerBook API key by following the instructions [here](https://github.com/alibresco/tigerbook-api)).

5. You can start a server with the environment variables in the file `.env` by running `pipenv run python manage.py runserver`. For development, run the webpack server (React) along with the Django server by calling `npm start` in the folder "frontend". Then you can navigate to `http://localhost:8000/` to see the app. -->

# Running locally

## Initial setup

### Python environment

1. Create a new conda environment: `conda create -n tigerpath`
1. Activate the conda environment: `conda activate tigerpath`
1. Install python: `conda install python=3.9`
1. Clone this repo and `cd` into the base TigerPath directory
1. Install dependencies: `pip install -r requirements.txt`
   - If you're running into a `psycopg2` error (`pg_config executable not found`), you probably have to install `postgresql`: https://stackoverflow.com/a/24645416
1. Run `conda list` to validate that all packages in `requirements.txt` were installed
1. Set all environment variables:
   - Login to Heroku and go to the Settings tab for the `tigerpath333-dev` app (do NOT use prod!)
   - Reveal Config Vars
   - For each Config Var key-value pair, create a local environment variable: `conda env config vars set key=value` (replace `key` and `value` with the actual key and value)
   - After setting all env vars, reactivate your conda environment: `conda activate tigerpath`
   - Note that for `SECRET_KEY`, you might get an error so you can set its value to `1`
1. Run `conda env config vars list` to validate all env vars were set

### Node packages

1. Run `cd frontend && npm install` to install all required frontend packages

## Running the dev server

After following the initial setup steps above, you can run the local development server:

1. Activate your environment: `conda activate tigerpath`
1. Run the backend server: `python manage.py runserver`
1. Run the frontend server in a separate terminal window: `cd frontend && npm start`
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
