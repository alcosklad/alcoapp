# Наш Склад (AlcoApp)

Веб-приложение для учёта товаров, приёмок, продаж и смен. React + Vite + TailwindCSS + PocketBase.

## Установка и запуск

1. Скопируйте `.env.example` в `.env` и настройте URL PocketBase:
```bash
cp .env.example .env
```

2. Установите зависимости:
```bash
npm install
```

3. Запустите сервер разработки:
```bash
npm run dev
```

4. Сборка для продакшена:
```bash
npm run build
```

## Переменные окружения

| Переменная | Описание | Пример |
|---|---|---|
| `VITE_POCKETBASE_URL` | URL PocketBase сервера | `http://146.103.121.96:8090` |

## Деплой

Приложение деплоится через GitHub: `git push` → GitHub → сервер автоматически подтягивает изменения.

## Роли пользователей

| Роль | Описание | Доступ |
|---|---|---|
| `admin` | Администратор | Все разделы: дашборд, приёмки, остатки, прайс-лист |
| `operator` | Оператор | Дашборд, остатки, прайс-лист (desktop) |
| `worker` | Сотрудник | Остатки, смены, история продаж (mobile) |

## Коллекции PocketBase

| Коллекция | Описание | Ключевые поля |
|---|---|---|
| `users` | Пользователи | `name`, `email`, `role`, `supplier`, `timezone` |
| `suppliers` | Города/поставщики | `name` |
| `warehouses` | Склады/магазины | `name` |
| `products` | Товары | `name`, `article`, `category`, `price`, `volume` |
| `stocks` | Остатки на складе | `product`, `supplier`, `warehouse`, `quantity`, `cost` |
| `receptions` | Приёмки товаров | `supplier`, `warehouse`, `items[]`, `date`, `total_amount`, `total_sale` |
| `orders` | Заказы | `user`, `items[]`, `subtotal`, `discount`, `total`, `payment_method`, `local_time` |
| `sales` | Продажи | `user`, `product`, `quantity`, `price`, `total`, `supplier` |
| `shifts` | Смены | `user`, `start`, `end`, `status`, `totalAmount`, `totalItems`, `sales[]` |
| `documents` | Документы (legacy) | - |
| `document_items` | Позиции документов (legacy) | `document`, `product` |
| `stores` | Магазины | `name` |

### Рекомендуемые индексы

- `stocks`: составной индекс на `(product, supplier)`
- `stocks`: индекс на `supplier`
- `orders`: индекс на `user`
- `shifts`: составной индекс на `(user, status)`
- `sales`: индекс на `created`
- `receptions`: индекс на `supplier`

### Рекомендуемые API Rules

- **products**: List/View — `@request.auth.id != ""`, Create/Update/Delete — `@request.auth.role = "admin"`
- **stocks**: List/View — `@request.auth.id != ""`, Create/Update/Delete — `@request.auth.role = "admin" || @request.auth.role = "worker"`
- **receptions**: List/View/Create/Update/Delete — `@request.auth.role = "admin"`
- **orders**: List/View — `user = @request.auth.id || @request.auth.role = "admin"`, Create — `@request.auth.id != ""`
- **sales**: List/View — `@request.auth.role = "admin" || @request.auth.role = "operator"`, Create — `@request.auth.id != ""`
- **shifts**: List/View — `user = @request.auth.id`, Create/Update — `@request.auth.id != ""`

## Технологии

- **React 18** + Vite
- **TailwindCSS** для стилей
- **PocketBase** как бэкенд
- **Lucide React** для иконок
- **date-fns** для работы с датами
