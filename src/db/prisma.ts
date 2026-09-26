import { PrismaClient } from "@prisma/client";

const base = new PrismaClient();

/**
 * Neon на бесплатном тарифе гасит compute через 5 минут простоя.
 * У Prisma в пуле остаётся мёртвый сокет, и первый запрос после паузы
 * падает с "server has closed the connection" / "Can't reach database server".
 *
 * Повторяем ТОЛЬКО чтения. Записи не трогаем: если соединение оборвалось,
 * сервер мог уже применить запрос (например increment баланса), и повтор
 * применил бы его второй раз. Неудачная запись просто не пройдёт —
 * bot.catch не даст боту умереть, пользователь просто повторит.
 */
const READ_OPS = new Set([
  "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow",
  "findMany", "count", "aggregate", "groupBy",
]);

const DEAD_SOCKET = [
  /server has closed the connection/i,
  /Can't reach database server/i,
  /Connection terminated/i,
  /terminating connection/i,
  /Connection reset by peer/i,
  /ECONNRESET/i,
  /P1001|P1002|P1008|P1017/,
];

function isDeadSocket(err: unknown): boolean {
  const msg = (err as any)?.message ?? "";
  return DEAD_SOCKET.some((re) => re.test(msg));
}

export const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!READ_OPS.has(operation)) return query(args);
        try {
          return await query(args);
        } catch (err) {
          if (!isDeadSocket(err)) throw err;
          console.warn(`prisma: ${model}.${operation} — мёртвый сокет, повтор через 1с`);
          await new Promise((r) => setTimeout(r, 1000));
          return query(args);
        }
      },
    },
  },
});
