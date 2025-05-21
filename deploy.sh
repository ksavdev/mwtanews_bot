#!/usr/bin/env bash
set -euo pipefail

echo "🚀 Запуск деплоя MW:TA News Bot..."


[ -f .env ] || cp .env.example .env

npm run docker

echo "✅ Бот и база успешно запущены."
echo "👉 Логи бота: docker compose logs -f bot"
