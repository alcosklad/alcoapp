#!/bin/bash

echo "🔧 СОЗДАНИЕ КОЛЛЕКЦИИ SALES ЧЕРЕЗ API"
echo "====================================="

# 1. Получаем токен через обычную авторизацию
echo "1. Получаем токен пользователя..."
USER_TOKEN=$(curl -s -X POST http://localhost:8090/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity": "admin@alcoapp.ru", "password": "admin123"}' | jq -r '.token')

if [ "$USER_TOKEN" = "null" ]; then
  echo "❌ Не удалось получить токен пользователя"
  exit 1
fi

echo "✅ Токен получен"

# 2. Пробуем создать коллекцию через специальный эндпоинт
echo ""
echo "2. Создаю коллекцию sales..."

# Сначала пробуем через /api/collections с токеном админа
RESULT=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8090/api/collections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "name": "sales",
    "type": "base",
    "schema": [
      {
        "name": "user",
        "type": "relation",
        "required": true,
        "options": {
          "collectionId": "_pb_users_auth_",
          "maxSelect": 1
        }
      },
      {
        "name": "product",
        "type": "relation",
        "required": true,
        "options": {
          "collectionId": "products",
          "maxSelect": 1
        }
      },
      {
        "name": "quantity",
        "type": "number",
        "required": true,
        "options": {
          "min": 0
        }
      },
      {
        "name": "price",
        "type": "number",
        "required": true,
        "options": {
          "min": 0
        }
      },
      {
        "name": "total",
        "type": "number",
        "required": true,
        "options": {
          "min": 0
        }
      },
      {
        "name": "supplier",
        "type": "relation",
        "required": true,
        "options": {
          "collectionId": "suppliers",
          "maxSelect": 1
        }
      },
      {
        "name": "sale_date",
        "type": "date",
        "required": true
      },
      {
        "name": "sale_time",
        "type": "text",
        "required": true
      }
    ]
  }')

# Получаем HTTP код из последней строки
HTTP_CODE=$(echo "$RESULT" | tail -n1)
RESPONSE_BODY=$(echo "$RESULT" | sed '$d')

echo "HTTP код: $HTTP_CODE"
echo "Ответ: $RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_CODE" = "200" ]; then
  echo ""
  echo "✅ Коллекция sales создана успешно!"
else
  echo ""
  echo "❌ Не удалось создать через API"
  echo ""
  echo "📍 Нужно создать вручную:"
  echo "1. Откройте: http://localhost:8090/_/"
  echo "2. Войдите с паролем: 123456789"
  echo "3. Collections → + New Collection"
  echo "4. Name: sales"
  echo "5. Type: Base"
  echo "6. Добавьте поля как описано выше"
fi
