#!/bin/bash

echo "🔧 ИСПРАВЛЕНИЕ СВЯЗИ С POCKETBASE"
echo "================================="

# 1. Проверяем и открываем порт 8090
echo "1. Открываем порт 8090 в файрволе:"
ufw allow 8090/tcp
iptables -I INPUT -p tcp --dport 8090 -j ACCEPT

# 2. Проверяем конфиг PocketBase
echo -e "\n2. Проверяем где запущен PocketBase:"
ps aux | grep pocketbase | grep -v grep

# 3. Если PocketBase запущен не на 0.0.0.0, перезапускаем
if ! netstat -tlnp | grep ":8090" | grep "0.0.0.0"; then
    echo -e "\n3. Перезапускаем PocketBase с правильными параметрами:"
    systemctl restart pocketbase
    sleep 3
fi

# 4. Проверяем коллекции
echo -e "\n4. Проверяем доступные коллекции:"
COLLECTIONS=$(curl -s http://localhost:8090/api/collections | jq -r '.[] | .name')
echo "$COLLECTIONS"

# 5. Если нет warehouses, создаем
if ! echo "$COLLECTIONS" | grep -q "warehouses"; then
    echo -e "\n5. Создаем коллекцию warehouses:"
    curl -X POST "http://localhost:8090/api/collections" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "warehouses",
        "type": "base",
        "schema": [
          {"name": "name", "type": "text", "required": true},
          {"name": "address", "type": "text"},
          {"name": "active", "type": "bool", "options": {"default": true}}
        ]
      }'
fi

# 6. Если нет suppliers, создаем
if ! echo "$COLLECTIONS" | grep -q "suppliers"; then
    echo -e "\n6. Создаем коллекцию suppliers:"
    curl -X POST "http://localhost:8090/api/collections" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "suppliers",
        "type": "base",
        "schema": [
          {"name": "name", "type": "text", "required": true},
          {"name": "contact", "type": "text"},
          {"name": "phone", "type": "text"}
        ]
      }'
fi

# 7. Проверяем внешний доступ
echo -e "\n7. Проверяем внешний доступ:"
curl -s http://146.103.121.96:8090/api/health

echo -e "\n✅ ИСПРАВЛЕНИЕ ЗАВЕРШЕНО!"
