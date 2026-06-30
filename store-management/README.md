# 🏪 Store Management System

Полнофункциональная система управления магазином: инвентарь, продажи, отчёты.

## Стек
- **Backend:** Node.js + Express + SQLite (better-sqlite3)
- **Frontend:** React 18 + Recharts + React Router

---

## 🚀 Запуск проекта

### 1. Backend

Открой терминал в папке `backend`:

```bash
cd backend
npm install
npm run dev
```

Сервер запустится на **http://localhost:5000**
Ты должен увидеть в консоли: `🚀 Store API запущен на http://localhost:5000`

### 2. Frontend (открой ВТОРОЙ терминал, не закрывая первый)

```bash
cd frontend
npm install
npm start
```

Приложение откроется на **http://localhost:3000**

⚠️ **Важно:** backend и frontend должны работать ОДНОВРЕМЕННО, в двух разных терминалах. Если видишь ошибку `ERR_CONNECTION_REFUSED` на localhost:3000 — значит frontend не запущен (или ещё не успел запуститься, подожди 10-20 секунд после `npm start`).

---

## 🔑 Вход по умолчанию

| Логин | Пароль |
|-------|--------|
| `admin` | `admin123` |

---

## 📁 Структура проекта

```
store-management/
├── backend/
│   ├── app.js              # Точка входа Express
│   ├── package.json
│   ├── database/
│   │   └── db.js           # SQLite + схема + seed данные (создаёт store.db автоматически)
│   ├── middleware/
│   │   └── auth.js         # JWT middleware
│   ├── routes/
│   │   ├── auth.js         # /api/auth/*
│   │   ├── categories.js   # /api/categories/*
│   │   ├── products.js     # /api/products/*
│   │   ├── sales.js        # /api/sales/*
│   │   └── reports.js      # /api/reports/*
│   └── uploads/            # Фото товаров (создаётся автоматически)
│
└── frontend/
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js
        ├── index.css       # Дизайн-система (тёмная тема)
        ├── App.jsx          # Роутинг
        ├── pages/           # DashboardPage, InventoryPage, SalesPage, ReportsPage, LoginPage
        ├── components/common/  # Layout (сайдбар), Toast
        ├── context/         # AuthContext
        ├── hooks/           # useToast
        └── services/api.js  # Все обращения к backend API
```

---

## 📋 Функциональность

### Дашборд
- KPI карточки: товаров, продажи сегодня, прибыль, оборот месяца
- Графики за последние 7 дней (выручка и прибыль)
- Топ товаров дня
- Предупреждение о заканчивающихся товарах

### Товары (Inventory)
- Категории — CRUD операции
- Товары — CRUD с поиском и фильтрами
- Загрузка фото, SKU, цены закупки/продажи
- Расчёт маржи в форме
- Индикаторы остатков на складе

### Продажа (POS)
- Каталог товаров с фото
- Корзина с изменением количества
- Автоматический расчёт суммы и прибыли
- Блокировка продажи при нехватке товара
- История продаж с фильтром по датам
- Отмена продажи (возврат товаров на склад)

### Отчёты
- Быстрые пресеты: сегодня, 7 дней, 30 дней, месяц, год
- Группировка: по дням / месяцам / годам
- 4 графика: выручка (bar), прибыль (line), топ товаров (horizontal bar), доли (pie)
- Сводная таблица с маржой по периодам
- Средний чек и общая маржа за период

---

## API Endpoints

| Метод | URL | Описание |
|-------|-----|----------|
| POST | /api/auth/login | Вход |
| GET | /api/categories | Список категорий |
| GET | /api/products | Список товаров (фильтры: search, category_id, low_stock) |
| POST | /api/products | Создать товар (multipart/form-data) |
| PUT | /api/products/:id | Обновить товар |
| DELETE | /api/products/:id | Удалить товар |
| GET | /api/sales | История продаж (фильтры: from, to) |
| POST | /api/sales | Создать продажу |
| DELETE | /api/sales/:id | Отменить продажу |
| GET | /api/reports/dashboard | Данные для дашборда |
| GET | /api/reports/sales | Отчёт по продажам |
| GET | /api/reports/top-products | Топ товаров |

---

## 🐛 Частые проблемы

**`ERR_CONNECTION_REFUSED` на localhost:3000**
→ Frontend не запущен. Открой терминал в папке `frontend` и выполни `npm start`.

**Не удаётся войти / "Неверный логин или пароль"**
→ Backend не запущен, или не успел создать базу данных. Проверь, что в терминале backend видно сообщение `🚀 Store API запущен`.

**Ошибка `Cannot find module 'better-sqlite3'`**
→ Не установлены зависимости. В папке `backend` выполни `npm install`.

**Белый экран в браузере**
→ Проверь консоль браузера (F12 → Console) на ошибки. Убедись, что в `frontend/package.json` указан `"proxy": "http://localhost:5000"`.
