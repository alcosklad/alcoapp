# 📋 Инструкция по созданию коллекций в PocketBase

## 🔧 Нужно создать 2 коллекции:

### 1. Коллекция "receptions" (Приемки)

1. Откройте http://192.168.1.4:8090/_/
2. Войдите: admin@example.com / admin123456
3. Нажмите "New Collection"
4. Name: `receptions`
5. Добавьте поля:
   - **supplier** (Relation → suppliers)
   - **warehouse** (Relation → warehouses)
   - **date** (Date)
   - **status** (Select → values: `draft`,`done`)
   - **items** (JSON)
   - **total_amount** (Number)
6. API Rules → Create → List rule: `Public`
7. Create

### 2. Коллекция "stocks" (Остатки)

1. "New Collection"
2. Name: `stocks`
3. Добавьте поля:
   - **product** (Relation → products)
   - **warehouse** (Relation → warehouses)
   - **quantity** (Number, default: 0)
4. API Rules → Create → List rule: `Public`
5. Create

## ✅ После создания:
- Коллекции готовы для работы
- Можно сохранять приемки
- Остатки будут обновляться автоматически
