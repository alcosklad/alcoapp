#!/bin/bash

echo "🔧 СОЗДАНИЕ ПОЛЬЗОВАТЕЛЕЙ В ЛОКАЛЬНОМ POCKETBASE"
echo "=================================================="

# API URL локального PocketBase
API_URL="http://localhost:8090/api"

# Проверяем что PocketBase запущен
echo "1. Проверяем PocketBase..."
curl -s "$API_URL/health" > /dev/null
if [ $? -ne 0 ]; then
  echo "❌ PocketBase не запущен! Сначала запустите: ./pocketbase serve"
  exit 1
fi
echo "✅ PocketBase запущен"

# Создаем администратора
echo ""
echo "2. Создаем администратора..."
ADMIN_RESULT=$(curl -s -X POST "$API_URL/collections/users/records" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@alcoapp.ru",
    "password": "admin123",
    "passwordConfirm": "admin123",
    "name": "Администратор",
    "role": "admin",
    "emailVisibility": true
  }')

if echo "$ADMIN_RESULT" | grep -q "email"; then
  echo "✅ Администратор создан"
else
  echo "⚠️ Администратор уже существует или ошибка"
fi

# Создаем оператора
echo ""
echo "3. Создаем оператора..."
OPERATOR_RESULT=$(curl -s -X POST "$API_URL/collections/users/records" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator@alcoapp.ru",
    "password": "operator123",
    "passwordConfirm": "operator123",
    "name": "Оператор",
    "role": "operator",
    "emailVisibility": true
  }')

if echo "$OPERATOR_RESULT" | grep -q "email"; then
  echo "✅ Оператор создан"
else
  echo "⚠️ Оператор уже существует или ошибка"
fi

echo ""
echo "✅ ГОТОВО! Пользователи созданы:"
echo "   Администратор: admin@alcoapp.ru / admin123"
echo "   Оператор: operator@alcoapp.ru / operator123"
echo ""
echo "Теперь можно войти в приложение!"
