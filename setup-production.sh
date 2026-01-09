#!/bin/bash

echo "🚀 НАСТРОЙКА ПРОДАКШЕН РЕЖИМА AlcoApp"
echo "====================================="

# 1. Устанавливаем serve глобально
echo "📦 Устанавливаем serve..."
npm install -g serve

# 2. Создаем новый сервис для продакшена
echo "🔧 Создаем продакшен сервис..."
cat > /etc/systemd/system/alcoapp.service << 'EOF'
[Unit]
Description=AlcoApp Production
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/alcoapp
ExecStart=/usr/bin/npx serve -s /var/www/alcoapp/dist -l 5173
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# 3. Собираем проект
echo "🏗️ Собираем проект..."
npm run build

# 4. Перезагружаем и запускаем
echo "🚀 Запускаем сервисы..."
systemctl daemon-reload
systemctl enable alcoapp
systemctl restart alcoapp

# 5. Проверяем статус
echo "✅ Проверяем статус:"
systemctl status alcoapp --no-pager -l

echo ""
echo "🎉 ПРОДАКШЕН НАСТРОЕН!"
echo "========================"
echo "📱 Приложение: http://146.103.121.96:5173"
echo "🗄️ API: http://146.103.121.96:8090"
echo "⚙️ Админка: http://146.103.121.96:8090/_/"
