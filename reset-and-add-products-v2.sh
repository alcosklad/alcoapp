#!/bin/bash

echo "🗑️ ОЧИСТКА И ДОБАВЛЕНИЕ ДАННЫХ v2"
echo "================================="

# API URL
API_URL="http://localhost:8090/api"

# Проверяем подключение
echo "🔍 Проверяем подключение к PocketBase..."
curl -s "$API_URL/api/health" > /dev/null
if [ $? -ne 0 ]; then
    echo "❌ PocketBase недоступен!"
    exit 1
fi

# 1. Проверяем и создаем склад если нужно
echo "📦 Проверяем склады..."
WAREHOUSE_COUNT=$(curl -s "$API_URL/collections/warehouses/records" | jq '.totalItems')
if [ "$WAREHOUSE_COUNT" -eq 0 ]; then
    echo "➕ Создаем склад..."
    WAREHOUSE_ID=$(curl -s -X POST "$API_URL/collections/warehouses/records" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Основной склад",
        "address": "г. Москва",
        "active": true
      }' | jq -r '.id')
else
    WAREHOUSE_ID=$(curl -s "$API_URL/collections/warehouses/records" | jq -r '.items[0].id')
fi
echo "Склад ID: $WAREHOUSE_ID"

# 2. Проверяем и создаем поставщика если нужно
echo "🚚 Проверяем поставщиков..."
SUPPLIER_COUNT=$(curl -s "$API_URL/collections/suppliers/records" | jq '.totalItems')
if [ "$SUPPLIER_COUNT" -eq 0 ]; then
    echo "➕ Создаем поставщика..."
    SUPPLIER_ID=$(curl -s -X POST "$API_URL/collections/suppliers/records" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Основной поставщик",
        "contact": "Менеджер",
        "phone": "+7(999)123-45-67"
      }' | jq -r '.id')
else
    SUPPLIER_ID=$(curl -s "$API_URL/collections/suppliers/records" | jq -r '.items[0].id')
fi
echo "Поставщик ID: $SUPPLIER_ID"

# 3. Удаляем все старые данные
echo ""
echo "🗑️ Удаляем старые данные..."

# Удаляем остатки
STOCKS=$(curl -s "$API_URL/collections/stocks/records?perPage=1000" | jq -r '.items[].id')
if [ "$STOCKS" != "null" ]; then
    for stock_id in $STOCKS; do
        curl -s -X DELETE "$API_URL/collections/stocks/records/$stock_id"
        echo "  ✅ Удален остаток: $stock_id"
    done
fi

# Удаляем приемки
RECEPTIONS=$(curl -s "$API_URL/collections/receptions/records?perPage=1000" | jq -r '.items[].id')
if [ "$RECEPTIONS" != "null" ]; then
    for reception_id in $RECEPTIONS; do
        curl -s -X DELETE "$API_URL/collections/receptions/records/$reception_id"
        echo "  ✅ Удалена приемка: $reception_id"
    done
fi

# Удаляем старые товары
PRODUCTS=$(curl -s "$API_URL/collections/products/records?perPage=1000" | jq -r '.items[].id')
if [ "$PRODUCTS" != "null" ]; then
    for product_id in $PRODUCTS; do
        curl -s -X DELETE "$API_URL/collections/products/records/$product_id"
        echo "  ✅ Удален товар: $product_id"
    done
fi

# 4. Добавляем новые товары
echo ""
echo "🍷 Добавляем новые товары..."

# Вино
echo "  🍷 Добавляем вино..."
WINE_RESULT=$(curl -s -X POST "$API_URL/collections/products/records" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Вино Тенглд Три Пино Гриджио белое сухое 0,75л",
    "cost": 1200,
    "price": 1800,
    "quantity": 100
  }')
WINE_ID=$(echo "$WINE_RESULT" | jq -r '.id')
echo "    ID: $WINE_ID"

# Текила
echo "  🥃 Добавляем текилу..."
TEQUILA_RESULT=$(curl -s -X POST "$API_URL/collections/products/records" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Текила Хосе Куэрво Эспесиаль Репосадо 38% 0,7л",
    "cost": 2500,
    "price": 3500,
    "quantity": 50
  }')
TEQUILA_ID=$(echo "$TEQUILA_RESULT" | jq -r '.id')
echo "    ID: $TEQUILA_ID"

# Вермут
echo "  🍾 Добавляем вермут..."
VERMOUTH_RESULT=$(curl -s -X POST "$API_URL/collections/products/records" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Вермут ЧИНЗАНО БЬЯНКО 15% БЕЛ. СЛ. 1Л",
    "cost": 800,
    "price": 1200,
    "quantity": 75
  }')
VERMOUTH_ID=$(echo "$VERMOUTH_RESULT" | jq -r '.id')
echo "    ID: $VERMOUTH_ID"

# 5. Создаем остатки
echo ""
echo "📊 Создаем остатки на складе..."

# Остаток вина
echo "  📊 Остатки вина..."
STOCK1_RESULT=$(curl -s -X POST "$API_URL/collections/stocks/records" \
  -H "Content-Type: application/json" \
  -d "{
    \"product\": \"$WINE_ID\",
    \"warehouse\": \"$WAREHOUSE_ID\",
    \"supplier\": \"$SUPPLIER_ID\",
    \"quantity\": 100,
    \"price\": 1800
  }")
echo "    Результат: $(echo "$STOCK1_RESULT" | jq -r '.id // "Ошибка"')"

# Остаток текилы
echo "  📊 Остатки текилы..."
STOCK2_RESULT=$(curl -s -X POST "$API_URL/collections/stocks/records" \
  -H "Content-Type: application/json" \
  -d "{
    \"product\": \"$TEQUILA_ID\",
    \"warehouse\": \"$WAREHOUSE_ID\",
    \"supplier\": \"$SUPPLIER_ID\",
    \"quantity\": 50,
    \"price\": 3500
  }")
echo "    Результат: $(echo "$STOCK2_RESULT" | jq -r '.id // "Ошибка"')"

# Остаток вермута
echo "  📊 Остатки вермута..."
STOCK3_RESULT=$(curl -s -X POST "$API_URL/collections/stocks/records" \
  -H "Content-Type: application/json" \
  -d "{
    \"product\": \"$VERMOUTH_ID\",
    \"warehouse\": \"$WAREHOUSE_ID\",
    \"supplier\": \"$SUPPLIER_ID\",
    \"quantity\": 75,
    \"price\": 1200
  }")
echo "    Результат: $(echo "$STOCK3_RESULT" | jq -r '.id // "Ошибка"')"

# 6. Проверяем результат
echo ""
echo "✅ ПРОВЕРКА РЕЗУЛЬТАТА:"
echo "======================="

echo "🍷 Товары в базе:"
curl -s "$API_URL/collections/products/records" | jq -r '.items[] | "  - \(.name) (ID: \(.id))"'

echo ""
echo "📊 Остатки на складе:"
curl -s "$API_URL/collections/stocks/records?expand=product" | jq -r '.items[] | "  - \(.expand.product.name) - \(.quantity) шт."'

echo ""
echo "🎉 ГОТОВО! Обновите приложение!"
