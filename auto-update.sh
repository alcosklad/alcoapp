#!/bin/bash

# Скрипт автообновления AlcoApp
LOG="/var/log/alcoapp-update.log"

# Блокировка чтобы не запускалось дважды
exec 200>/tmp/alcoapp.lock || exit 1
flock -n 200 || exit 1

# Переходим в папку проекта
cd /var/www/alcoapp || exit 1

# Записываем всё в лог
exec >> "$LOG" 2>&1

echo "$(date): Проверяем обновления..."

# Получаем текущую и удаленную версию
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
  echo "$(date): Найдены обновления, устанавливаем..."
  git pull origin main && ./setup-production.sh
  echo "$(date): Обновление завершено!"
else
  echo "$(date): Обновлений нет"
fi
