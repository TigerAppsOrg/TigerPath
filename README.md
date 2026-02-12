# TigerPath

TigerPath is a web app that helps Princeton University students plan out their four-year course schedules. It began as a COS 333 project by Richard Chu, Barak Nehoran, Adeniji Ogunlana, and Daniel Leung.

You can visit TigerPath at [tigerpath.io](https://www.tigerpath.io).

To learn about contributing to TigerPath, take a look at the [contributing guidelines](https://github.com/PrincetonUSG/TigerPath/blob/master/CONTRIBUTING.md).

# Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) (Python package manager)
- [Bun](https://bun.sh/docs/installation) (JavaScript runtime)
- [Docker](https://docs.docker.com/get-docker/) (for PostgreSQL — or use a local Postgres install)

# Quick start

```bash
git clone https://github.com/TigerAppsOrg/TigerPath && cd TigerPath
uv python install 3.11
uv venv --python 3.11
source .venv/bin/activate
cp .env.example .env              # defaults work out of the box
docker compose up -d db            # start Postgres
make setup                         # install deps + run migrations
make dev                           # start Django (:8000) + Vite asset server (:3000)
```

Open http://localhost:8000/ in your browser. (Port 3000 is the Vite asset server — you don't open it directly.)

# Setup details

### Python environment

1. Install Python 3.11: `uv python install 3.11`
2. Create and activate a virtual environment:
   ```bash
   uv venv --python 3.11
   source .venv/bin/activate
   ```
3. Install dependencies: `uv pip install -r requirements.txt`

### Frontend packages

```bash
cd frontend && bun install
```

### Environment variables

Copy the example env file — the defaults connect to the Docker Compose Postgres and enable Vite dev mode:

```bash
cp .env.example .env
```

The `.env` file is auto-loaded by `manage.py`, so you don't need to source it manually.

### Database

Start Postgres and Redis via Docker Compose:

```bash
make deps-up
```

Then run migrations:

```bash
make migrate
```

To populate majors and courses in one step:

```bash
make seed-data
```

Note: `make seed-courses` / `make seed-data` require Princeton MobileApp API credentials in `.env`:
`CONSUMER_KEY` and `CONSUMER_SECRET`.
If Princeton changes API paths, you can also set `MOBILEAPP_BASE_URL`.

Or run them separately:

```bash
make seed-majors
make seed-courses
```

# Development

### Running the dev servers

```bash
make dev    # runs Django (:8000) and Vite (:3000) in parallel
```

Or run them separately:

```bash
make dev-backend     # Django on :8000
make dev-frontend    # Vite on :3000
```

### Testing, linting, formatting

```bash
make test      # run Python and JS tests
make lint      # ruff (Python) + eslint (JS)
make format    # auto-format Python and JS
```

### Database commands

```bash
make migrate           # run migrations
make makemigrations    # create new migrations
make dbshell           # open psql shell
make reset-db          # flush all data and re-migrate
make deps-up           # start local Postgres + Redis in Docker
make seed-data         # load majors + scrape/import courses
```

### Scraping courses

```bash
make seed-courses
```

This command requires:
- `CONSUMER_KEY`
- `CONSUMER_SECRET`
- (optional) `MOBILEAPP_BASE_URL` override when OIT changes endpoint versions

### All Makefile targets

Run `make help` to see every available command.
