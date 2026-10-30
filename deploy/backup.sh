#!/usr/bin/env bash
# 每天备份数据库（保留最近 14 份），建议加到 crontab：
#   0 3 * * * bash /opt/doubletree-hr/deploy/backup.sh >> /var/log/hr-backup.log 2>&1
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/doubletree-hr}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
STAMP=$(date +%F-%H%M)

mkdir -p "$BACKUP_DIR"
docker exec doubletree-hr node -e "
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('/app/data/hr.db');
db.exec(\"VACUUM INTO '/app/data/backup-${STAMP}.db'\");
db.close();
console.log('backup ok');
"
mv "$APP_DIR/data/backup-${STAMP}.db" "$BACKUP_DIR/hr-${STAMP}.db"
ls -1t "$BACKUP_DIR"/hr-*.db | tail -n +15 | xargs -r rm -f
echo "备份完成：$BACKUP_DIR/hr-${STAMP}.db"
