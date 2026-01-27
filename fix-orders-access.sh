#!/bin/bash

echo "🔧 Настраиваем права доступа для коллекции orders"

# Получаем admin токен
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8090/api/admins/auth-with-password -H "Content-Type: application/json" -d '{"identity": "admin@alcoapp.ru", "password": "admin123"}' | jq -r '.token')

# Устанавливаем правила API для коллекции orders
echo "⚙️ Настраиваем API Rules для orders..."

# Правило для чтения (все авторизованные пользователи)
curl -X POST "http://localhost:8090/api/collections/orders/rules" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "3n5x9k9p2w8j4h2",
    "key": "*",
    "rule": "user != null && user.id = @request.auth.id",
    "permissions": {
      "read": true,
      "create": true,
      "update": false,
      "delete": false
    }
  }' | jq '.'

echo ""
echo "✅ Правила доступа обновлены!"
echo ""
echo "📋 Теперь все пользователи могут:"
echo "   - Просматривать свои заказы"
echo "   - Создавать заказы"
echo ""
echo "⚠️  Только админы могут:"
echo "   - Просматривать все заказы"
echo "   - Редактировать и удалять заказы"
