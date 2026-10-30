#!/usr/bin/env bash
# 服务器上执行：bash deploy/deploy.sh
# 作用：检查 Docker → 生成 .env → 构建并启动 → 健康检查
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/doubletree-hr}"
cd "$APP_DIR"

echo "== 1/4 检查 Docker =="
if ! command -v docker >/dev/null 2>&1; then
  echo "未安装 Docker，开始安装…"
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
fi
docker --version

echo "== 2/4 准备配置 =="
if [ ! -f .env ]; then
  cp .env.example .env
  SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '=+/' | cut -c1-40)
  sed -i "s/^AUTH_SECRET=.*/AUTH_SECRET=${SECRET}/" .env
  echo "已生成 .env（请立刻修改 HR_PASS）"
else
  echo ".env 已存在，跳过"
fi
mkdir -p data

echo "== 3/4 构建并启动 =="
docker compose up -d --build

echo "== 4/4 健康检查 =="
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    echo "启动成功：http://$(curl -s ifconfig.me || echo '服务器IP'):3000"
    exit 0
  fi
  sleep 2
done

echo "启动超时，查看日志：docker compose logs --tail=100"
exit 1
