#!/bin/bash

echo "🔧 СОЗДАНИЕ КОЛЛЕКЦИЙ В POCKETBASE"
echo "=================================="

# API URL
API_URL="http://localhost:8090/api"

# 1. Создаем коллекцию warehouses
echo "📦 Создаем коллекцию warehouses..."
curl -X POST "$API_URL/collections" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "warehouses",
    "type": "base",
    "schema": [
      {
        "name": "name",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 100
        }
      },
      {
        "name": "address",
        "type": "text",
        "required": false
      },
      {
        "name": "active",
        "type": "bool",
        "required": false,
        "options": {
          "default": true
        }
      }
    ]
  }'

echo -e "\n"

# 2. Создаем коллекцию suppliers если нет
echo "📦 Создаем коллекцию suppliers..."
curl -X POST "$API_URL/collections" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "suppliers",
    "type": "base",
    "schema": [
      {
        "name": "name",
        "type": "text",
        "required": true,
        "options": {
          "min": 1,
          "max": 100
        }
      },
      {
        "name": "contact",
        "type": "text",
        "required": false
      },
      {
        "name": "phone",
        "type": "text",
        "required": false
      }
    ]
  }'

echo -e "\n"

# 3. Проверяем что коллекции созданы
echo "✅ Проверяем коллекции..."
curl -X GET "$API_URL/collections" | jq '.[] | select(.name=="warehouses" or .name=="suppliers" or .name=="stocks" or .name=="products" or .name=="receptions")'

echo -e "\n🎉 ГОТОВО!"
