# Обновление схемы базы данных PocketBase для FIFO системы

## ВАЖНО: Выполнить на сервере через админ-панель PocketBase

URL: http://146.103.121.96:8090/_/

---

## 1. Коллекция `stocks` (остатки)

### Добавить поля:

**reception_id** (Relation)
- Type: Relation
- Collection: receptions
- Single: true
- Required: false

**reception_date** (Date)
- Type: Date
- Required: false

**batch_number** (Text)
- Type: Text
- Max length: 100
- Required: false

**cost_per_unit** (Number)
- Type: Number
- Min: 0
- Required: false

---

## 2. Коллекция `orders` (продажи)

### Добавить поля:

**order_number** (Text)
- Type: Text
- Max length: 20
- Unique: true
- Required: false
- Pattern: ^[A-Z]\d{5}$

**city_code** (Text)
- Type: Text
- Max length: 1
- Required: false

**cost_total** (Number)
- Type: Number
- Min: 0
- Required: false
- Default: 0

**profit** (Number)
- Type: Number
- Required: false
- Default: 0

---

## 3. НОВАЯ коллекция `write_offs` (списания)

### Создать коллекцию с полями:

**product** (Relation)
- Type: Relation
- Collection: products
- Single: true
- Required: true

**supplier** (Relation)
- Type: Relation
- Collection: suppliers
- Single: true
- Required: true

**quantity** (Number)
- Type: Number
- Min: 1
- Required: true

**cost** (Number)
- Type: Number
- Min: 0
- Required: true

**reason** (Select)
- Type: Select
- Options: ["Испорчен", "Потерян", "Просрочен", "Брак", "Другое"]
- Required: true

**comment** (Text)
- Type: Text
- Max length: 500
- Required: false

**reception_id** (Relation)
- Type: Relation
- Collection: receptions
- Single: true
- Required: false

**reception_date** (Date)
- Type: Date
- Required: false

**batch_number** (Text)
- Type: Text
- Max length: 100
- Required: false

**user** (Relation)
- Type: Relation
- Collection: users
- Single: true
- Required: true

**writeoff_date** (DateTime)
- Type: DateTime
- Required: true

---

## 4. НОВАЯ коллекция `favorites` (избранное для приемок)

### Создать коллекцию с полями:

**product** (Relation)
- Type: Relation
- Collection: products
- Single: true
- Required: true
- Unique: true

**order** (Number)
- Type: Number
- Min: 0
- Required: true
- Default: 0

---

## 5. Коллекция `receptions` (приемки)

### Добавить поле:

**batch_number** (Text)
- Type: Text
- Max length: 100
- Required: false
- Unique: true

---

## 6. Индексы для производительности

### В коллекции `stocks`:
- Создать индекс на поле `reception_date` (для FIFO сортировки)
- Создать индекс на поле `batch_number` (для быстрого поиска партий)

### В коллекции `orders`:
- Создать индекс на поле `order_number` (для уникальности и поиска)
- Создать индекс на поле `city_code` (для фильтрации по городам)

---

## Порядок выполнения:

1. Зайти в админ-панель PocketBase
2. Создать новые коллекции: `write_offs`, `favorites`
3. Добавить поля в существующие коллекции: `stocks`, `orders`, `receptions`
4. Проверить, что все поля созданы корректно
5. Запустить тестовый запрос для проверки

---

## После добавления полей:

Запустить скрипт миграции данных (будет создан позже):
```bash
node migrate-to-fifo.mjs
```

Этот скрипт преобразует существующие остатки в партии с batch_number.
