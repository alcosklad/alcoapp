#!/bin/bash

echo "🔧 ИСПРАВЛЕНИЕ ПОЛЯ STATUS В RECEPTIONS"
echo "======================================"

# API URL
API_URL="http://localhost:8090/api"

# 1. Проверяем текущую структуру коллекции receptions
echo "📋 Проверяем структуру коллекции receptions..."
curl -s "$API_URL/collections/receptions" | jq '.schema[] | select(.name=="status")'

echo -e "\n"

# 2. Обновляем коллекцию - исправляем поле status
echo "🔧 Обновляем коллекцию receptions..."
curl -X PATCH "$API_URL/collections/receptions" \
  -H "Content-Type: application/json" \
  -d '{
    "schema": [
      {"name": "supplier", "type": "relation", "required": true, "options": {"collectionId": "suppliers", "maxSelect": 1}},
      {"name": "warehouse", "type": "relation", "required": true, "options": {"collectionId": "warehouses", "maxSelect": 1}},
      {"name": "date", "type": "date", "required": true},
      {"name": "status", "type": "select", "required": true, "options": {"values": ["draft", "active", "completed"], "default": "draft"}},
      {"name": "items", "type": "json", "required": true},
      {"name": "totalAmount", "type": "number", "required": false},
      {"name": "comment", "type": "text", "required": false}
    ]
  }'

echo -e "\n✅ ГОТОВО! Попробуйте создать приемку снова."
