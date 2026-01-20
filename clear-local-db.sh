#!/bin/bash

echo "🧹 ОЧИСТКА БАЗЫ ДАННЫХ"
echo "====================="

# Получаем токен
TOKEN=$(curl -s -X POST http://localhost:8090/api/collections/users/auth-with-password -H "Content-Type: application/json" -d '{"identity": "admin@alcoapp.ru", "password": "admin123"}' | jq -r '.token')

# Получаем все ID приемок
RECEPTION_IDS=$(curl -s "http://localhost:8090/api/collections/receptions/records" -H "Authorization: Bearer $TOKEN" | jq -r '.items[].id')

# Удаляем приемки
for id in $RECEPTION_IDS; do
  echo "Удаляю приемку: $id"
  curl -X DELETE "http://localhost:8090/api/collections/receptions/records/$id" -H "Authorization: Bearer $TOKEN" > /dev/null
done

# Получаем все ID остатков
STOCK_IDS=$(curl -s "http://localhost:8090/api/collections/stocks/records" -H "Authorization: Bearer $TOKEN" | jq -r '.items[].id')

# Удаляем остатки
for id in $STOCK_IDS; do
  echo "Удаляю остаток: $id"
  curl -X DELETE "http://localhost:8090/api/collections/stocks/records/$id" -H "Authorization: Bearer $TOKEN" > /dev/null
done

echo "✅ База очищена!"
