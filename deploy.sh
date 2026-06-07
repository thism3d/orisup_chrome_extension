#!/bin/bash
# orlenbd.com — deploy to VPS (Ubuntu + PM2 + Cloudflare Tunnel)
#
# VPS SSH: admin93@38.47.35.16
# App path:  /var/www/orlenbd
# Public:   https://orlenbd.com  → tunnel → http://localhost:5025
#
# Usage (on the server, in /var/www/orlenbd):
#   git pull && ./deploy.sh     # update from GitLab, then backup, install, build, db:push, pm2
#   ./deploy.sh                 # same without git (e.g. after deploy-to-vps tarball — code already current)
#   ./deploy.sh --no-deploy     # backup only
#
# If git pull fails with: "insufficient permission for adding an object to repository database .git/objects"
#   the tree was likely updated as root once. Fix (run on VPS as sudo):
#     sudo chown -R admin93:admin93 /var/www/orlenbd
#   Then: cd /var/www/orlenbd && git pull && ./deploy.sh
#
# Usage (from your dev machine, Git Bash / WSL — requires rsync + ssh):
#   ./deploy.sh remote            # rsync to VPS (excludes .env, node_modules) then remote deploy
#   VPS_HOST=1.2.3.4 ./deploy.sh remote
#
# Override: PM2_USER=admin93 PORT=5025 PM2_APP_NAME=orlenbd ./deploy.sh
# Run as the app user (e.g. admin93), not sudo — PM2 + .env ownership should match.
# From /var/www/norexbd, plain ./deploy.sh uses .env PORT + PM2 name = directory (norexbd).
#
# After first deploy, add to /etc/cloudflared/config.yml (before the catch-all 404):
#   - hostname: orlenbd.com
#     service: http://localhost:5025
#   - hostname: www.orlenbd.com
#     service: http://localhost:5025
# Then: sudo systemctl restart cloudflared

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Repo must be writable by the deploy user (git pull writes .git/objects).
if [ -d .git ] && ! touch .git/.deploy-write-check 2>/dev/null; then
  echo ""
  echo "ERROR: This user cannot write to .git/ (git pull will fail the same way)."
  echo "Fix ownership on the VPS (pick the path for this install), then retry:"
  echo "  sudo chown -R $(whoami):$(whoami) '$SCRIPT_DIR'"
  echo ""
  exit 1
fi
rm -f .git/.deploy-write-check 2>/dev/null || true

# --- VPS / domain defaults (override with env) ---
VPS_USER="${VPS_USER:-admin93}"
VPS_HOST="${VPS_HOST:-38.47.35.16}"
REMOTE_PATH="${REMOTE_PATH:-/var/www/orlenbd}"

# --- Remote: rsync + SSH deploy from laptop ---
if [ "$1" = "remote" ]; then
  shift
  REMOTE="${VPS_USER}@${VPS_HOST}"
  echo "=== orlenbd remote deploy → $REMOTE:$REMOTE_PATH ==="
  echo "Ensure $REMOTE_PATH exists on server: ssh $REMOTE 'sudo mkdir -p $REMOTE_PATH && sudo chown -R $VPS_USER:$VPS_USER $REMOTE_PATH'"
  echo ""
  rsync -avz \
    --delete \
    --exclude "node_modules" \
    --exclude "dist" \
    --exclude "backups" \
    --exclude ".env" \
    --exclude "uploads" \
    --exclude "*.log" \
    "$SCRIPT_DIR/" "$REMOTE:$REMOTE_PATH/"
  echo ""
  echo "Running deploy on server (uses $REMOTE_PATH/.env for PORT / PM2 name)..."
  ssh "$REMOTE" "cd '$REMOTE_PATH' && chmod +x deploy.sh 2>/dev/null || true && ./deploy.sh $*"
  exit 0
fi

# --- Deploy identity: CLI env wins, then .env, then install folder name / defaults ---
CLI_PORT="${PORT:-}"
CLI_PM2_NAME="${PM2_APP_NAME:-}"
CLI_DOMAIN="${DOMAIN_HINT:-}"

if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source .env 2>/dev/null || true
  set +a
fi

[ -n "$CLI_PORT" ] && export PORT="$CLI_PORT"
[ -n "$CLI_PM2_NAME" ] && export PM2_APP_NAME="$CLI_PM2_NAME"
[ -n "$CLI_DOMAIN" ] && export DOMAIN_HINT="$CLI_DOMAIN"

APP_PORT="${PORT:-5025}"
PM2_APP_NAME="${PM2_APP_NAME:-$(basename "$SCRIPT_DIR")}"

if [ -z "${DOMAIN_HINT:-}" ] && [ -n "${PUBLIC_SITE_URL:-}" ]; then
  _d="${PUBLIC_SITE_URL#https://}"
  _d="${_d#http://}"
  DOMAIN_HINT="${_d%%/*}"
fi
DOMAIN_HINT="${DOMAIN_HINT:-orlenbd.com}"

export PORT="$APP_PORT"
export NODE_ENV="${NODE_ENV:-production}"

# --- Backup directory ---
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/backups}"
mkdir -p "$BACKUP_DIR"
if ! touch "$BACKUP_DIR/.write-test" 2>/dev/null; then
  BACKUP_DIR="${HOME:-/tmp}/orlenbd-backups"
  mkdir -p "$BACKUP_DIR"
  echo "Note: Using $BACKUP_DIR (default backups dir not writable)"
fi
rm -f "$BACKUP_DIR/.write-test" 2>/dev/null || true

TIMESTAMP=$(date +%m-%d-%Y-%H-%M)
PREFIX="${TIMESTAMP}-${PM2_APP_NAME}"
TAR_FILE="$BACKUP_DIR/${PREFIX}.tar.gz"
SQL_FILE="$BACKUP_DIR/${PREFIX}.sql"

echo "=== $DOMAIN_HINT backup & deploy (PM2: $PM2_APP_NAME) ==="
echo "Timestamp: $TIMESTAMP | App port: $APP_PORT | Domain: $DOMAIN_HINT"
echo "Backup dir: $BACKUP_DIR"
echo ""

# --- 1. Backup code ---
echo "[1/7] Backing up code to $TAR_FILE"
tar --exclude='node_modules' --exclude='dist' --exclude='.git' --exclude='backups' \
  --exclude='*.zip' --exclude='*.tar.gz' --exclude='*.sql' --exclude='.env' \
  --exclude='uploads' --exclude='*.log' -czf "$TAR_FILE" .
echo "  Code backup: $TAR_FILE"

# --- 2. Backup database ---
if [ -n "$DATABASE_URL" ]; then
  echo "[2/7] Backing up database to $SQL_FILE"
  if command -v pg_dump >/dev/null 2>&1; then
    if pg_dump "$DATABASE_URL" -F p -f "$SQL_FILE" 2>"$BACKUP_DIR/.pg_dump_err"; then
      echo "  Database backup: $SQL_FILE"
      rm -f "$BACKUP_DIR/.pg_dump_err"
    else
      echo "  WARNING: pg_dump failed. Skipping DB backup."
      [ -s "$BACKUP_DIR/.pg_dump_err" ] && echo "  Error: $(cat "$BACKUP_DIR/.pg_dump_err")"
      rm -f "$SQL_FILE" "$BACKUP_DIR/.pg_dump_err"
    fi
  else
    echo "  WARNING: pg_dump not found (apt install postgresql-client). Skipping DB backup."
  fi
else
  echo "[2/7] Skipping DB backup (DATABASE_URL not set in .env)"
fi

if [ "$1" = "--no-deploy" ]; then
  echo ""
  echo "Backup complete. (--no-deploy)"
  exit 0
fi

# Git updates are not run here: HTTPS remotes need credentials/TTY on the VPS.
# On the server use: git pull && ./deploy.sh

# --- 3. Clean & install ---
echo "[3/7] Clean dist / caches"
# dist/ is often root-owned if someone ran "sudo npm run build" — then rm fails for the deploy user.
if ! rm -rf dist 2>/dev/null; then
  : # rm may print errors; continue to check for leftover
fi
if [ -d dist ]; then
  echo ""
  echo "ERROR: dist/ could not be removed (permission denied). Deploy user cannot replace the build."
  echo "Fix ownership once, then re-run:  cd '$SCRIPT_DIR' && ./deploy.sh"
  echo "  sudo chown -R $(whoami):$(whoami) '$SCRIPT_DIR'"
  echo "(Or only: sudo chown -R $(whoami):$(whoami) '$SCRIPT_DIR/dist')"
  exit 1
fi
rm -rf node_modules/.cache
npm cache clean --force 2>/dev/null || true

echo "[4/7] npm install"
# NODE_ENV=production (set above) makes npm omit devDependencies; Vite/esbuild/tailwind live there.
npm install --include=dev

echo "[5/7] npm run build"
npm run build

# --- 7. Database schema ---
echo "[6/7] drizzle-kit push (non-interactive)"
if [ -z "${DATABASE_URL:-}" ]; then
  echo "  Skipping: DATABASE_URL is not set in .env"
  echo "  Without it, drizzle.config.ts falls back to 127.0.0.1:5432 — drizzle-kit can hang on \"Pulling schema\"."
  echo "  Add DATABASE_URL to .env, then on server: cd /var/www/orlenbd && npx drizzle-kit push --force"
else
  # --force: auto-approve data-loss DDL (use with care).
  # Do NOT pass --schemaFilters here: drizzle-kit then ignores drizzle.config.ts and requires --dialect/--schema/--url on the CLI.
  # Multi-schema / non-TTY prompts are handled by schemaFilter: ["public"] in drizzle.config.ts.
  # GNU timeout avoids indefinite hang on bad network/DB.
  if command -v timeout >/dev/null 2>&1; then
    timeout 300 npx drizzle-kit push --force
  else
    npx drizzle-kit push --force
  fi
fi

# --- 8. PM2 ---
RUN_USER="${PM2_USER:-$(stat -c '%U' "$SCRIPT_DIR" 2>/dev/null || stat -f '%Su' "$SCRIPT_DIR" 2>/dev/null || whoami)}"
PM2_CMD="cd '$SCRIPT_DIR' && export PORT='$APP_PORT' && export NODE_ENV=production && export PM2_APP_NAME='$PM2_APP_NAME' && (pm2 delete '$PM2_APP_NAME' 2>/dev/null || true) && pm2 start ecosystem.config.cjs && (pm2 save 2>/dev/null || true)"

if [ "$(id -u)" = "0" ] && [ "$RUN_USER" != "root" ]; then
  echo "[7/7] PM2 restart as user: $RUN_USER (PORT=$APP_PORT)"
  sudo -u "$RUN_USER" bash -c "$PM2_CMD"
else
  echo "[7/7] PM2 restart (PORT=$APP_PORT)"
  bash -c "$PM2_CMD"
fi

echo ""
echo "=== Deploy complete ==="
echo "  Local:    http://127.0.0.1:$APP_PORT"
echo "  Public:   https://$DOMAIN_HINT (after Cloudflare tunnel + DNS)"
echo "  Backups:  $TAR_FILE"
echo "  SQL:      $SQL_FILE (if DB backup ran)"
echo ""
echo "Tunnel snippet (/etc/cloudflared/config.yml):"
echo "  - hostname: $DOMAIN_HINT"
echo "    service: http://localhost:$APP_PORT"
echo "  (add www.$DOMAIN_HINT if needed, same service line)"
