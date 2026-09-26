import { prisma } from "../db/prisma.js";
import { notifyAdmin, notifyAdminDocument } from "./notifyAdmin.js";

const LAST_BACKUP_KEY = "last_backup_at";
const LAST_TOTAL_KEY = "last_known_balance_total";
const LAST_USERS_KEY = "last_known_user_count";

const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 60 * 60 * 1000;

export type DatabaseDump = {
  format: "yt-services-bot-dump";
  version: 1;
  createdAt: string;
  counts: Record<string, number>;
  data: {
    users: Record<string, unknown>[];
    transactions: Record<string, unknown>[];
    serviceOrders: Record<string, unknown>[];
    boostOrders: Record<string, unknown>[];
    starPurchases: Record<string, unknown>[];
    settings: Record<string, unknown>[];
  };
};

/** BigInt нельзя сериализовать в JSON — Prisma отдаёт id пользователей как BigInt */
function jsonReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

/** Прочитать все таблицы. Только SELECT — балансы тут не меняются. */
export async function createDump(): Promise<DatabaseDump> {
  const [users, transactions, serviceOrders, boostOrders, starPurchases, settings] = await Promise.all([
    prisma.user.findMany(),
    prisma.transaction.findMany(),
    prisma.serviceOrder.findMany(),
    prisma.boostOrder.findMany(),
    prisma.starPurchase.findMany(),
    prisma.settings.findMany(),
  ]);

  return {
    format: "yt-services-bot-dump",
    version: 1,
    createdAt: new Date().toISOString(),
    counts: {
      users: users.length,
      transactions: transactions.length,
      serviceOrders: serviceOrders.length,
      boostOrders: boostOrders.length,
      starPurchases: starPurchases.length,
      settings: settings.length,
    },
    data: { users, transactions, serviceOrders, boostOrders, starPurchases, settings },
  };
}

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 2 });
}

function describe(dump: DatabaseDump): string {
  const total = dump.data.users.reduce((sum, u) => sum + Number(u.balance ?? 0), 0);
  const c = dump.counts;
  return [
    `💾 Бэкап базы ${new Date(dump.createdAt).toLocaleString("ru-RU")}`,
    "",
    `👤 Юзеров: ${c.users} (сумма балансов: ${fmt(total)})`,
    `💰 Пополнений: ${c.transactions}`,
    `📋 Заявок: ${c.serviceOrders}`,
    `🚀 Накруток: ${c.boostOrders}`,
    `⭐ Звёзд: ${c.starPurchases}`,
  ].join("\n");
}

/** Отправить дамп в админский чат. false — доставить не удалось. */
export async function sendBackup(manual = false): Promise<boolean> {
  try {
    const dump = await createDump();
    const json = JSON.stringify(dump, jsonReplacer, 2);
    const ok = await notifyAdminDocument(Buffer.from(json, "utf8"), `backup-${dump.createdAt.slice(0, 10)}.json`, describe(dump));
    if (ok) {
      console.log(`backup sent (${(json.length / 1024).toFixed(1)} KB)${manual ? " [manual]" : ""}`);
      await prisma.settings.upsert({
        where: { key: LAST_BACKUP_KEY },
        update: { value: String(Date.now()) },
        create: { key: LAST_BACKUP_KEY, value: String(Date.now()) },
      });
    }
    return ok;
  } catch (e: any) {
    console.error("backup failed:", e?.message ?? e);
    return false;
  }
}

async function isBackupDue(): Promise<boolean> {
  try {
    const row = await prisma.settings.findUnique({ where: { key: LAST_BACKUP_KEY } });
    if (!row) return true;
    return Date.now() - Number(row.value) > BACKUP_INTERVAL_MS;
  } catch {
    // БД недоступна — дамп всё равно не собрать, но и ругаться в 00:00 не надо
    return false;
  }
}

/**
 * Сторож: после рестарта сверяем сумму балансов с запомненной.
 * Самая страшная потеря данных выглядит так — база исчезла, prisma migrate
 * создал пустые таблицы, бот работает как ни в чём не бывало, а у всех
 * юзеров баланс 0. Никакой ошибки в логах. Этот алерт ловит такое сразу.
 */
export async function checkBalancesAfterRestart(): Promise<void> {
  let userCount = 0;
  let total = 0;
  try {
    const agg = await prisma.user.aggregate({ _count: true, _sum: { balance: true } });
    userCount = agg._count;
    total = Number(agg._sum.balance ?? 0);
  } catch (e: any) {
    console.error("balance check failed:", e?.message ?? e);
    return;
  }

  const [prevTotalRow, prevUsersRow] = await Promise.all([
    prisma.settings.findUnique({ where: { key: LAST_TOTAL_KEY } }),
    prisma.settings.findUnique({ where: { key: LAST_USERS_KEY } }),
  ]);
  const prevTotal = prevTotalRow ? Number(prevTotalRow.value) : null;
  const prevUsers = prevUsersRow ? Number(prevUsersRow.value) : null;

  if (prevTotal !== null && prevTotal > 0 && total === 0 && userCount > 0) {
    await notifyAdmin(
      `🚨🚨 ПОТЕРЯ БАЛАНСОВ 🚨🚨\n\n` +
        `Балансы обнулились при перезапуске.\n` +
        `Было: ${fmt(prevTotal)} сум у ${prevUsers ?? "?"} юзеров\n` +
        `Стало: 0 у ${userCount} юзеров\n\n` +
        `Похоже, база пересоздалась с нуля. Восстановить из последнего дампа:\n` +
        `npm run restore -- backup.json`
    );
    console.error(`!!! BALANCE LOSS DETECTED: was ${prevTotal}, now 0, users ${userCount}`);
  } else if (prevUsers !== null && userCount < prevUsers) {
    await notifyAdmin(
      `🚨 Юзеров стало меньше: было ${prevUsers}, стало ${userCount}. Проверь базу.`
    );
  }

  await Promise.all([
    prisma.settings.upsert({
      where: { key: LAST_TOTAL_KEY },
      update: { value: String(total) },
      create: { key: LAST_TOTAL_KEY, value: String(total) },
    }),
    prisma.settings.upsert({
      where: { key: LAST_USERS_KEY },
      update: { value: String(userCount) },
      create: { key: LAST_USERS_KEY, value: String(userCount) },
    }),
  ]);

  console.log(`balance check: ${userCount} users, total ${total}`);
}

/** Раз в час смотрим, не пора ли сделать дамп. Устойчиво к рестартам. */
export function startBackupScheduler(): void {
  const tick = () => {
    void isBackupDue().then((due) => {
      if (due) void sendBackup();
    });
  };
  void checkBalancesAfterRestart();
  setTimeout(tick, 30_000).unref?.();
  setInterval(tick, CHECK_EVERY_MS).unref?.();
  console.log("Backup scheduler started");
}
