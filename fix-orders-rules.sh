#!/bin/bash

echo "🔧 Настраиваем права доступа для коллекции orders"

# Получаем admin токен
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8090/api/admins/auth-with-password -H "Content-Type: application/json" -d '{"identity": "admin@alcoapp.ru", "password": "admin123"}' | jq -r '.token')

# Обновляем коллекцию orders с правильными правилами доступа
echo "⚙️ Обновляем коллекцию orders..."

curl -X PATCH "http://localhost:8090/api/collections/orders" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "createRule": "@request.auth.id != null",
    "readRule": "user = @request.auth.id || @request.auth.role = \"admin\"",
    "updateRule": "@request.auth.role = \"admin\"",
    "deleteRule": "@request.auth.role = \"admin\""
  }' | jq '.'

echo ""
echo "✅ Правила доступа обновлены!"
echo ""
echo "📋 Теперь все пользователи могут:"
echo "   - Создавать заказы"
echo "   - Просматривать свои заказы"
echo "   - Админы видят все заказы"
