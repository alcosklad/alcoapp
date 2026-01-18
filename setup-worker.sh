#!/bin/bash

echo "🔧 СОЗДАНИЕ СТРУКТУРЫ ДЛЯ WORKER"
echo "================================="

echo ""
echo "1. ⚠️  Добавьте поле supplier в коллекцию users:"
echo "   - Откройте http://localhost:8090/_/"
echo "   - Collections → users → Edit"
echo "   - Create new field:"
echo "     Name: supplier"
echo "     Type: Relation"
echo "     Collection: suppliers"
echo "     Max select: 1"
echo "   - Save"

echo ""
echo "2. Создаю коллекцию sales через API..."

# Получаем токен
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8090/api/collections/users/auth-with-password -H "Content-Type: application/json" -d '{"identity": "admin@alcoapp.ru", "password": "admin123"}' | jq -r '.token')

# Создаем коллекцию sales
curl -X POST http://localhost:8090/api/collections \
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
  }' | jq '.'
