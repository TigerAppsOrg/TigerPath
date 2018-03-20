# TigerPath

TigerPath is a COS 333 project that helps Princeton University students manage and plan out their four-year course schedules. It is currently in development by Richard Chu, Barak Nehoran, Adeniji Ogunlana, and Daniel Leung.

## Setup
1. Install [Python 3.6](https://www.python.org) and [pipenv](https://docs.pipenv.org).

2. You should use pipenv to manage your dependencies. Use `pipenv sync` to install all of the current dependencies from Pipfile.lock.

3. The settings for production are used by default. If you are making changes and testing locally, you should use development settings. You can start a server with development settings by running `python manage.py runserver --settings=config.settings.development`.
