#!/bin/bash
# Package orlenbd, upload to VPS, extract, and run deploy.sh on the server.
#
# Prerequisites (local):  bash, tar, gzip, scp, ssh
# Prerequisites (server): REMOTE_PATH must exist and be writable by VPS_USER (you own the app dir; you do NOT need
#   permission to remove the directory from /var/www — we only clear files inside it). Example:
#   sudo mkdir -p /var/www/orlenbd && sudo chown -R admin93:admin93 /var/www/orlenbd
#   Node, npm, PM2; PostgreSQL + .env on server (not in tarball)
#
# Default SSH: admin93@38.47.35.16 (direct). For Cloudflare Access SSH instead:
#   CF_SSH=1 VPS_HOST=ssh.bfcpos.com ./deploy-to-vps.sh
#
# Usage:
#   ./deploy-to-vps.sh              # package → upload → remote deploy.sh
#   ./deploy-to-vps.sh --no-deploy  # package + upload + extract only (skip ./deploy.sh on server)
#
# Env overrides:
#   VPS_USER=admin93 VPS_HOST=38.47.35.16 REMOTE_PATH=/var/www/orlenbd PORT=5025 ./deploy-to-vps.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

VPS_USER="${VPS_USER:-admin93}"
VPS_HOST="${VPS_HOST:-38.47.35.16}"
REMOTE_PATH="${REMOTE_PATH:-/var/www/orlenbd}"
APP_PORT="${PORT:-5025}"
REMOTE="${VPS_USER}@${VPS_HOST}"

SSH_OPTS=()
SCP_OPTS=()
if [ -n "${CF_SSH:-}" ] || [ -n "${USE_CLOUDFLARE_SSH:-}" ]; then
  SSH_OPTS=(-o "ProxyCommand=cloudflared access ssh --hostname %h")
  SCP_OPTS=(-o "ProxyCommand=cloudflared access ssh --hostname %h")
  if [ "$VPS_HOST" = "38.47.35.16" ]; then
    VPS_HOST="${CF_SSH_HOST:-ssh.bfcpos.com}"
    REMOTE="${VPS_USER}@${VPS_HOST}"
  fi
  echo "Using Cloudflare Access SSH → $REMOTE"
fi

NO_DEPLOY=false
for arg in "$@"; do
  if [ "$arg" = "--no-deploy" ]; then
    NO_DEPLOY=true
  fi
done

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TAR_NAME="orlenbd-deploy-${TIMESTAMP}.tar.gz"
LOCAL_TAR="${TMPDIR:-/tmp}/${TAR_NAME}"
REMOTE_TAR="/tmp/${TAR_NAME}"
PARENT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR_NAME="$(basename "$SCRIPT_DIR")"

if [ "$APP_DIR_NAME" != "orlenbd" ]; then
  echo "Warning: folder is named '$APP_DIR_NAME' (expected 'orlenbd'). Tar will use this name; set REMOTE_PATH accordingly."
fi

echo "=== orlenbd deploy-to-vps ==="
echo "  Pack from:  $PARENT_DIR/$APP_DIR_NAME"
echo "  Upload to:  $REMOTE:$REMOTE_TAR"
echo "  Install to: $REMOTE_PATH (on server)"
echo "  Port:       $APP_PORT"
echo ""

# --- 1. Package (tar.gz from parent so archive contains single top-level folder) ---
# Include .git so the server can run git pull against GitLab (credentials/remote URL must be valid on VPS).
echo "[1/3] Creating package $TAR_NAME"
tar -czf "$LOCAL_TAR" \
  --exclude="${APP_DIR_NAME}/node_modules" \
  --exclude="${APP_DIR_NAME}/dist" \
  --exclude="${APP_DIR_NAME}/backups" \
  --exclude="${APP_DIR_NAME}/uploads" \
  --exclude="${APP_DIR_NAME}/.env" \
  --exclude="${APP_DIR_NAME}/*.log" \
  --exclude="${APP_DIR_NAME}/.DS_Store" \
  -C "$PARENT_DIR" \
  "$APP_DIR_NAME"

echo "  Size: $(du -h "$LOCAL_TAR" | cut -f1)"

# --- 2. Upload ---
echo "[2/3] Uploading via scp..."
scp "${SCP_OPTS[@]}" "$LOCAL_TAR" "${REMOTE}:${REMOTE_TAR}"
rm -f "$LOCAL_TAR"
echo "  Uploaded: $REMOTE_TAR"

# --- 3. Extract + deploy on server ---
echo "[3/3] Extract on server and run deploy..."
export _OB_REMOTE_PATH="$REMOTE_PATH"
export _OB_REMOTE_TAR="$REMOTE_TAR"
export _OB_APP_PORT="$APP_PORT"
export _OB_NO_DEPLOY="$NO_DEPLOY"
trap 'unset _OB_REMOTE_PATH _OB_REMOTE_TAR _OB_APP_PORT _OB_NO_DEPLOY 2>/dev/null || true' EXIT

ssh "${SSH_OPTS[@]}" "$REMOTE" \
  REMOTE_PATH="$_OB_REMOTE_PATH" \
  REMOTE_TAR="$_OB_REMOTE_TAR" \
  APP_PORT="$_OB_APP_PORT" \
  NO_DEPLOY="$_OB_NO_DEPLOY" \
  bash -s <<'ENDSSH'
set -e
PARENT_OF_APP="$(dirname "$REMOTE_PATH")"

mkdir -p "${PARENT_OF_APP}"
if [ ! -d "${REMOTE_PATH}" ]; then
  mkdir -p "${REMOTE_PATH}" || {
    echo "ERROR: cannot create ${REMOTE_PATH}"
    u="$(whoami)"
    echo "  On server run: sudo mkdir -p ${REMOTE_PATH} && sudo chown -R ${u}:${u} ${REMOTE_PATH}"
    exit 1
  }
fi
if [ ! -w "${REMOTE_PATH}" ]; then
  u="$(whoami)"
  echo "ERROR: ${REMOTE_PATH} is not writable by ${u}."
  echo "  On server run: sudo chown -R ${u}:${u} ${REMOTE_PATH}"
  exit 1
fi

# Do not rm -rf REMOTE_PATH: removing the directory requires write+exec on the parent (e.g. /var/www), often root-only.
# Clearing contents inside the app dir works when you own that directory.
echo "  (clearing app dir, keeping .env if present)"
find "${REMOTE_PATH}" -mindepth 1 -maxdepth 1 ! -name '.env' -exec rm -rf {} +

tar -xzf "${REMOTE_TAR}" -C "${PARENT_OF_APP}"
rm -f "${REMOTE_TAR}"

chmod +x "${REMOTE_PATH}/deploy.sh" 2>/dev/null || true
chmod +x "${REMOTE_PATH}/deploy-to-vps.sh" 2>/dev/null || true

cd "${REMOTE_PATH}"
if [ "$NO_DEPLOY" = "true" ]; then
  echo "  --no-deploy: skipping ./deploy.sh (extract only)"
  exit 0
fi
export PORT="$APP_PORT"
./deploy.sh
ENDSSH

echo ""
echo "=== deploy-to-vps finished ==="
echo "  Site: https://orlenbd.com (if tunnel + DNS are configured)"
