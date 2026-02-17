#!/bin/bash

# Скрипт для запуска миграции на сервере

echo "🔐 Подключение к серверу..."
echo "Пароль: 897He43u8+i8Ne-tq#6k"
echo ""

ssh root@146.103.121.96 << 'ENDSSH'
cd /var/www/alcoapp

echo "📦 Обновление кода с GitHub..."
git pull origin main

echo ""
echo "🧪 Запуск тестовой миграции (dry-run)..."
node migrate-to-fifo.mjs --dry-run

echo ""
echo "⚠️  Если все выглядит хорошо, запусти реальную миграцию:"
echo "   node migrate-to-fifo.mjs"
echo ""

ENDSSH
