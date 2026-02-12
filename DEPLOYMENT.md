# Deployment (EC2 + Nginx + Docker + RDS)

This guide deploys TigerPath with:
- Django/Gunicorn in Docker (`web`)
- Redis in Docker on the EC2 host (`redis`)
- PostgreSQL on external/shared RDS via `DATABASE_URL`
- Nginx on EC2 as reverse proxy + TLS termination

## 1. Provision EC2

- Ubuntu 22.04/24.04 recommended
- Security Group:
  - `22/tcp` from your IP (or secure admin source)
  - `80/tcp` from `0.0.0.0/0`
  - `443/tcp` from `0.0.0.0/0`
- Ensure EC2 can reach your RDS endpoint on `5432`

## 2. Install Docker + Compose Plugin + Nginx

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg nginx

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin git

sudo usermod -aG docker $USER
newgrp docker
```

## 3. Clone App on EC2

Use a stable path (used by CD workflow later):

```bash
mkdir -p ~/apps
cd ~/apps
git clone https://github.com/TigerAppsOrg/TigerPath.git tigerpath
cd tigerpath
```

## 4. Create Production Env File

```bash
cp .env.production.example .env
```

Edit `.env` with real values:
- `SECRET_KEY`
- `ALLOWED_HOSTS`
- `CSRF_TRUSTED_ORIGINS`
- `DATABASE_URL` (RDS URL)
- optional Redis/cache tuning variables

Notes:
- `DATABASE_URL` must point to your shared RDS instance.
- Redis is local containerized service (`redis://redis:6379/1`) from `docker-compose.prod.yml`.

## 5. Start Production Containers

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -T web python manage.py migrate
docker compose -f docker-compose.prod.yml ps
```

App listens on `127.0.0.1:8000` on host (intentionally not public).

## 6. Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/tigerpath`:

```nginx
server {
    listen 80;
    server_name path.tigerapps.org;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/tigerpath /etc/nginx/sites-enabled/tigerpath
sudo nginx -t
sudo systemctl reload nginx
```

## 7. Configure DNS in Cloudflare (`path.tigerapps.org`)

In Cloudflare (zone: `tigerapps.org`), create the DNS record:

- `A` record: `path` -> `<EC2_PUBLIC_IP>`

Recommended Cloudflare settings:

- Start with `Proxy status = DNS only` during initial certificate setup
- After HTTPS is working, switch to `Proxied` if you want Cloudflare proxy/CDN/WAF
- In **SSL/TLS**, use `Full` during setup, then `Full (strict)` after Let’s Encrypt is installed

## 8. Enable HTTPS (Let’s Encrypt)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d path.tigerapps.org
```

Test renewal:

```bash
sudo certbot renew --dry-run
```

## 9. Operational Commands

```bash
# update app code
git pull --ff-only origin master

# rebuild/restart app
docker compose -f docker-compose.prod.yml up -d --build

# run migrations
docker compose -f docker-compose.prod.yml exec -T web python manage.py migrate

# logs
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml logs -f redis
```

## 10. GitHub Actions CI/CD

Two workflows are included:
- `.github/workflows/ci.yml` (test/build on PRs + pushes)
- `.github/workflows/cd-ec2.yml` (deploy to EC2 after CI succeeds on `main`, or manual run)

### Required GitHub Repository Secrets

- `EC2_HOST` (public DNS or IP)
- `EC2_USER` (SSH user, e.g. `ubuntu`)
- `EC2_SSH_PRIVATE_KEY` (private key matching the instance authorized key)
- `EC2_DEPLOY_PATH` (absolute path to repo on EC2, e.g. `/home/ubuntu/apps/tigerpath`)

Optional:
- `EC2_PORT` (defaults to `22`)

### Required EC2-side setup for CD

- Repo already cloned at `EC2_DEPLOY_PATH`
- `.env` already created/configured on EC2
- User can run Docker (`docker` group)

CD workflow executes on EC2:
1. `git fetch/pull` latest `main`
2. `docker compose -f docker-compose.prod.yml up -d --build redis web`
3. `python manage.py migrate` inside `web`
4. basic health output via `docker compose ps`

## 11. Architecture Recap

- Postgres: external RDS (`DATABASE_URL` in `.env`)
- Redis: local Docker container on EC2 (`redis` service)
- Django app: Docker `web`, proxied by Nginx
