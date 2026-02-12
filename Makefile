.PHONY: setup dev dev-backend dev-frontend test lint format migrate makemigrations shell dbshell reset-db deps-up seed-majors seed-courses seed-data build check-osv-scanner scan-python scan-frontend scan osv-scan-python osv-scan-frontend osv-scan help

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Install all dependencies and run migrations
	uv pip install -r requirements.txt
	cd frontend && bun install
	python manage.py migrate

dev: ## Run backend and frontend dev servers in parallel
	@echo "Starting Django (:8000) + Vite (:3000) — open http://localhost:8000"
	$(MAKE) -j2 dev-backend dev-frontend

dev-backend: ## Run Django dev server
	python manage.py runserver

dev-frontend: ## Run Vite dev server
	cd frontend && bun run dev

test: ## Run Python and JS tests
	python -m pytest
	cd frontend && bun run test

lint: ## Lint Python and JS code
	ruff check .
	cd frontend && bun run lint

format: ## Format Python and JS code
	ruff format .
	ruff check --fix .
	cd frontend && bun run format

migrate: ## Run Django migrations
	python manage.py migrate

makemigrations: ## Create new Django migrations
	python manage.py makemigrations

shell: ## Open Django shell
	python manage.py shell

dbshell: ## Open database shell
	python manage.py dbshell

reset-db: ## Reset the database (WARNING: destroys all data)
	python manage.py flush --no-input
	python manage.py migrate

deps-up: ## Start local Postgres + Redis in Docker
	docker compose up -d db redis

seed-majors: ## Load major mappings fixture into database
	python manage.py loaddata major_mappings

seed-courses: ## Scrape and import course data (requires CONSUMER_KEY + CONSUMER_SECRET)
	python manage.py tigerpath_get_courses

seed-data: ## Seed majors and courses (requires DB, network, and scraper credentials)
	$(MAKE) seed-majors
	$(MAKE) seed-courses

build: ## Build frontend for production
	cd frontend && bun run build

check-osv-scanner: ## Verify osv-scanner is installed
	@command -v osv-scanner >/dev/null 2>&1 || (echo "osv-scanner not found. Install it from https://google.github.io/osv-scanner/"; exit 1)

scan-python: ## Scan Python dependencies with OSV Scanner
	@$(MAKE) check-osv-scanner
	osv-scanner scan source -L requirements.txt

scan-frontend: ## Scan frontend npm dependencies with OSV Scanner
	@$(MAKE) check-osv-scanner
	osv-scanner scan source -L frontend/package-lock.json

scan: ## Scan Python + frontend dependencies with OSV Scanner
	@$(MAKE) check-osv-scanner
	osv-scanner scan source -L requirements.txt -L frontend/package-lock.json

osv-scan-python: scan-python ## Alias for scan-python

osv-scan-frontend: scan-frontend ## Alias for scan-frontend

osv-scan: scan ## Alias for scan

.DEFAULT_GOAL := help
