#!/bin/bash

echo "🔧 ДОБАВЛЯЕМ ПОЛЕ ROLE В POCKETBASE"
echo "====================================="

# Проверяем что PocketBase запущен
curl -s http://localhost:8090/api/health > /dev/null || {
  echo "❌ PocketBase не запущен!"
  echo "Сначала запустите: ./pocketbase serve"
  exit 1
}

echo "✅ PocketBase запущен"

# Создаем файл с данными для импорта
cat > update-users.json << 'EOF'
{
  "collections": [
    {
      "name": "users",
      "type": "auth",
      "schema": [
        {
          "name": "role",
          "type": "select",
          "required": true,
          "options": {
            "values": ["admin", "operator", "worker"]
          },
          "default": "worker"
        }
      ]
    }
  ]
}
EOF

echo ""
echo "⚠️  ПОЛЕ role НЕВОЗМОЖНО добавить через API!"
echo ""
echo "Нужно сделать вручную:"
echo "1. Откройте http://localhost:8090/_/"
echo "2. Войдите с паролем 123456789"
echo "3. Collections → users → Edit (карандаш)"
echo "4. Create new field:"
echo "   - Name: role"
echo "   - Type: Select"
echo "   - Values: admin, operator, worker"
echo "   - Required: ✅"
echo "   - Default: worker"
echo "5. Save"
echo ""
echo "6. Затем обновите пользователей:"
echo "   - Оператору: role = operator"
echo "   - Админу: role = admin"
