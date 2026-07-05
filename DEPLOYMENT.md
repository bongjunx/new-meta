# NEW META Deployment Runbook

This document is the canonical push/deploy procedure for NEW META.

Production:

- App URL: https://coe-games.duckdns.org
- Health check: https://coe-games.duckdns.org/api/health
- Server: `ec2-user@43.203.166.25`
- Production path: `/home/ec2-user/new-meta`
- Docker services: `new-meta-frontend`, `new-meta-backend`, `new-meta-postgres`
- Database container: `new-meta-postgres`
- Database name/user: `newmeta` / `newmeta`

Do not commit private keys, `.env` files, database dumps, or production secrets.

## Local Push

Run these from the local repository root:

```powershell
cd C:\Users\USER\Documents\repo\new-meta
git status --short --branch
git pull --rebase origin main
```

If there are code changes:

```powershell
node --check server/index.js
git add <changed-files>
git commit -m "Describe the change"
git push origin main
```

For frontend-only changes, there is no build step in this repo before commit. The frontend image copies static files into nginx during deployment.

## Production Deploy

The current workstation uses an operator-provided SSH key at:

```powershell
$KeyPath = "C:\Users\USER\Downloads\coe-seoul-20260524.pem"
```

If the key is elsewhere, set `$KeyPath` to the correct private key path. Never copy the key into the repository.

Deploy the latest `origin/main`:

```powershell
$KeyPath = "C:\Users\USER\Downloads\coe-seoul-20260524.pem"
$HostName = "ec2-user@43.203.166.25"

$DeployScript = @'
set -e
cd /home/ec2-user/new-meta
git status --short --branch
git pull --ff-only origin main
sudo docker compose build backend frontend
sudo docker compose up -d backend frontend
sudo docker compose ps
curl -fsS https://coe-games.duckdns.org/api/health
'@

$DeployScript | ssh -i $KeyPath -o StrictHostKeyChecking=no $HostName "bash -s"
```

Expected health output:

```json
{"status":"ok","game":"NEW META"}
```

## When To Rebuild

- Backend code or `package.json` changed: rebuild `backend`.
- Frontend static files, `admin/`, `css/`, `js/`, `assets/`, `index.html`, or `nginx.conf` changed: rebuild `frontend`.
- `docker-compose.yml` changed: run `sudo docker compose up -d` after reviewing service/volume changes.
- PostgreSQL data is stored in the named Docker volume `new_meta_postgres_data`. Do not run `docker compose down -v` in production.

## Database Access

Read-only inspection example:

```powershell
$KeyPath = "C:\Users\USER\Downloads\coe-seoul-20260524.pem"
$HostName = "ec2-user@43.203.166.25"

@'
SELECT username, status, last_seen_at
FROM users
ORDER BY last_seen_at DESC NULLS LAST
LIMIT 20;
'@ | ssh -i $KeyPath -o StrictHostKeyChecking=no $HostName "sudo docker exec -i new-meta-postgres psql -U newmeta -d newmeta"
```

Schema creation and additive migrations currently run from `server/index.js` during backend startup. Review that file before adding destructive schema changes.

## Verification Checklist

After deploy:

```powershell
curl.exe -fsS https://coe-games.duckdns.org/api/health
```

Also verify:

- https://coe-games.duckdns.org loads.
- Login/register still works.
- `/admin` works for the `admin` user only.
- `sudo docker compose ps` shows backend, frontend, and postgres as `Up`.

## Logs

```powershell
$KeyPath = "C:\Users\USER\Downloads\coe-seoul-20260524.pem"
$HostName = "ec2-user@43.203.166.25"

ssh -i $KeyPath -o StrictHostKeyChecking=no $HostName "cd /home/ec2-user/new-meta && sudo docker compose logs --tail=100 backend"
ssh -i $KeyPath -o StrictHostKeyChecking=no $HostName "cd /home/ec2-user/new-meta && sudo docker compose logs --tail=100 frontend"
```

## Rollback

Preferred rollback is to deploy a known good Git commit:

```powershell
$KeyPath = "C:\Users\USER\Downloads\coe-seoul-20260524.pem"
$HostName = "ec2-user@43.203.166.25"
$Commit = "<known-good-commit-sha>"

ssh -i $KeyPath -o StrictHostKeyChecking=no $HostName "cd /home/ec2-user/new-meta && git fetch origin && git checkout $Commit && sudo docker compose build backend frontend && sudo docker compose up -d backend frontend && curl -fsS https://coe-games.duckdns.org/api/health"
```

After rollback, restore `main` when ready:

```powershell
ssh -i $KeyPath -o StrictHostKeyChecking=no $HostName "cd /home/ec2-user/new-meta && git checkout main && git pull --ff-only origin main"
```

Do not use `git reset --hard`, remove Docker volumes, or overwrite production files unless the operator explicitly asks for that recovery action.
