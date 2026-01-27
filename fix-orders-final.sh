#!/bin/bash

echo "🔧 ФИКСИРУЮ ПРАВА ДОСТУПА К ORDERS!"

# Используем admin API (не users!)
echo "📝 Авторизация через admin API..."
ADMIN_RESPONSE=$(curl -s -X POST http://localhost:8090/api/admins/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity": "admin@alcoapp.ru", "password": "admin123"}')

ADMIN_TOKEN=$(echo $ADMIN_RESPONSE | jq -r '.token')

if [ "$ADMIN_TOKEN" == "null" ]; then
  echo "❌ Ошибка admin авторизации!"
  echo $ADMIN_RESPONSE
  exit 1
fi

echo "✅ Admin авторизация успешна!"

# Получаем ID коллекции orders
echo "📋 Нахожу коллекцию orders..."
COLLECTIONS=$(curl -s -X GET "http://localhost:8090/api/collections" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

ORDERS_ID=$(echo $COLLECTIONS | jq -r '.items[] | select(.name=="orders") | .id')

if [ "$ORDERS_ID" == "null" ]; then
  echo "❌ Коллекция orders не найдена!"
  exit 1
fi

echo "✅ Найдена orders с ID: $ORDERS_ID"

# Обновляем коллекцию
echo "⚙️ Обновляю правила доступа..."
UPDATE=$(curl -s -X PUT "http://localhost:8090/api/collections/$ORDERS_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "orders",
    "type": "base",
    "schema": [
      {
        "id": "user_relation",
        "name": "user",
        "type": "relation",
        "required": true,
        "presentable": false,
        "options": {
          "collectionId": "_pb_users_auth_",
          "cascadeDelete": false,
          "minSelect": null,
          "maxSelect": 1
        }
      }
    ],
    "listRule": "user = @request.auth.id || @request.auth.role = \"admin\"",
    "viewRule": "user = @request.auth.id || @request.auth.role = \"admin\"",
    "createRule": "@request.auth.id != null",
    "updateRule": "@request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"admin\""
  }')

echo $UPDATE | jq '.'

echo ""
echo "✅✅✅ ПРАВА ИСПРАВЛЕНЫ!"
echo "🔄 Обновите страницу и попробуйте открыть историю!"
