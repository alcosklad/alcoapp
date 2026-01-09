#!/bin/bash

echo "📦 ДОБАВЛЕНИЕ ТЕСТОВЫХ ДАННЫХ"
echo "============================="

# API URL
API_URL="http://localhost:8090/api"

# 1. Добавляем склады
echo "🏭 Добавляем склады..."
curl -X POST "$API_URL/collections/warehouses/records" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Основной склад",
    "address": "г. Москва, ул. Центральная, 1",
    "active": true
  }'

curl -X POST "$API_URL/collections/warehouses/records" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Склад 2",
    "address": "г. Санкт-Петербург, пр. Невский, 10",
    "active": true
  }'

echo -e "\n"

# 2. Добавляем поставщиков
echo "🚚 Добавляем поставщиков..."
curl -X POST "$API_URL/collections/suppliers/records" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Поставщик ООО",
    "contact": "Иван Петров",
    "phone": "+7(999)123-45-67"
  }'

curl -X POST "$API_URL/collections/suppliers/records" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Торговый Дом",
    "contact": "Мария Иванова",
    "phone": "+7(999)987-65-43"
  }'

echo -e "\n🎉 Данные добавлены!"
