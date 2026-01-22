#!/bin/bash

echo "Исправляем поле supplier в коллекции users"

# Получаем admin токен
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8090/api/admins/auth-with-password -H "Content-Type: application/json" -d '{"identity": "admin@alcoapp.ru", "password": "admin123"}' | jq -r '.token')

# Получаем ID коллекции users
COLLECTION_ID=$(curl -s "http://localhost:8090/api/collections/users" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.id')

echo "Collection ID: $COLLECTION_ID"

# Удаляем старое поле supplier если есть
echo "Удаляем старое поле supplier..."
curl -X DELETE "http://localhost:8090/api/collections/users/fields/supplier" \
  -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null

# Добавляем новое поле supplier как relation
echo "Создаем новое поле supplier..."
curl -X POST "http://localhost:8090/api/collections/users/fields" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "supplier",
    "type": "relation",
    "required": false,
    "presentable": false,
    "options": {
      "collectionId": "43r469h8yabcspj",
      "maxSelect": 1
    }
  }'

echo ""
echo "✅ Поле supplier создано!"
