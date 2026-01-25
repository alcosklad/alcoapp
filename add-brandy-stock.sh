#!/bin/bash

echo "📦 Создаем остатки для новых товаров"

# Получаем admin токен
ADMIN_TOKEN=$(curl -s -X POST http://localhost:8090/api/admins/auth-with-password -H "Content-Type: application/json" -d '{"identity": "admin@alcoapp.ru", "password": "admin123"}' | jq -r '.token')

# ID склада Уфа (Бристоль)
WAREHOUSE_ID="nbi0vuc9y8q42go"

# ID поставщика Уфа
SUPPLIER_ID="izl0ujjh2gsde42"

# ID товаров
COGNAC_ID="1a4mt5bjmm8ovru"  # Коньяк Кочари
BRANDY_ID="ojn4fzimseoowml"  # Бренди Делор

# Создаем остаток для Коньяка Кочари (10 шт)
echo "➕ Создаем остаток для Коньяка Кочари 5 лет (10 шт)..."
curl -X POST "http://localhost:8090/api/collections/stocks/records" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product": "'$COGNAC_ID'",
    "warehouse": "'$WAREHOUSE_ID'",
    "supplier": "'$SUPPLIER_ID'",
    "quantity": 10,
    "purchase_price": 820
  }' | jq '.'

# Создаем остаток для Бренди Делор (5 шт)
echo "➕ Создаем остаток для Бренди Делор Фрер V.S.O.P (5 шт)..."
curl -X POST "http://localhost:8090/api/collections/stocks/records" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product": "'$BRANDY_ID'",
    "warehouse": "'$WAREHOUSE_ID'",
    "supplier": "'$SUPPLIER_ID'",
    "quantity": 5,
    "purchase_price": 2600
  }' | jq '.'

echo ""
echo "✅ Остатки созданы!"
echo ""
echo "🥃 Товары добавлены на склад:"
echo "   - Коньяк Кочари 5 лет: 10 шт по 1 620 ₽"
echo "   - Бренди Делор Фрер V.S.O.P: 5 шт по 4 999 ₽"
