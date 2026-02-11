.PHONY: setup dev dev-backend dev-frontend test lint format migrate makemigrations shell dbshell reset-db build help

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

build: ## Build frontend for production
	cd frontend && bun run build

.DEFAULT_GOAL := help
