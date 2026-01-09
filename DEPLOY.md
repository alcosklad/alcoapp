# 🚀 Развертывание AlcoApp на сервере VDsina

## 1. Подключение к серверу
```bash
ssh root@146.103.121.96
# Пароль: 897He43u8+i8Ne-tq#6k
```

## 2. Скачивание и запуск скрипта
```bash
# Скачиваем скрипт развертывания
curl -fsSL https://raw.githubusercontent.com/alcosklad/alcoapp/main/auto-deploy.sh -o deploy.sh

# Делаем исполняемым
chmod +x deploy.sh

# Запускаем развертывание
./deploy.sh
```

## 3. Если скрипт не работает, выполняем вручную:

### Установка Node.js
```bash
apt update
apt install -y curl wget git unzip
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs
```

### Развертывание проекта
```bash
cd /var/www
git clone https://github.com/alcosklad/alcoapp.git
cd alcoapp
npm install
```

### Установка PocketBase
```bash
wget -q https://github.com/pocketbase/pocketbase/releases/download/v0.22.5/pocketbase_0.22.5_linux_amd64.zip
unzip -q pocketbase_0.22.5_linux_amd64.zip
rm pocketbase_0.22.5_linux_amd64.zip
chmod +x pocketbase
```

### Запуск в фоне
```bash
# PocketBase
nohup ./pocketbase serve --http=0.0.0.0:8090 > pocketbase.log 2>&1 &

# Приложение
nohup npm run dev -- --host 0.0.0.0 --port 5173 > app.log 2>&1 &
```

## 4. Проверка
```bash
# Проверяем процессы
ps aux | grep pocketbase
ps aux | grep node

# Проверяем порты
netstat -tlnp | grep 8090
netstat -tlnp | grep 5173
```

## 5. Доступ после развертывания
- Приложение: http://146.103.121.96:5173
- API: http://146.103.121.96:8090
- Админка: http://146.103.121.96:8090/_/

## 6. Логи
```bash
# Логи PocketBase
tail -f pocketbase.log

# Логи приложения
tail -f app.log
```
