#!/usr/bin/env bash
# Provision a fresh Hostinger KVM (Ubuntu 22.04/24.04) for Beacon AI.
# Idempotent — safe to re-run.
#
#   scp deploy/setup-vps.sh root@YOUR_IP:/tmp/
#   ssh root@YOUR_IP 'bash /tmp/setup-vps.sh beacon.example.com'
set -euo pipefail

DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
  echo "usage: setup-vps.sh <domain>   e.g. setup-vps.sh beacon.example.com" >&2
  exit 1
fi

APP_USER=beacon
APP_ROOT=/opt/beacon
say() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }

say "Base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl ca-certificates gnupg git rsync ufw debian-keyring debian-archive-keyring apt-transport-https

say "Node.js 22 LTS"
if ! command -v node >/dev/null || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -qq nodejs
fi
node -v

say "Redis"
apt-get install -y -qq redis-server
REDIS_PASS="$(openssl rand -hex 24)"
# Written as a drop-in rather than editing redis.conf, so a package upgrade
# cannot silently revert these.
cat >/etc/redis/redis.conf.d/beacon.conf <<EOF 2>/dev/null || mkdir -p /etc/redis/redis.conf.d && cat >/etc/redis/redis.conf.d/beacon.conf <<EOF
# Never reachable from outside this box.
bind 127.0.0.1 -::1
protected-mode yes
requirepass ${REDIS_PASS}

# BullMQ REQUIRES noeviction. Any eviction policy will silently corrupt queue
# state — a campaign can lose its cursor mid-send.
maxmemory-policy noeviction

# Batch progress (sent/failed/cursor) lives here, so a restart must not lose it.
appendonly yes
appendfsync everysec
EOF
grep -q 'redis.conf.d' /etc/redis/redis.conf || echo 'include /etc/redis/redis.conf.d/*.conf' >>/etc/redis/redis.conf
systemctl enable --now redis-server
systemctl restart redis-server

say "Caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' >/etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy
fi
mkdir -p /var/log/caddy && chown caddy:caddy /var/log/caddy

say "App user and directories"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_ROOT"/{releases,shared}
chown -R "$APP_USER:$APP_USER" "$APP_ROOT"
chmod 750 "$APP_ROOT/shared"

say "Firewall"
ufw allow 22/tcp  >/dev/null
ufw allow 80/tcp  >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null
ufw status | head -8

say "Unattended security updates"
apt-get install -y -qq unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

say "Journald size cap"
mkdir -p /etc/systemd/journald.conf.d
printf '[Journal]\nSystemMaxUse=500M\n' >/etc/systemd/journald.conf.d/beacon.conf
systemctl restart systemd-journald

say "UTC clock"
# Analytics windows and the daily send cap are both computed in UTC; keeping
# the box on UTC avoids a second timezone to reason about.
timedatectl set-timezone UTC

cat <<EOF

────────────────────────────────────────────────────────────────────────────
Provisioned. Remaining steps, in order:

1. DNS: point an A record for ${DOMAIN} at this server's IP, and wait for it
   to resolve. Caddy's certificate request will fail and back off otherwise.

2. Hostinger has its own firewall in hPanel, separate from ufw. Open 80 and
   443 there too, or you will debug a phantom.

3. Environment:
     cp deploy/env.example ${APP_ROOT}/shared/.env   # then edit
   Your Redis password (already applied above):
     ${REDIS_PASS}
   Set REDIS_URL=redis://:${REDIS_PASS}@127.0.0.1:6379
   And carry JWT_SECRET + ENCRYPTION_KEY over from Render UNCHANGED.

4. Caddy: copy deploy/Caddyfile to /etc/caddy/Caddyfile, replace
   beacon.example.com with ${DOMAIN}, then
     caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy

5. systemd: copy deploy/beacon-api.service to /etc/systemd/system/, then
     systemctl daemon-reload && systemctl enable beacon-api

6. MongoDB Atlas: add this server's IP under Network Access.

7. Google Console / Azure: update the redirect URIs to the new domain.

8. From your laptop: ./deploy/deploy.sh ${DOMAIN}
────────────────────────────────────────────────────────────────────────────
EOF
