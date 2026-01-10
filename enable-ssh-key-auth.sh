#!/bin/bash

echo "🔧 ВКЛЮЧЕНИЕ SSH АУТЕНТИФИКАЦИИ ПО КЛЮЧУ"
echo "======================================"

echo "1. Раскомментируем строки в sshd_config..."
sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/#AuthorizedKeysFile\t.ssh\/authorized_keys .ssh\/authorized_keys2/AuthorizedKeysFile .ssh\/authorized_keys .ssh\/authorized_keys2/' /etc/ssh/sshd_config

echo "2. Проверяем что изменилось..."
echo "PubkeyAuthentication:"
grep PubkeyAuthentication /etc/ssh/sshd_config
echo "AuthorizedKeysFile:"
grep AuthorizedKeysFile /etc/ssh/sshd_config

echo "3. Перезапускаем SSH..."
systemctl restart sshd

echo "4. Проверяем статус..."
systemctl status sshd --no-pager -l

echo ""
echo "✅ ГОТОВО! SSH аутентификация по ключу включена!"
echo "Теперь GitHub Actions должен подключиться!"
