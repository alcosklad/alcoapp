#!/bin/bash

echo "🚀 Запускаю всё автоматически..."

# Запускаем PocketBase
echo "📦 Запускаю PocketBase..."
cd ~/pocketbase
nohup ./pocketbase serve --http=0.0.0.0:8090 > pocketbase.log 2>&1 &
PB_PID=$!
echo "PocketBase запущен (PID: $PB_PID)"

# Ждем 2 секунды для старта
sleep 2

# Запускаем приложение
echo "🌐 Запускаю приложение..."
cd ~/Desktop/alcoapp
nohup npm run dev > app.log 2>&1 &
APP_PID=$!
echo "Приложение запущено (PID: $APP_PID)"

echo ""
echo "✅ Всё запущено!"
echo ""
echo "📱 Адреса для доступа:"
echo "  Приложение (Mac): http://localhost:5173"
echo "  Приложение (Телефон): http://192.168.1.4:5173"
echo "  Админ-панель: http://192.168.1.4:8090/_/"
echo ""
echo "🔐 Данные для входа:"
echo "  Email: admin@example.com"
echo "  Пароль: admin123456"
echo ""
echo "🛑 Чтобы остановить всё:"
echo "  kill $PB_PID $APP_PID"
echo ""
echo "📊 Логи:"
echo "  PocketBase: ~/pocketbase/pocketbase.log"
echo "  Приложение: ~/Desktop/alcoapp/app.log"

# Сохраняем PID в файл
echo "$PB_PID" > pocketbase.pid
echo "$APP_PID" > app.pid
