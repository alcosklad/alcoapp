#!/bin/bash

echo "🔧 Исправляем остатки для Уфы"

# Получаем токен
TOKEN=$(curl -s -X POST http://localhost:8090/api/collections/users/auth-with-password -H "Content-Type: application/json" -d '{"identity": "admin@alcoapp.ru", "password": "admin123"}' | jq -r '.token')

# Получаем последнюю приемку
RECEPTION=$(curl -s "http://localhost:8090/api/collections/receptions/records?filter=supplier='izl0ujjh2gsde42'&sort=-created" -H "Authorization: Bearer $TOKEN" | jq '.items[0]')

echo "📦 Данные приемки:"
echo "$RECEPTION" | jq '{id, supplier, warehouse, items}'

# Получаем warehouse и supplier
WAREHOUSE=$(echo "$RECEPTION" | jq -r '.warehouse')
SUPPLIER=$(echo "$RECEPTION" | jq -r '.supplier')

echo ""
echo "🏭 Склад: $WAREHOUSE"
echo "🏢 Поставщик: $SUPPLIER"

# Создаем остатки
echo "$RECEPTION" | jq -r '.items[] | @base64' | while read -r item; do
  ITEM=$(echo "$item" | base64 -d)
  PRODUCT=$(echo "$ITEM" | jq -r '.product')
  QUANTITY=$(echo "$ITEM" | jq -r '.quantity')
  COST=$(echo "$ITEM" | jq -r '.cost')
  
  echo ""
  echo "➕ Создаем остаток: продукт=$PRODUCT, количество=$QUANTITY, цена закупа=$COST"
  
  curl -X POST "http://localhost:8090/api/collections/stocks/records" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"product\": \"$PRODUCT\",
      \"warehouse\": \"$WAREHOUSE\",
      \"supplier\": \"$SUPPLIER\",
      \"quantity\": $QUANTITY,
      \"purchase_price\": $COST
    }" | jq '.id'
done

echo ""
echo "✅ Остатки созданы!"
