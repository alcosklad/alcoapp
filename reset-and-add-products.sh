#!/bin/bash

echo "🗑️ ОЧИСТКА И ДОБАВЛЕНИЕ ДАННЫХ"
echo "==============================="

# API URL
API_URL="http://localhost:8090/api"

# 1. Получаем ID всех записей
echo "📋 Получаем список всех остатков..."
STOCKS=$(curl -s "$API_URL/collections/stocks/records?perPage=1000" | jq -r '.items[].id')

echo "📋 Получаем список всех приемок..."
RECEPTIONS=$(curl -s "$API_URL/collections/receptions/records?perPage=1000" | jq -r '.items[].id')

# 2. Удаляем все остатки
echo "🗑️ Удаляем остатки..."
for stock_id in $STOCKS; do
    curl -s -X DELETE "$API_URL/collections/stocks/records/$stock_id"
    echo " Удален остаток: $stock_id"
done

# 3. Удаляем все приемки
echo "🗑️ Удаляем приемки..."
for reception_id in $RECEPTIONS; do
    curl -s -X DELETE "$API_URL/collections/receptions/records/$reception_id"
    echo " Удалена приемка: $reception_id"
done

# 4. Получаем ID товаров (если нужно создать новые)
echo "🍷 Добавляем товары..."

# Вино Тенглд Три Пино Гриджио
WINE_ID=$(curl -s -X POST "$API_URL/collections/products/records" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Вино Тенглд Три Пино Гриджио белое сухое 0,75л",
    "cost": 1200,
    "price": 1800,
    "quantity": 100
  }' | jq -r '.id')

# Текила Хосе Куэрво
TEQUILA_ID=$(curl -s -X POST "$API_URL/collections/products/records" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Текила Хосе Куэрво Эспесиаль Репосадо 38% 0,7л",
    "cost": 2500,
    "price": 3500,
    "quantity": 50
  }' | jq -r '.id')

# Вермут ЧИНЗАНО
VERMOUTH_ID=$(curl -s -X POST "$API_URL/collections/products/records" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Вермут ЧИНЗАНО БЬЯНКО 15% БЕЛ. СЛ. 1Л",
    "cost": 800,
    "price": 1200,
    "quantity": 75
  }' | jq -r '.id')

# 5. Получаем ID складов и поставщиков
echo "📦 Получаем ID складов и поставщиков..."
WAREHOUSE_ID=$(curl -s "$API_URL/collections/warehouses/records?perPage=1" | jq -r '.items[0].id')
SUPPLIER_ID=$(curl -s "$API_URL/collections/suppliers/records?perPage=1" | jq -r '.items[0].id')

# 6. Создаем остатки для каждого товара
echo "📊 Создаем остатки..."

# Остатки вина
curl -s -X POST "$API_URL/collections/stocks/records" \
  -H "Content-Type: application/json" \
  -d "{
    \"product\": \"$WINE_ID\",
    \"warehouse\": \"$WAREHOUSE_ID\",
    \"supplier\": \"$SUPPLIER_ID\",
    \"quantity\": 100,
    \"price\": 1800
  }"

# Остатки текилы
curl -s -X POST "$API_URL/collections/stocks/records" \
  -H "Content-Type: application/json" \
  -d "{
    \"product\": \"$TEQUILA_ID\",
    \"warehouse\": \"$WAREHOUSE_ID\",
    \"supplier\": \"$SUPPLIER_ID\",
    \"quantity\": 50,
    \"price\": 3500
  }"

# Остатки вермута
curl -s -X POST "$API_URL/collections/stocks/records" \
  -H "Content-Type: application/json" \
  -d "{
    \"product\": \"$VERMOUTH_ID\",
    \"warehouse\": \"$WAREHOUSE_ID\",
    \"supplier\": \"$SUPPLIER_ID\",
    \"quantity\": 75,
    \"price\": 1200
  }"

echo ""
echo "✅ ГОТОВО!"
echo "=========="
echo "🍷 Вино Тенглд - закуп: 1200₽, продажа: 1800₽"
echo "🥃 Текила Куэрво - закуп: 2500₽, продажа: 3500₽"
echo "🍾 Вермут Чинзано - закуп: 800₽, продажа: 1200₽"
echo ""
echo "📱 Обновите приложение для просмотра!"
