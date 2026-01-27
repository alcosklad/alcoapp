#!/bin/bash

echo "🔧 Настраиваем коллекцию orders через API"

# Логинимся как admin
echo "📝 Авторизация..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8090/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{"identity": "admin@example.com", "password": "admin123456"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
USER_ID=$(echo $LOGIN_RESPONSE | jq -r '.record.id')

if [ "$TOKEN" == "null" ]; then
  echo "❌ Ошибка авторизации!"
  exit 1
fi

echo "✅ Авторизация успешна"

# Получаем текущую коллекцию
echo "📋 Получаем данные коллекции orders..."
COLLECTION=$(curl -s -X GET "http://localhost:8090/api/collections/orders" \
  -H "Authorization: Bearer $TOKEN")

# Обновляем правила
echo "⚙️ Обновляем правила доступа..."
UPDATE_RESPONSE=$(curl -s -X PATCH "http://localhost:8090/api/collections/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "createRule": "@request.auth.id != null",
    "readRule": "user = @request.auth.id || @request.auth.role = \"admin\"",
    "updateRule": "@request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"admin\""
  }')

echo $UPDATE_RESPONSE | jq '.'

echo ""
echo "✅ Правила обновлены!"
echo ""
echo "🔄 Обновите страницу и попробуйте снова"
