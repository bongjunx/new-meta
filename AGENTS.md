# Agent Instructions

Use `DEPLOYMENT.md` as the source of truth for push and production deployment.

When asked to push or deploy:

1. Check the local working tree with `git status --short --branch`.
2. Do not overwrite unrelated user changes.
3. Run a basic backend syntax check with `node --check server/index.js` when backend code changed.
4. Commit only the intended files.
5. Push `main` to `origin`.
6. SSH to production and deploy from `/home/ec2-user/new-meta` using `git pull --ff-only origin main`, `sudo docker compose build backend frontend`, and `sudo docker compose up -d backend frontend`.
7. Verify `https://coe-games.duckdns.org/api/health`.

Production facts:

- Host: `ec2-user@43.203.166.25`
- Local key path on the current workstation: `C:\Users\USER\Downloads\coe-seoul-20260524.pem`
- Production repo path: `/home/ec2-user/new-meta`
- Public URL: `https://coe-games.duckdns.org`
- Health URL: `https://coe-games.duckdns.org/api/health`
- Database container: `new-meta-postgres`

Safety rules:

- Never commit private keys, `.env`, dumps, or secrets.
- Never run `docker compose down -v` on production.
- Never use `git reset --hard` or delete files on production unless the operator explicitly asks for recovery.
- If production has uncommitted changes, stop and report them before deploying.
