#!/bin/bash

echo "🛒 Создаем коллекцию orders в PocketBase"

# Получаем admin токен
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8090/api/admins/auth-with-password -H "Content-Type: application/json" -d '{"identity": "admin@alcoapp.ru", "password": "admin123"}' | jq -r '.token')

# Создаем коллекцию orders
curl -X POST "http://localhost:8090/api/collections" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "orders",
    "type": "base",
    "schema": [
      {
        "name": "user",
        "type": "relation",
        "required": true,
        "presentable": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "maxSelect": 1
        }
      },
      {
        "name": "items",
        "type": "json",
        "required": true,
        "presentable": false
      },
      {
        "name": "subtotal",
        "type": "number",
        "required": true,
        "presentable": true,
        "options": {
          "min": 0
        }
      },
      {
        "name": "discount",
        "type": "number",
        "required": false,
        "presentable": true,
        "options": {
          "min": 0
        }
      },
      {
        "name": "discount_type",
        "type": "select",
        "required": false,
        "presentable": false,
        "options": {
          "values": ["percentage", "fixed"]
        }
      },
      {
        "name": "discount_value",
        "type": "text",
        "required": false,
        "presentable": false
      },
      {
        "name": "total",
        "type": "number",
        "required": true,
        "presentable": true,
        "options": {
          "min": 0
        }
      },
      {
        "name": "payment_method",
        "type": "select",
        "required": true,
        "presentable": true,
        "options": {
          "values": ["cash", "transfer", "prepaid"]
        }
      },
      {
        "name": "local_time",
        "type": "text",
        "required": true,
        "presentable": true
      },
      {
        "name": "created",
        "type": "date",
        "required": true,
        "presentable": true
      }
    ]
  }' | jq '.'

echo ""
echo "✅ Коллекция orders создана!"

# Настраиваем API Rules
echo "⚙️ Настраиваем API Rules..."
curl -X POST "http://localhost:8090/api/collections/orders/rules" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "api",
    "name": "Public access",
    "key": "*",
    "rule": {
      "collectionId": "orders",
      "permissions": {
        "create": true,
        "read": true,
        "update": false,
        "delete": false
      }
    }
  }' | jq '.'

echo ""
echo "✅ API Rules настроены!"
