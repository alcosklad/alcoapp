#!/bin/bash

echo "🔍 ДИАГНОСТИКА СЕРВЕРА И POCKETBASE"
echo "=================================="

# 1. Проверяем что PocketBase запущен
echo "1. Проверяем процесс PocketBase:"
ps aux | grep pocketbase | grep -v grep

echo -e "\n2. Проверяем порт 8090:"
netstat -tlnp | grep 8090

echo -e "\n3. Проверяем локальный доступ к PocketBase:"
curl -s http://localhost:8090/api/health

echo -e "\n\n4. Проверяем внешние адреса:"
echo "Локальный IP:"
hostname -I

echo -e "\n5. Проверяем коллекции:"
curl -s http://localhost:8090/api/collections | jq '.[] | .name'

echo -e "\n6. Пробуем получить warehouses:"
curl -s http://localhost:8090/api/collections/warehouses/records

echo -e "\n\n7. Проверяем файрвол:"
ufw status | grep 8090

echo -e "\n✅ ДИАГНОСТИКА ЗАВЕРШЕНА!"
