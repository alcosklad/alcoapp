# 🎯 ТОЧНАЯ ИНСТРУКЦИЯ по созданию коллекций

## 1️⃣ Коллекция "receptions"

1. **New Collection** → Name: `receptions` → Create
2. **Add fields:**
   - `supplier` → Relation → suppliers
   - `warehouse` → Relation → warehouses  
   - `date` → Date
   - `status` → Select → Values: `draft,done`
   - `items` → JSON
   - `total_amount` → Number
3. **API Rules** → List rule: **Public** → Save

## 2️⃣ Коллекция "stocks"

1. **New Collection** → Name: `stocks` → Create
2. **Add fields:**
   - `product` → Relation → products
   - `warehouse` → Relation → warehouses
   - `quantity` → Number → Default: `0`
3. **API Rules** → List rule: **Public** → Save

## 3️⃣ Проверка

1. Обнови приложение (F5)
2. Приемка → Создать приемку → Выбрать товары → Сохранить

❗ **ВАЖНО:** Названия полей должны быть ТОЧНО как указано!
❗ **total_amount** (с подчеркиванием, не totalAmount)
