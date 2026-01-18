#!/bin/bash

echo "👥 СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ В POCKETBASE"
echo "====================================="

# API URL
API_URL="http://localhost:8090/api"

# 1. Проверяем коллекцию users
echo "📋 Проверяем коллекцию users..."
USERS_COLLECTION=$(curl -s "$API_URL/collections/users" | jq -r '.id // empty')

if [ -z "$USERS_COLLECTION" ]; then
    echo "➕ Создаем коллекцию users..."
    curl -X POST "$API_URL/collections" \
      -H "Content-Type: application/json" \
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
fi

# 2. Добавляем пользователей
echo ""
echo "👤 Добавляем пользователей..."

# Администратор
curl -s -X POST "$API_URL/collections/users/records" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Администратор",
    "email": "admin@alcoapp.ru",
    "role": "admin",
    "active": true
  }' | jq -r '.id // "Ошибка"'

# Менеджер
curl -s -X POST "$API_URL/collections/users/records" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Менеджер",
    "email": "manager@alcoapp.ru",
    "role": "manager",
    "active": true
  }' | jq -r '.id // "Ошибка"'

# Сотрудник 1
curl -s -X POST "$API_URL/collections/users/records" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Иван Петров",
    "email": "ivan@alcoapp.ru",
    "role": "employee",
    "active": true
  }' | jq -r '.id // "Ошибка"'

# Сотрудник 2
curl -s -X POST "$API_URL/collections/users/records" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Мария Иванова",
    "email": "maria@alcoapp.ru",
    "role": "employee",
    "active": true
  }' | jq -r '.id // "Ошибка"'

echo ""
echo "✅ Проверяем результат:"
curl -s "$API_URL/collections/users/records" | jq -r '.items[] | "  - \(.name) (\(.role))"'

echo ""
echo "🎉 ГОТОВО! Пользователи добавлены!"
