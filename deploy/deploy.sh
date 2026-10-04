#!/usr/bin/env bash
# Build locally, ship a new release, flip the symlink, restart.
#
#   ./deploy/deploy.sh beacon.example.com [ssh-host]
#
# Releases are immutable directories with `current` symlinked at the live one,
# so a rollback is a symlink flip and a restart — seconds, no rebuild, and no
# git checkout on a box that is currently broken.
set -euo pipefail

DOMAIN="${1:-}"
SSH_HOST="${2:-root@${DOMAIN}}"
[[ -z "$DOMAIN" ]] && { echo "usage: deploy.sh <domain> [ssh-host]" >&2; exit 1; }

APP_ROOT=/opt/beacon
RELEASE="$(date -u +%Y%m%d-%H%M%S)"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$REPO_ROOT/backend/beacon-manager"
say() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }

# --- 0. Refuse to deploy over a running campaign ----------------------------
# One process runs the API and the BullMQ worker, so a restart interrupts a
# send. It resumes from the Redis cursor, but better to know first.
say "Checking for an in-flight campaign"
ACTIVE=$(ssh "$SSH_HOST" "redis-cli -a \$(grep -oP '(?<=redis://:)[^@]+' ${APP_ROOT}/shared/.env) --no-auth-warning --scan --pattern 'send:batch:*' 2>/dev/null | head -5" || true)
if [[ -n "$ACTIVE" ]]; then
  echo "Batches present in Redis:"; echo "$ACTIVE"
  read -rp "A restart interrupts an in-flight send (it resumes from its cursor). Continue? [y/N] " ok
  [[ "$ok" == "y" ]] || exit 1
fi

# --- 1. Build the frontend locally ------------------------------------------
# Built here rather than on the VPS: a 1-vCPU KVM is slow at this and memory
# tight against the 1MB initial-bundle budget.
say "Building frontend"
( cd "$REPO_ROOT/frontend" && npm ci --no-audit --no-fund && npx ng build )

DIST="$REPO_ROOT/frontend/dist/frontend/browser"
[[ -d "$DIST" ]] || { echo "build output missing at $DIST" >&2; exit 1; }

# --- 2. Ship ----------------------------------------------------------------
say "Shipping release $RELEASE"
ssh "$SSH_HOST" "mkdir -p ${APP_ROOT}/releases/${RELEASE}/{api,public}"

rsync -az --delete "$DIST/" "$SSH_HOST:${APP_ROOT}/releases/${RELEASE}/public/"
rsync -az --delete \
  --exclude node_modules --exclude .env --exclude '*.log' \
  "$API_DIR/" "$SSH_HOST:${APP_ROOT}/releases/${RELEASE}/api/"

# --- 3. Install deps INSIDE the new release, before it goes live -------------
# If this fails, `current` still points at the last good release.
say "Installing production dependencies"
ssh "$SSH_HOST" "cd ${APP_ROOT}/releases/${RELEASE}/api && npm ci --omit=dev --no-audit --no-fund"

# --- 4. Go live --------------------------------------------------------------
say "Flipping symlink and restarting"
PREVIOUS=$(ssh "$SSH_HOST" "readlink -f ${APP_ROOT}/current 2>/dev/null || true")
ssh "$SSH_HOST" "
  chown -R beacon:beacon ${APP_ROOT}/releases/${RELEASE}
  ln -sfn ${APP_ROOT}/releases/${RELEASE} ${APP_ROOT}/current
  systemctl restart beacon-api
"

# --- 5. Verify, and roll back if it did not come up --------------------------
say "Health check"
sleep 4
CODE=$(curl -s -o /dev/null -w '%{http_code}' "https://${DOMAIN}/api/../health" || true)
[[ "$CODE" == "200" ]] || CODE=$(curl -s -o /dev/null -w '%{http_code}' "https://${DOMAIN}/health" || true)

if [[ "$CODE" != "200" ]]; then
  echo "Health check failed (HTTP ${CODE:-none})."
  if [[ -n "$PREVIOUS" && "$PREVIOUS" != *"$RELEASE"* ]]; then
    echo "Rolling back to $PREVIOUS"
    ssh "$SSH_HOST" "ln -sfn ${PREVIOUS} ${APP_ROOT}/current && systemctl restart beacon-api"
  fi
  ssh "$SSH_HOST" "journalctl -u beacon-api -n 40 --no-pager"
  exit 1
fi

# --- 6. Keep the last 5 releases --------------------------------------------
ssh "$SSH_HOST" "cd ${APP_ROOT}/releases && ls -1dt */ | tail -n +6 | xargs -r rm -rf"

say "Deployed $RELEASE to https://${DOMAIN}"
echo "Rollback:  ssh $SSH_HOST 'ln -sfn ${APP_ROOT}/releases/<older> ${APP_ROOT}/current && systemctl restart beacon-api'"
