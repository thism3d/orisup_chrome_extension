#!/usr/bin/env bash
# Run once on the VPS (as the deploy user, e.g. admin93) to replace /var/www/orlenbd
# with a fresh clone from GitLab. Preserves .env from the old tree.
#
# If /var/www is root-owned (common), plain "git clone" cannot create orlenbd/ — use:
#   cd /var/www && sudo git clone <url> orlenbd && sudo chown -R admin93:admin93 orlenbd
#
# Usage:
#   curl -fsSL ... | bash   # or copy this file to the server and:
#   bash scripts/vps-replace-with-git-clone.sh
#
# Overrides:
#   REPO_URL=https://gitlab.com/group/repo.git PARENT_DIR=/var/www APP_NAME=orlenbd bash scripts/vps-replace-with-git-clone.sh
#
# Private HTTPS repos: use a deploy token in the URL (GitLab → Settings → Repository → Deploy tokens)
#   REPO_URL='https://oauth2:TOKEN@gitlab.com/programmerhimel/orlenbd.git'
# Or after clone: git remote set-url origin git@gitlab.com:programmerhimel/orlenbd.git + SSH key on the server.

set -euo pipefail

PARENT_DIR="${PARENT_DIR:-/var/www}"
APP_NAME="${APP_NAME:-orlenbd}"
TARGET="${PARENT_DIR}/${APP_NAME}"
REPO_URL="${REPO_URL:-https://gitlab.com/programmerhimel/orlenbd.git}"

if [ "$(id -u)" -eq 0 ]; then
  echo "Run as your deploy user (e.g. admin93), not root, so files and PM2 ownership stay correct."
  exit 1
fi

echo "=== vps-replace-with-git-clone ==="
echo "  Target:  $TARGET"
echo "  Repo:    $REPO_URL"
echo ""

ENV_BACKUP=""
if [ -f "${TARGET}/.env" ]; then
  ENV_BACKUP="$(mktemp /tmp/orlenbd.env.backup.XXXXXX)"
  cp "${TARGET}/.env" "$ENV_BACKUP"
  echo "  Saved .env -> $ENV_BACKUP"
else
  echo "  WARNING: no ${TARGET}/.env — create .env after clone if the app needs DATABASE_URL etc."
fi

if [ -d "$TARGET" ]; then
  echo "  Removing existing $TARGET ..."
  if ! rm -rf "$TARGET" 2>/dev/null; then
    echo ""
    echo "  ERROR: cannot remove $TARGET (often root-owned files from a past sudo deploy)."
    echo "  Fix ownership, then re-run this script:"
    echo "    sudo chown -R \"$(whoami):$(whoami)\" \"$TARGET\""
    echo "  Or remove as root and clone again as $(whoami):"
    echo "    sudo rm -rf \"$TARGET\""
    echo ""
    exit 1
  fi
else
  mkdir -p "$PARENT_DIR"
fi

echo "  git clone ..."
if ! git clone "$REPO_URL" "$TARGET"; then
  echo ""
  echo "  Clone failed. If the error was 'could not create work tree dir': $PARENT_DIR is not writable as $(whoami)."
  echo "  Run:"
  echo "    cd $PARENT_DIR && sudo git clone \"$REPO_URL\" \"$APP_NAME\" && sudo chown -R \"$(whoami):$(whoami)\" \"$TARGET\""
  echo "  Then restore .env if needed and: cd \"$TARGET\" && ./deploy.sh"
  exit 1
fi

if [ -n "$ENV_BACKUP" ] && [ -f "$ENV_BACKUP" ]; then
  cp "$ENV_BACKUP" "${TARGET}/.env"
  rm -f "$ENV_BACKUP"
  chmod 600 "${TARGET}/.env" 2>/dev/null || true
  echo "  Restored .env"
fi

chmod +x "${TARGET}/deploy.sh" 2>/dev/null || true
chmod +x "${TARGET}/deploy-to-vps.sh" 2>/dev/null || true

echo ""
echo "=== Done ==="
echo "  cd $TARGET && ./deploy.sh"
echo "  Future updates: git pull && ./deploy.sh"
