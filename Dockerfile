# ---------- base ----------
FROM python:3.11-slim AS base

ARG APP_DIR=/opt/tigerpath
RUN mkdir -p "$APP_DIR"
WORKDIR "$APP_DIR"

RUN pip install uv
COPY requirements.txt .
RUN uv pip install --system -r requirements.txt

COPY . .

# ---------- development ----------
FROM base AS development
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# ---------- frontend (dev server) ----------
FROM oven/bun:1.3.8 AS frontend
WORKDIR /opt/tigerpath/frontend
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY frontend .
EXPOSE 3000
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]

# ---------- frontend build assets ----------
FROM oven/bun:1.3.8 AS frontend-build
WORKDIR /opt/tigerpath/frontend
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY frontend .
RUN bun run build

# ---------- production ----------
FROM base AS production

# Copy prebuilt frontend assets from dedicated Bun stage
COPY --from=frontend-build /opt/tigerpath/assets/dist /opt/tigerpath/assets/dist

RUN python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["gunicorn", "config.wsgi:application", "-w", "2", "--bind", "0.0.0.0:8000", "--timeout", "600"]
