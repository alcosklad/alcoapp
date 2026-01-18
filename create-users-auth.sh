#!/bin/bash

echo "👥 СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ С АВТОРИЗАЦИЕЙ"
echo "======================================="

# API URL
API_URL="http://localhost:8090/api"

# 1. Логинимся как админ
echo "🔐 Авторизуемся в PocketBase..."
ADMIN_TOKEN=$(curl -s -X POST "$API_URL/admins/auth-with-password" \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "admin@example.com",
    "password": "1234567890"
  }' | jq -r '.token // empty')

if [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ Не удалось авторизоваться!"
    echo "Проверьте данные админа в PocketBase"
    exit 1
fi

echo "✅ Авторизация успешна!"

# 2. Создаем коллекцию users
echo "📋 Создаем коллекцию users..."
curl -s -X POST "$API_URL/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "users",
    "type": "base",
    "schema": [
      {"name": "name", "type": "text", "required": true},
      {"name": "email", "type": "email", "required": false},
      {"name": "role", "type": "select", "required": false, "options": {"values": ["admin", "manager", "employee"], "default": "employee"}},
      {"name": "active", "type": "bool", "required": false, "options": {"default": true}}
    ]
  }'

# 3. Добавляем пользователей
echo ""
echo "👤 Добавляем пользователей..."

# Администратор
curl -s -X POST "$API_URL/collections/users/records" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Администратор",
    "email": "admin@alcoapp.ru",
    "role": "admin",
    "active": true
  }' | jq -r '.id // "Ошибка"'

# Менеджер
curl -s -X POST "$API_URL/collections/users/records" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Менеджер",
    "email": "manager@alcoapp.ru",
    "role": "manager",
    "active": true
  }' | jq -r '.id // "Ошибка"'

# Сотрудник 1
curl -s -X POST "$API_URL/collections/users/records" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Иван Петров",
    "email": "ivan@alcoapp.ru",
    "role": "employee",
    "active": true
  }' | jq -r '.id // "Ошибка"'

# Сотрудник 2
curl -s -X POST "$API_URL/collections/users/records" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "name": "Мария Иванова",
    "email": "maria@alcoapp.ru",
    "role": "employee",
    "active": true
  }' | jq -r '.id // "Ошибка"'

echo ""
echo "✅ Проверяем результат:"
curl -s "$API_URL/collections/users/records" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.items[] | "  - \(.name) (\(.role))"'

echo ""
echo "🎉 ГОТОВО! Пользователи добавлены!"
