# 🚨 СРОЧНО: Нужно создать коллекции в PocketBase

## 1. Откройте админ-панель:
http://192.168.1.4:8090/_/
Логин: admin@example.com
Пароль: admin123456

## 2. Создайте коллекцию "receptions":

1. Нажмите "New Collection"
2. Name: `receptions`
3. Fields:
   - `supplier` → Relation → suppliers
   - `warehouse` → Relation → warehouses  
   - `date` → Date
   - `status` → Select → values: `draft`,`done`
   - `items` → JSON
   - `total_amount` → Number
4. API Rules → Create → List rule: `Public`
5. Нажмите "Create"

## 3. Создайте коллекцию "stocks":

1. "New Collection"
2. Name: `stocks`
3. Fields:
   - `product` → Relation → products
   - `warehouse` → Relation → warehouses
   - `quantity` → Number (default: 0)
4. API Rules → Create → List rule: `Public`
5. Нажмите "Create"

## 4. После создания:
- Обновите страницу приложения
- Попробуйте создать приемку

✅ Все готово для работы!
