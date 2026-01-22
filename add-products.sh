#!/bin/bash

echo "🛒 Добавляем товары в прайс-лист"

# Получаем токен
TOKEN=$(curl -s -X POST http://localhost:8090/api/collections/users/auth-with-password -H "Content-Type: application/json" -d '{"identity": "admin@alcoapp.ru", "password": "admin123"}' | jq -r '.token')

# Массив товаров
cat << 'EOF' > products.json
[
  {
    "name": "Вино Ла Форшетьер Совиньон Блан белое сухое 0.75л",
    "article": "V001",
    "price": 2199,
    "purchase_price": 1000,
    "category": "вино белое"
  },
  {
    "name": "Вино Ультимо Бастион Бобаль Гарнача Крианца красное сухое 0.75л",
    "article": "V002",
    "price": 1999,
    "purchase_price": 800,
    "category": "вино красное"
  },
  {
    "name": "Водка Чистые Росы 0.7л",
    "article": "V003",
    "price": 3310,
    "purchase_price": 1840,
    "category": "водка"
  },
  {
    "name": "Виски Вильям Лоусонс 0.5л",
    "article": "W001",
    "price": 2080,
    "purchase_price": 1020,
    "category": "виски"
  },
  {
    "name": "Коньяк Старейшина 7 лет 0.5л",
    "article": "C001",
    "price": 2080,
    "purchase_price": 1080,
    "category": "коньяк"
  },
  {
    "name": "Ром Мама Джама Блэк выдержанный 0,7л",
    "article": "R001",
    "price": 1620,
    "purchase_price": 700,
    "category": "ром"
  },
  {
    "name": "Ликер Бейлис Ориджинал 0.7л",
    "article": "L001",
    "price": 3999,
    "purchase_price": 2240,
    "category": "ликер"
  },
  {
    "name": "Вино игристое Шато Тамань Сюр Ли белое экстра брют 0,75л",
    "article": "V004",
    "price": 1499,
    "purchase_price": 590,
    "category": "вино игристое"
  },
  {
    "name": "Вермут Мартини Фиеро сладкий 0.5л",
    "article": "V005",
    "price": 1770,
    "purchase_price": 800,
    "category": "вермут"
  },
  {
    "name": "Пиво Рижское светлое ПЭТ 1.3л",
    "article": "P001",
    "price": 359,
    "purchase_price": 120,
    "category": "пиво"
  },
  {
    "name": "Минеральная вода Ессентуки Целебная газированная ст 0.5л",
    "article": "W001",
    "price": 129,
    "purchase_price": 40,
    "category": "вода"
  }
]
EOF

# Добавляем товары
echo "📦 Добавляем товары..."
for i in {0..10}; do
  PRODUCT=$(cat products.json | jq ".[$i]")
  NAME=$(echo "$PRODUCT" | jq -r '.name')
  
  echo "➕ Добавляем: $NAME"
  
  curl -X POST "http://localhost:8090/api/collections/products/records" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PRODUCT" | jq '.id'
done

echo ""
echo "✅ Все товары добавлены!"
