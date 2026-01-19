#!/bin/bash

echo "🔧 СОЗДАНИЕ КОЛЛЕКЦИИ SALES"
echo "==========================="

# Получаем токен админа
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8090/api/collections/users/auth-with-password -H "Content-Type: application/json" -d '{"identity": "admin@alcoapp.ru", "password": "admin123"}' | jq -r '.token')

# Создаем коллекцию
echo "Создаю коллекцию sales..."
RESPONSE=$(curl -s -X POST http://localhost:8090/api/collections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
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

echo "Ответ: $RESPONSE" | jq '.'

# Проверяем результат
if echo "$RESPONSE" | jq -e '.id' > /dev/null 2>&1; then
  echo "✅ Коллекция sales создана успешно!"
else
  echo "❌ Ошибка создания коллекции"
  echo "Попробуйте создать вручную в UI: http://localhost:8090/_/"
fi
