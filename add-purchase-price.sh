#!/bin/bash

echo "🔧 Добавляем поле purchase_price в коллекцию stocks"

# Получаем токен
TOKEN=$(curl -s -X POST http://localhost:8090/api/collections/users/auth-with-password -H "Content-Type: application/json" -d '{"identity": "admin@alcoapp.ru", "password": "admin123"}' | jq -r '.token')

# Получаем текущую схему коллекции stocks
SCHEMA=$(curl -s "http://localhost:8090/api/collections/stocks" -H "Authorization: Bearer $TOKEN" | jq '.schema')

# Создаем обновленную схему с новым полем
UPDATED_SCHEMA=$(echo "$SCHEMA" | jq '. + [
  {
    "name": "purchase_price",
    "type": "number",
    "required": false,
    "options": {
      "min": 0
    }
  }
]')

echo "Обновленная схема:"
echo "$UPDATED_SCHEMA"

# Обновляем коллекцию
curl -X PATCH "http://localhost:8090/api/collections/stocks" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"schema\": $UPDATED_SCHEMA}"

echo ""
echo "✅ Поле purchase_price добавлено!"
