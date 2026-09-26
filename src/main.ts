import "dotenv/config";
import express from "express";
import { createBot } from "./bot/bot.js";
import { registerBotForNotify } from "./server/notify.js";
import { startNotifyBot, setBuyerBot } from "./services/notifyAdmin.js";
import { startBackupScheduler } from "./services/backup.js";

async function main() {
  const bot = createBot();
  registerBotForNotify(bot);
  setBuyerBot(bot);
  // Второй (админский) бот для подтверждения оплат и заявок
  await startNotifyBot();
  // Дампы базы в админский чат + сторож обнуления балансов
  startBackupScheduler();

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health/ping endpoint для UptimeRobot и Render (держит бота "проснувшимся")
  app.get("/ping", (_req, res) => res.status(200).send("ok"));

  const port = Number(process.env.PORT ?? process.env.SERVER_PORT ?? 3000);
  app.listen(port, () => console.log(`HTTP-сервер запущен на порту ${port}`));

  await bot.start();
  console.log("Бот запущен (long polling)");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});