#!/bin/bash

echo "🚀 АВТОМАТИЧЕСКОЕ РАЗВЕРТЫВАНИЕ AlcoApp НА VDsina"
echo "=================================================="

# Обновляем систему
echo "📦 Обновляем систему..."
apt update && apt upgrade -y

# Устанавливаем необходимые пакеты
echo "📦 Устанавливаем Node.js, git, unzip..."
apt install -y curl wget git unzip

# Устанавливаем Node.js 18
echo "📦 Устанавливаем Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Проверяем установку
echo "✅ Проверяем версии:"
node --version
npm --version

# Создаем папку для проекта
echo "📁 Создаем папку для проекта..."
mkdir -p /var/www
cd /var/www

# Клонируем репозиторий
echo "📥 Клонируем репозиторий..."
git clone https://github.com/alcosklad/alcoapp.git
cd alcoapp

# Устанавливаем зависимости
echo "📦 Устанавливаем зависимости npm..."
npm install

# Скачиваем PocketBase
echo "🗄️ Скачиваем PocketBase..."
wget -q https://github.com/pocketbase/pocketbase/releases/download/v0.22.5/pocketbase_0.22.5_linux_amd64.zip
unzip -q pocketbase_0.22.5_linux_amd64.zip
rm pocketbase_0.22.5_linux_amd64.zip
chmod +x pocketbase

# Создаем systemd сервис для PocketBase
echo "🔧 Создаем сервис для PocketBase..."
cat > /etc/systemd/system/pocketbase.service << EOF
[Unit]
Description=PocketBase
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/alcoapp
ExecStart=/var/www/alcoapp/pocketbase serve --http=0.0.0.0:8090
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Создаем systemd сервис для приложения
echo "🔧 Создаем сервис для приложения..."
cat > /etc/systemd/system/alcoapp.service << EOF
[Unit]
Description=AlcoApp
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/alcoapp
ExecStart=/usr/bin/npm run dev -- --host 0.0.0.0 --port 5173
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Перезагружаем systemd и запускаем сервисы
echo "🚀 Запускаем сервисы..."
systemctl daemon-reload
systemctl enable pocketbase
systemctl start pocketbase
systemctl enable alcoapp
systemctl start alcoapp

# Настраиваем файрвол
echo "🔥 Настраиваем файрвол..."
ufw allow 22
ufw allow 8090
ufw allow 5173
ufw --force enable

# Ждем несколько секунд для запуска
echo "⏳ Ждем запуска сервисов..."
sleep 10

# Проверяем статус сервисов
echo "✅ Проверяем статус сервисов:"
systemctl status pocketbase --no-pager
echo ""
systemctl status alcoapp --no-pager

# Проверяем доступность портов
echo "🌐 Проверяем доступность:"
curl -s http://localhost:8090/api/health && echo "✅ PocketBase работает!"
curl -s http://localhost:5173 && echo "✅ Приложение работает!"

echo ""
echo "🎉 РАЗВЕРТЫВАНИЕ ЗАВЕРШЕНО!"
echo "============================"
echo "📱 Приложение доступно по адресу:"
echo "   http://146.103.121.96:5173"
echo ""
echo "🗄️ PocketBase API:"
echo "   http://146.103.121.96:8090"
echo ""
echo "⚙️ Админка PocketBase:"
echo "   http://146.103.121.96:8090/_/"
echo ""
echo "🔍 Управление сервисами:"
echo "   systemctl status pocketbase"
echo "   systemctl status alcoapp"
echo "   systemctl restart pocketbase"
echo "   systemctl restart alcoapp"
