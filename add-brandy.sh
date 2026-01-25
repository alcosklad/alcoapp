#!/bin/bash

echo "🥃 Добавляем коньяк и бренди в PocketBase"

# Получаем admin токен
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8090/api/admins/auth-with-password -H "Content-Type: application/json" -d '{"identity": "admin@alcoapp.ru", "password": "admin123"}' | jq -r '.token')

# ID поставщика Уфа
SUPPLIER_ID="izl0ujjh2gsde42"

# Добавляем Коньяк Кочари 5 лет
echo "➕ Добавляем Коньяк Кочари 5 лет 0.5л..."
curl -X POST "http://localhost:8090/api/collections/products/records" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Коньяк Кочари 5 лет 0.5л",
    "article": "K005",
    "price": 1620,
    "cost": 820,
    "category": "Коньяк"
  }' | jq '.'

# Добавляем Бренди Делор Фрер V.S.O.P
echo "➕ Добавляем Бренди Делор Фрер V.S.O.P п/к 0.7л..."
curl -X POST "http://localhost:8090/api/collections/products/records" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Бренди Делор Фрер V.S.O.P п/к 0.7л",
    "article": "B001",
    "price": 4999,
    "cost": 2600,
    "category": "Бренди"
  }' | jq '.'

echo ""
echo "✅ Товары добавлены!"
echo ""
echo "📦 Теперь нужно создать остатки на складе для этих товаров"
