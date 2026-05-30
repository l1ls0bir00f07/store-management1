# 🏪 Store Management System

## Локальный запуск (VS Code)

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev        # http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm install
npm start          # http://localhost:3000
```

Логин: **admin** / **admin123**

---

## Деплой на Railway (один раз)

### Шаг 1 — Загрузи код на GitHub
1. Зайди на [github.com](https://github.com) → New repository
2. Назови `store-management` → Create
3. Загрузи все файлы проекта (кнопка **uploading an existing file**)

### Шаг 2 — Задеплой на Railway
1. Зайди на [railway.app](https://railway.app) → **Start a New Project**
2. Выбери **Deploy from GitHub repo**
3. Авторизуй GitHub и выбери репозиторий `store-management`
4. Railway автоматически найдёт `railway.json` и всё сделает сам

### Шаг 3 — Persistent Volume (чтобы данные не терялись)
1. В Railway → твой проект → **+ New** → **Volume**
2. Mount path: `/data`
3. В настройках сервиса → **Variables** → добавь:
   ```
   DATA_DIR=/data
   ```

### Шаг 4 — Получи ссылку
Railway даст ссылку вида `https://store-management-xxx.up.railway.app`

### Шаг 5 — На телефоне
1. Открой ссылку в браузере
2. Нажми **«Добавить на главный экран»** (Share → Add to Home Screen на iPhone, или меню браузера на Android)
3. Иконка появится как приложение 🎉

---

## Стек
- Frontend: React 18, Recharts, React Router
- Backend: Node.js, Express, sql.js (SQLite)
