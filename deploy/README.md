# Deploying Beacon AI to a Hostinger VPS

Moving off Render onto a Hostinger KVM. MongoDB Atlas stays where it is — only
the app and Redis move.

```
deploy/
  setup-vps.sh        one-off provisioning (Node, Redis, Caddy, firewall)
  Caddyfile           TLS + SPA + /api + /socket.io on one hostname
  beacon-api.service  systemd unit
  deploy.sh           build, ship, flip symlink, verify, roll back on failure
  env.example         production env template
```

---

## Read this first

**`main` auto-deploys to Render.** Until you cut over, anything merged here goes
live on the existing Render deployment first. Changes written for this VPS setup
can therefore break production before it exists — a relative `/api` is correct
here and fatal on Render, where the frontend and backend are separate hosts.
`api.config.ts` maps split-host deployments explicitly for exactly that reason.

**Carry `JWT_SECRET` and `ENCRYPTION_KEY` over from Render unchanged.**

`utils/crypto.js` derives its AES key from `sha256(ENCRYPTION_KEY || JWT_SECRET)`.
Every stored mail password, Google/Microsoft refresh token and custom AI key in
Atlas is encrypted under it. Generate fresh values and `decryptSecret()` returns
`''` with **no error and nothing in the logs** — every user silently drops to the
Ethereal test transport and their inbox breaks.

Note the fallback: if you never set `ENCRYPTION_KEY` on Render, then
`JWT_SECRET` *is* the encryption key. Changing it is destructive, not just a
forced re-login.

**You need a domain you own.** Not optional:

- The Render frontend is HTTPS. A browser will not let an HTTPS page call an
  HTTP API, so the backend needs real TLS — and Let's Encrypt will not issue for
  a bare IP.
- Google OAuth verification requires you to prove ownership of every domain in
  *Authorized domains*. You cannot verify `onrender.com`.

---

## Architecture

One hostname serves everything, with Caddy splitting by path:

```
https://beacon.example.com/            → Angular build  (/opt/beacon/current/public)
https://beacon.example.com/api/*       → 127.0.0.1:5050
https://beacon.example.com/socket.io/* → 127.0.0.1:5050
```

Same origin means CORS never applies, there is one certificate, and
`api.config.ts` uses a relative `/api` — so changing domain needs no rebuild.

Releases are immutable directories with `current` symlinked at the live one:

```
/opt/beacon/releases/20260920-141500/{api,public}
/opt/beacon/current -> releases/20260920-141500
/opt/beacon/shared/.env          # never in a release, never in git
```

Rollback is a symlink flip plus a restart. Seconds, no rebuild, and no git
checkout on a box that is currently broken.

---

## Steps

**1. Domain.** Register it, then point an A record at the VPS IP. Wait for it to
resolve before starting Caddy, or the certificate request fails and backs off.

**2. Provision.**

```bash
scp deploy/setup-vps.sh root@YOUR_IP:/tmp/
ssh root@YOUR_IP 'bash /tmp/setup-vps.sh beacon.example.com'
```

This installs Node 22, Redis, Caddy, `ufw`, unattended security upgrades, caps
journald, and sets the clock to UTC. It prints a generated Redis password —
keep it.

Redis is configured deliberately, not with defaults:

- `appendonly yes` — batch progress (`sent`/`failed`/`cursor`) lives in Redis, so
  a restart must not lose it
- `maxmemory-policy noeviction` — **BullMQ requires this**; any eviction policy
  silently corrupts queue state
- `bind 127.0.0.1` + `requirepass` — never exposed

**3. Open the Hostinger firewall.** hPanel has its own firewall, separate from
`ufw`. Open 80 and 443 there too, or you will debug a phantom.

**4. Environment.**

```bash
scp deploy/env.example root@YOUR_IP:/opt/beacon/shared/.env
ssh root@YOUR_IP 'chown beacon:beacon /opt/beacon/shared/.env && chmod 600 /opt/beacon/shared/.env'
# then edit it — see the warning at the top of this file
```

**5. Caddy and systemd.**

```bash
scp deploy/Caddyfile          root@YOUR_IP:/etc/caddy/Caddyfile
scp deploy/beacon-api.service root@YOUR_IP:/etc/systemd/system/
ssh root@YOUR_IP '
  sed -i "s/beacon.example.com/beacon.example.com/" /etc/caddy/Caddyfile
  caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
  systemctl daemon-reload && systemctl enable beacon-api
'
```

**6. MongoDB Atlas.** Add the VPS IP under Network Access, or every query hangs.

**7. Google Console / Azure.** Update the redirect URIs to
`https://beacon.example.com/api/auth/{google,microsoft}/callback`. They must
match `GOOGLE_REDIRECT_URI` / `MICROSOFT_REDIRECT_URI` exactly — a trailing
slash mismatch is the classic failure.

**8. Deploy.**

```bash
./deploy/deploy.sh beacon.example.com
```

Builds locally (a 1-vCPU KVM is slow at `ng build` and tight on memory), ships
the release, installs production deps *inside it* before it goes live, flips the
symlink, restarts, health-checks, and rolls back automatically if the check
fails.

---

## Verify, in this order

Each step rules out a different failure, so don't skip ahead:

1. `curl https://beacon.example.com/health` → `{"success":true,...}`
2. Log in → JWT secret carried over correctly
3. **`/api/send/status` reports `mode` as `gmail-oauth` / `outlook` / `smtp`, not
   `ethereal`** → this is your proof the encryption key carried over. If it says
   `ethereal`, stop: secrets are not decrypting.
4. Send a campaign and watch Socket.IO progress → the queue, worker and
   WebSocket path all work
5. Open Analytics and switch ranges → the API is reachable under load

---

## Operating it

```bash
systemctl status beacon-api
journalctl -u beacon-api -f
systemctl restart beacon-api
```

**Before restarting**, check for an in-flight campaign. One process runs both the
API and the BullMQ worker (`server.js:20`), so a restart interrupts a send. It
resumes from the Redis cursor, but `deploy.sh` will warn you and ask.

**Rollback:**

```bash
ssh root@YOUR_IP 'ls -1dt /opt/beacon/releases/*/'
ssh root@YOUR_IP 'ln -sfn /opt/beacon/releases/<older> /opt/beacon/current && systemctl restart beacon-api'
```

---

## Known rough edges

- **The backend directory name contains a space** (`backend/beacon manager`).
  Every script here quotes it, but renaming it to `backend/api` would remove a
  standing source of breakage. Nothing outside the folder references the name.
- **Daily windows are UTC.** Both the daily send cap and the Analytics ranges use
  the server's UTC day, which is why `setup-vps.sh` sets the clock to UTC. If
  your day boundary matters, that needs a per-user timezone.
- **Attachments are buffered in memory** (multer `memoryStorage`, up to 8 × 15MB
  per request) before going into Mongo. `MemoryMax=1G` in the unit is sized for
  that; watch it on the smallest KVM.
- **No CI yet.** `deploy.sh` is run by hand. A GitHub Actions workflow doing the
  same over SSH is a small addition when you want it.
