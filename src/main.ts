import "dotenv/config";
import express from "express";
import { createBot } from "./bot/bot.js";
import { registerBotForNotify } from "./server/notify.js";
import { startNotifyBot, setBuyerBot } from "./services/notifyAdmin.js";
import { startBackupScheduler } from "./services/backup.js";
import { startPolling } from "./bot/polling.js";

async function main() {
  const bot = createBot();
  registerBotForNotify(bot);
  setBuyerBot(bot);

  // Дампы базы + сторож обнуления балансов. Стартует до ботов, чтобы
  // работать даже если polling временно не поднялся (например 409 на деплое)
  startBackupScheduler();

  // Второй (админский) бот для подтверждения оплат и заявок
  await startNotifyBot();

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health/ping endpoint для UptimeRobot и Render (держит бота "проснувшимся")
  app.get("/ping", (_req, res) => res.status(200).send("ok"));

  const port = Number(process.env.PORT ?? process.env.SERVER_PORT ?? 3000);
  app.listen(port, () => console.log(`HTTP-сервер запущен на порту ${port}`));

  // Не await: startPolling сам переживает 409 и держит retry в фоне
  startPolling(bot, "Основной бот", true);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});