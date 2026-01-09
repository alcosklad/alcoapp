#!/bin/bash

echo "🚀 Установка PocketBase..."

# Создаем папку
mkdir -p ~/pocketbase
cd ~/pocketbase

# Скачиваем PocketBase для Mac (Apple Silicon)
echo "📥 Скачиваю PocketBase..."
curl -L https://github.com/pocketbase/pocketbase/releases/download/v0.22.5/pocketbase_0.22.5_darwin_arm64.zip -o pocketbase.zip

# Распаковываем
echo "📦 Распаковываю..."
unzip pocketbase.zip

# Делаем исполняемым
chmod +x pocketbase

# Создаем базу данных
echo "🗄️ Создаю базу данных..."
mkdir -p pb_data pb_public

echo "✅ PocketBase установлен!"
echo ""
echo "🔧 Чтобы запустить сервер, выполните:"
echo "cd ~/pocketbase && ./pocketbase serve --http=0.0.0.0:8090"
echo ""
echo "📱 Админ-панель будет доступна по адресу: http://localhost:8090/_/"
echo "🌐 API будет доступен по адресу: http://localhost:8090/api/"
