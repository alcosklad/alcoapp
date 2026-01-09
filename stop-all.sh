#!/bin/bash

echo "🛑 Останавливаю все серверы..."

# Останавливаем PocketBase
if [ -f ~/pocketbase/pocketbase.pid ]; then
    PB_PID=$(cat ~/pocketbase/pocketbase.pid)
    kill $PB_PID 2>/dev/null
    echo "✅ PocketBase остановлен"
    rm ~/pocketbase/pocketbase.pid
fi

# Останавливаем приложение
if [ -f ~/Desktop/alcoapp/app.pid ]; then
    APP_PID=$(cat ~/Desktop/alcoapp/app.pid)
    kill $APP_PID 2>/dev/null
    echo "✅ Приложение остановлено"
    rm ~/Desktop/alcoapp/app.pid
fi

# Дополнительно ищем процессы
pkill -f "pocketbase serve" 2>/dev/null
pkill -f "vite" 2>/dev/null

echo "🎉 Всё остановлено!"
