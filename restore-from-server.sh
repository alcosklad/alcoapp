#!/bin/bash

echo "Восстанавливаем данные с сервера PocketBase..."

# Останавливаем PocketBase
pkill -f pocketbase
sleep 2

# Удаляем старые данные
rm -rf pb_data/*
rm -rf pb_migrations/*

# Скачиваем данные с сервера
echo "Скачиваем данные с http://146.103.121.96:8090"
scp -r root@146.103.121.96:/path/to/pocketbase/pb_data/* ./pb_data/ 2>/dev/null || {
    echo "❌ Не удалось скачать данные по SSH"
    echo "🔄 Пробуем скачать через HTTP..."
    
    # Альтернативный способ - через API экспорта
    curl -s "http://146.103.121.96:8090/api/collections" -H "Content-Type: application/json" -d '{"identity": "admin@alcoapp.ru", "password": "admin123"}' > server_collections.json
}

echo "✅ Готово! Запускаем PocketBase..."
./pocketbase serve --http=0.0.0.0:8090 &

echo "📍 Админка: http://localhost:8090/_/"
echo "🔐 Email: admin@alcoapp.ru"
echo "🔐 Пароль: admin123"
