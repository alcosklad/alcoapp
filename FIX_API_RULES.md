# 🚨 СРОЧНО: Исправление ошибок

## Проблемы в консоли:
1. ❌ Error 403: "Only admins can perform this action" 
2. ❌ HMR Failed to reload ReceptionCreate.jsx

## Причина:
- ❌ Нет публичного доступа к коллекциям
- ❌ Коллекция users не создана или нет API Rules

## 🎯 РЕШЕНИЕ (3 минуты):

### 1. Откройте админ-панель:
http://192.168.1.4:8090/_/
Логин: admin@example.com
Пароль: admin123456

### 2. Исправьте API Rules для ВСЕХ коллекций:

**Для коллекции receptions:**
1. Collections → receptions → API Rules
2. List rule: **Public**
3. Save changes

**Для коллекции stocks:**
1. Collections → stocks → API Rules  
2. List rule: **Public**
3. Save changes

**Для коллекции users:**
1. Collections → users → API Rules
2. List rule: **Public**
3. Save changes

**Для коллекции suppliers:**
1. Collections → suppliers → API Rules
2. List rule: **Public**
3. Save changes

**Для коллекции warehouses:**
1. Collections → warehouses → API Rules
2. List rule: **Public**
3. Save changes

**Для коллекции products:**
1. Collections → products → API Rules
2. List rule: **Public**
3. Save changes

### 3. Проверьте коллекцию users:
Если ее нет - создайте:
1. New Collection → Name: `users`
2. Add fields:
   - `name` → Text
   - `email` → Email (unique)
   - `password` → Password
3. API Rules → List rule: **Public**
4. Create

### 4. Обновите страницу:
Нажмите **F5** для полной перезагрузки

## ✅ После этого:
- ✅ Ошибки 403 исчезнут
- ✅ Select "Пользователь" появится
- ✅ Все будет работать

**Проблема 100% в API Rules! Исправьте их!**
