#!/bin/bash

echo "🔍 ТЕСТ SSH ПОДКЛЮЧЕНИЯ"
echo "========================="

echo "1. Проверяем формат приватного ключа..."
echo "Ключ должен начинаться с:"
echo "-----BEGIN OPENSSH PRIVATE KEY-----"
echo "или"
echo "-----BEGIN RSA PRIVATE KEY-----"
echo ""

echo "2. Тестовое подключение:"
echo "ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 root@146.103.121.96 'echo SSH работает!'"
echo ""

echo "3. Если не работает, проверьте логи:"
echo "ssh -v root@146.103.121.96"
echo ""

echo "4. Права на сервере:"
echo "ssh root@146.103.121.96 'ls -la ~/.ssh/'"
echo "ssh root@146.103.121.96 'cat ~/.ssh/authorized_keys'"
