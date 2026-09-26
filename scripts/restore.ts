/**
 * Восстановление базы из дампа, который бот прислал в админский чат.
 *
 *   npm run restore -- backup-2026-10-26.json
 *
 * Скрипт НИКОГДА не удаляет данные: только upsert по первичному ключу.
 * Прерванный на середине прогон безопасен — повторный запуск дозапишет остальное.
 * Схему в целевой базе создаёт `prisma migrate deploy` (вызывается автоматически).
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

type Row = Record<string, unknown>;

/** Порядок важен: сначала юзеры, потом всё, что на них ссылается */
const TABLES = [
  { name: "users", model: "user", pk: "id", bigints: ["id"] },
  { name: "transactions", model: "transaction", pk: "id", bigints: ["userId"] },
  { name: "serviceOrders", model: "serviceOrder", pk: "id", bigints: ["userId"] },
  { name: "boostOrders", model: "boostOrder", pk: "id", bigints: ["userId"] },
  { name: "starPurchases", model: "starPurchase", pk: "id", bigints: ["userId"] },
  { name: "settings", model: "settings", pk: "key", bigints: [] },
] as const;

function revive(row: Row, bigints: readonly string[]): Row {
  const out: Row = { ...row };
  for (const f of bigints) {
    if (out[f] !== null && out[f] !== undefined) out[f] = BigInt(String(out[f]));
  }
  return out;
}

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Укажи файл дампа: npm run restore -- backup.json");
    process.exit(1);
  }

  let dump: any;
  try {
    dump = JSON.parse(readFileSync(file, "utf8"));
  } catch (e: any) {
    console.error(`Не читается файл ${file}: ${e?.message ?? e}`);
    process.exit(1);
  }
  if (dump?.format !== "yt-services-bot-dump") {
    console.error("Это не наш дамп (нет format: yt-services-bot-dump).");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("Нет DATABASE_URL — не знаю, куда восстанавливать.");
    process.exit(1);
  }

  console.log(`\nДамп создан: ${dump.createdAt}`);
  console.log(`Содержимое: ${JSON.stringify(dump.counts)}\n`);
  console.log(`Целевая база: ${process.env.DATABASE_URL.replace(/:[^:@/]*@/, ":***@")}\n`);

  const current = await prisma.user.count();
  if (current > 0 && !process.argv.includes("--force")) {
    console.error(
      `В целевой базе уже ${current} юзеров. Восстановление перезапишет их данные.\n` +
        `Если это нужная база — забудь этот шаг. Если точно нужно — добавь --force.`
    );
    process.exit(1);
  }

  console.log("Применяю миграции к целевой базе...");
  execSync("npx prisma migrate deploy", { stdio: "inherit" });

  for (const t of TABLES) {
    const rows: Row[] = dump.data?.[t.name] ?? [];
    if (rows.length === 0) {
      console.log(`  ${t.name}: пусто, пропуск`);
      continue;
    }
    const delegate = (prisma as any)[t.model];
    let done = 0;
    for (const row of rows) {
      const data = revive(row, t.bigints);
      const where = { [t.pk]: data[t.pk] };
      await delegate.upsert({
        where,
        update: data,
        create: data,
      });
      done++;
    }
    console.log(`  ${t.name}: восстановлено ${done}`);
  }

  const agg = await prisma.user.aggregate({ _count: true, _sum: { balance: true } });
  console.log(`\nГотово. Юзеров: ${agg._count}, сумма балансов: ${agg._sum.balance ?? 0}`);
  console.log("Не забудь поменять DATABASE_URL на Render и задеплоить.");
}

main()
  .catch((e) => {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`Prisma ${e.code}: ${e.message}`);
    } else {
      console.error("Restore failed:", e);
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
