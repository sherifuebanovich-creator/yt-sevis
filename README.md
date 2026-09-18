# YouTube Services Bot

Telegram-бот: заявки на создание YouTube-канала и подключение монетизации,
накрутка (подписчики/просмотры/лайки через SMM-панель), покупка Telegram Stars,
пополнение баланса через Payme и Click.

## Запуск

```bash
npm install
cp .env.example .env   # заполнить токены и ключи
npx prisma migrate dev --name init
npm run dev
```

## Деплой на Render (бесплатный план)

1. Залейте код в GitHub/GitLab-репозиторий.
2. В [Render dashboard](https://dashboard.render.com) → **New → Web Service** →
   укажите репозиторий. Render сам найдёт `render.yaml` (Blueprint) — если нет,
   задайте вручную:
   - **Build Command:** `npm install && npx prisma generate && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/ping`
   - План: **Free**.
3. В **Environment** пропишите все переменные из `.env`
   (`BOT_TOKEN`, `NOTIFY_BOT_TOKEN`, `DATABASE_URL`, `ADMIN_IDS` и т.д.).
4. **Postgres**: бесплатный Postgres на Render живёт 30 дней и засыпает.
   Для продакшена лучше использовать бесплатный **Neon** или **Supabase**
   (не спят) и вставить их `DATABASE_URL` в `DATABASE_URL` на Render.

> ⚠️ На бесплатном плане Render "засыпает" сервис через 15 минут без трафика.
> Чтобы бот всегда отвечал мгновенно, нужен keep-alive пинг (см. ниже).

## UptimeRobot (защита от "сна" Render)

1. Зарегистрируйтесь на [uptimerobot.com](https://uptimerobot.com).
2. **Add New Monitor** → тип **HTTP(S)**, URL:
   `https://<ваш-сервис>.onrender.com/ping`
   (адрес виден в Render → ваш Web Service).
3. **Interval:** `2` минуты (или меньше).
4. Нажмите **Create Monitor**.

Пинг каждые 2 минуты держит процесс "проснувшимся" — бот отвечает без задержки
из `long polling` (для него внешний webhook URL не нужен).

## Важные заметки

- **Накрутка** идёт через внешнюю SMM-панель (`src/services/boostProvider.ts`).
  Нужен рабочий аккаунт в SMM-панели (например JAP, SMMflow или аналог) —
  оттуда берутся `SMM_API_URL`, `SMM_API_KEY` и ID нужных услуг для YouTube
  (подписчики/просмотры/лайки), прописать в `.env`.
- **Telegram Stars** — официального API для покупки звёзд третьим лицом нет.
  `src/services/starsProvider.ts` сейчас — заглушка, которая ставит покупку
  в статус "pending" (не списывает деньги зря, но и не выдаёт звёзды сама).
  Подключить реальную выдачу — через Fragment.com (неофициально) либо
  сделать ручное подтверждение админом.
- **Payme/Click** — вебхуки уже реализованы по официальным протоколам
  (Payme JSON-RPC Checkout API, Click Prepare/Complete). Для продакшена
  нужно: получить мерчант-ключи в личных кабинетах business.payme.uz и
  my.click.uz, указать `WEBHOOK` URL этих эндпоинтов в настройках мерчанта,
  и обязательно поднять сервер по HTTPS (Payme/Click требуют SSL).
- Цены и курсы (стоимость услуг, курс звезды, мин. сумма пополнения)
  меняются админ-командами `/setprice`, `/setstarrate`, `/settopupmin`
  — см. `src/bot/admin.ts`.
- **Оплата картой по скриншоту**: пользователь вводит сумму → бот показывает
  реквизиты карты → клиент переводит деньги и присылает скриншот → скриншот
  уходит во второй (админский) бот с кнопками **✅ Tasdiqlash / ❌ Rad etish**.
  При одобрении деньги падают на баланс и клиенту приходит уведомление
  «Баланс пополнен на X сум. Спасибо за покупку!». Реквизиты задаются
  командой `/setcard <номер> | <получатель> | <банк>` (см. `src/bot/admin.ts`).
- Второй (админский) бот — только на узбекском (`src/services/notifyAdmin.ts`).
  Нажмите `/start` в нём, чтобы зарегистрировать его как получателя уведомлений.
- `session()` сейчас в памяти процесса — если планируется несколько
  инстансов бота или продакшен с перезапусками, замените на
  `@grammyjs/storage-*` (например Redis) для сохранности диалогов.
