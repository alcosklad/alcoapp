#!/bin/bash

echo "🔧 СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ НА СЕРВЕРЕ"
echo "===================================="

# Подключаемся к серверу
ssh root@146.103.121.96 << 'EOF'
cd /var/www/alcoapp

# Создаем скрипт
cat > create-server-users.sh << 'EOL'
#!/bin/bash

API_URL="http://localhost:8090/api"

echo "1. Проверяем PocketBase..."
curl -s "$API_URL/health" > /dev/null || { echo "❌ PocketBase не запущен"; exit 1; }

echo "2. Создаем администратора..."
curl -s -X POST "$API_URL/collections/users/records" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alcoapp.ru",
    "password": "admin123",
    "passwordConfirm": "admin123",
    "name": "Администратор",
    "role": "admin",
    "emailVisibility": true
  }' > /dev/null && echo "✅ Администратор создан" || echo "⚠️ Уже существует"

echo "3. Создаем оператора..."
curl -s -X POST "$API_URL/collections/users/records" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator@alcoapp.ru",
    "password": "operator123",
    "passwordConfirm": "operator123",
    "name": "Оператор",
    "role": "operator",
    "emailVisibility": true
  }' > /dev/null && echo "✅ Оператор создан" || echo "⚠️ Уже существует"

echo "✅ ГОТОВО!"
EOL

chmod +x create-server-users.sh
./create-server-users.sh
EOF

echo "✅ Пользователи созданы на сервере!"
