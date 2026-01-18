#!/bin/bash

echo "🔧 ОБНОВЛЕНИЕ КОЛЛЕКЦИИ USERS В POCKETBASE"
echo "============================================"

# API URL
API_URL="http://localhost:8090/api/collections/users/fields"

# Получаем текущие поля
echo "1. Проверяем текущие поля..."
curl -s "$API_URL" | jq '.' || echo "Ошибка получения полей"

echo ""
echo "2. Добавляем поле role..."

# Добавляем поле role
curl -X PATCH "$API_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "role": {
      "type": "select",
      "required": true,
      "options": {
        "values": [
          "admin",
          "operator", 
          "worker"
        ]
      },
      "default": "worker"
    }
  }' | jq '.' || echo "Ошибка добавления поля"

echo ""
echo "3. Создаем тестовых пользователей..."
USERS_API="http://localhost:8090/api/collections/users/records"

# Администратор
curl -X POST "$USERS_API" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alcoapp.ru",
    "password": "admin123",
    "passwordConfirm": "admin123",
    "name": "Администратор",
    "role": "admin"
  }' | jq '.' || echo "Администратор уже существует"

# Оператор
curl -X POST "$USERS_API" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator@alcoapp.ru",
    "password": "operator123",
    "passwordConfirm": "operator123",
    "name": "Оператор",
    "role": "operator"
  }' | jq '.' || echo "Оператор уже существует"

echo ""
echo "✅ ГОТОВО! Пользователи созданы:"
echo "   Администратор: admin@alcoapp.ru / admin123"
echo "   Оператор: operator@alcoapp.ru / operator123"
