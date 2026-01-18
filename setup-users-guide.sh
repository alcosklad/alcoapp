#!/bin/bash

echo "🔧 НАСТРОЙКА ПОЛЬЗОВАТЕЛЕЙ (ИНСТРУКЦИЯ)"
echo "====================================="

echo "📋 Чтобы добавить пользователей:"
echo ""
echo "1. Откройте админку PocketBase: http://localhost:8090/_/"
echo "2. Войдите под админом"
echo "3. Collections → New Collection"
echo "4. Создайте коллекцию 'users' с полями:"
echo "   - name: Text, Required"
echo "   - email: Email, Optional"
echo "   - role: Select, Optional, Values: admin,manager,employee"
echo "   - active: Bool, Default: true"
echo ""
echo "5. После создания коллекции, добавьте записи:"
echo "   - Администратор (admin)"
echo "   - Менеджер (manager)"
echo "   - Иван Петров (employee)"
echo "   - Мария Иванова (employee)"
echo ""
echo "🎯 Или используйте API с вашим токеном:"
echo "curl -X POST http://localhost:8090/api/collections/users/records \\"
echo "  -H 'Authorization: Bearer ВАШ_ТОКЕН'"
echo ""

# Также проверяем что коллекция уже существует
echo "🔍 Проверяем текущие коллекции..."
curl -s http://localhost:8090/api/collections | jq -r '.[] | .name' | grep users

echo ""
echo "✅ Инструкция готова!"
