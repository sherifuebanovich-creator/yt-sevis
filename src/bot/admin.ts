import { Bot } from "grammy";
import type { MyContext } from "./types.js";
import { setSetting } from "../services/settings.js";
import { prisma } from "../db/prisma.js";
import { sendBackup, checkBalancesAfterRestart } from "../services/backup.js";
import { isAdminId, getAdminIds, addAdminId, removeAdminId, isLockedAdmin } from "../services/admins.js";

async function isAdmin(ctx: MyContext): Promise<boolean> {
  return isAdminId(ctx.from?.id);
}

/** ID человека, на сообщение которого ответили этой командой */
function repliedUserId(ctx: MyContext): number | undefined {
  const msg = ctx.msg as { reply_to_message?: { from?: { id?: number } } } | undefined;
  return msg?.reply_to_message?.from?.id;
}

const PRICE_KEYS: Record<string, string> = {
  create_channel: "price_create_channel",
  connect_monetization: "price_connect_monetization",
  yt_subs: "price_yt_subs_per_1000",
  yt_views: "price_yt_views_per_1000",
  yt_likes: "price_yt_likes_per_1000",
};

export function registerAdminCommands(bot: Bot<MyContext>) {
  bot.command("setprice", async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    const [, key, value] = (ctx.message?.text ?? "").split(" ");
    const settingKey = PRICE_KEYS[key];
    if (!settingKey || !value || Number.isNaN(Number(value))) {
      return ctx.reply(
        `Использование: /setprice <${Object.keys(PRICE_KEYS).join("|")}> <сумма>`
      );
    }
    await setSetting(settingKey, value);
    await ctx.reply(`Цена ${key} установлена: ${value} сум`);
  });

  bot.command("setstarrate", async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    const [, value] = (ctx.message?.text ?? "").split(" ");
    if (!value || Number.isNaN(Number(value))) return ctx.reply("Использование: /setstarrate <сумма_за_звезду>");
    await setSetting("star_rate", value);
    await ctx.reply(`Курс звезды установлен: ${value} сум`);
  });

  bot.command("settopupmin", async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    const [, value] = (ctx.message?.text ?? "").split(" ");
    if (!value || Number.isNaN(Number(value))) return ctx.reply("Использование: /settopupmin <сумма>");
    await setSetting("min_topup", value);
    await ctx.reply(`Минимальное пополнение установлено: ${value} сум`);
  });

  // Реквизиты карты для оплаты по скриншоту
  bot.command("setcard", async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    const text = (ctx.message?.text ?? "").trim();
    const parts = text.replace(/^\/setcard\s*/, "").split("|").map((s) => s.trim());
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      return ctx.reply(
        "Использование: /setcard <номер карты> | <получатель>\nПример: /setcard 5614 6821 1221 6694 | S N"
      );
    }
    await setSetting("card_number", parts[0]);
    await setSetting("card_holder", parts[1]);
    await ctx.reply(`✅ Карта для оплаты:\n💳 ${parts[0]}\n👤 ${parts[1]}`);
  });

  bot.command("stats", async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    const [usersCount, successTx, orders] = await Promise.all([
      prisma.user.count(),
      prisma.transaction.aggregate({ where: { status: "success" }, _sum: { amount: true } }),
      prisma.serviceOrder.groupBy({ by: ["status"], _count: true }),
    ]);
    const ordersLine = orders.map((o: (typeof orders)[number]) => `${o.status}: ${o._count}`).join(", ") || "нет";
    await ctx.reply(
      `👥 Пользователей: ${usersCount}\n💰 Пополнено всего: ${successTx._sum.amount ?? 0} сум\n📋 Заявки: ${ordersLine}`
    );
  });

  // Ручной дамп базы в админский чат
  bot.command("backup", async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    await ctx.reply("Готовлю дамп базы...");
    const ok = await sendBackup(true);
    await ctx.reply(ok ? "✅ Дамп отправлен в админский чат." : "❌ Не удалось отправить дамп.");
  });

  // Ручная проверка, не обнулились ли балансы
  bot.command("checkbalance", async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    const [agg, orders, tx] = await Promise.all([
      prisma.user.aggregate({ _count: true, _sum: { balance: true } }),
      prisma.serviceOrder.groupBy({ by: ["status"], _count: true }),
      prisma.transaction.aggregate({ where: { status: "success" }, _sum: { amount: true } }),
    ]);
    await checkBalancesAfterRestart();
    const ordersLine = orders.map((o: (typeof orders)[number]) => `${o.status}: ${o._count}`).join(", ") || "нет";
    await ctx.reply(
      `👤 Юзеров: ${agg._count}\n` +
        `💰 Сумма всех балансов: ${agg._sum.balance ?? 0}\n` +
        `✅ Пополнено всего: ${tx._sum.amount ?? 0}\n` +
        `📋 Заявки: ${ordersLine}`
    );
  });

  // ─── Управление админами ───────────────────────────────────────────────
  // Права админа = полный доступ к деньгам: /backup отдаёт все балансы,
  // /setcard меняет реквизиты, /checkbalance показывает суммы. Добавляй
  // только тех, кому доверяешь на 100%.

  bot.command("admins", async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    const ids = [...(await getAdminIds())].sort();
    await ctx.reply(
      `👑 Админов: ${ids.length}\n\n${ids.map((i) => `• ${i}${isLockedAdmin(i) ? " (зашит в env, не удалить)" : ""}`).join("\n")}`
    );
  });

  bot.command("addadmin", async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    // Либо ответ на сообщение человека, либо явный ID
    const target =
      repliedUserId(ctx) ??
      Number((ctx.message?.text ?? "").split(" ")[1]?.trim());
    if (!Number.isFinite(target) || !target) {
      return ctx.reply("Использование: /addadmin <telegram_id>\nИли ответь на сообщение человека этой командой.");
    }
    const before = await getAdminIds();
    if (before.has(String(target))) return ctx.reply(`ℹ️ ${target} уже админ.`);
    await addAdminId(String(target));
    const name = (ctx.msg as any)?.reply_to_message?.from?.first_name ?? "";
    await ctx.reply(`✅ ${target}${name ? ` (${name})` : ""} добавлен как админ.\nВсего админов: ${before.size + 1}`);
  });

  bot.command("deladmin", async (ctx) => {
    if (!(await isAdmin(ctx))) return;
    const target = String(
      repliedUserId(ctx) ?? Number((ctx.message?.text ?? "").split(" ")[1]?.trim())
    );
    if (!/^\d+$/.test(target)) return ctx.reply("Использование: /deladmin <telegram_id>");
    if (isLockedAdmin(target)) {
      return ctx.reply(`🔒 ${target} зашит в переменную ADMIN_IDS на сервере. Убрать оттуда можно только через Render Dashboard.`);
    }
    const before = await getAdminIds();
    if (!before.has(target)) return ctx.reply(`ℹ️ ${target} не в списке админов.`);
    // Последнего админа удалять нельзя — иначе прав на бот больше ни у кого не останется
    if (before.size <= 1) return ctx.reply("🚫 Это последний админ. Удаление запрещено, иначе бот останется без управления.");
    await removeAdminId(target);
    await ctx.reply(`✅ ${target} удалён из админов. Осталось: ${before.size - 1}`);
  });

  // Обработка заявок из админ-уведомлений (кнопки под сообщением, см. main.ts)
  bot.callbackQuery(/^order:(in_progress|done|rejected):(.+)$/, async (ctx) => {
    if (!(await isAdmin(ctx))) return ctx.answerCallbackQuery();
    const [, status, orderId] = ctx.match!;
    const order = await prisma.serviceOrder.update({ where: { id: orderId }, data: { status } });

    if (status === "rejected") {
      await prisma.user.update({ where: { id: order.userId }, data: { balance: { increment: order.price } } });
      await ctx.api.sendMessage(Number(order.userId), `❌ Заявка отклонена, ${order.price} сум возвращено на баланс.`);
    } else if (status === "done") {
      await ctx.api.sendMessage(Number(order.userId), `✅ Заявка выполнена!`);
    }

    await ctx.answerCallbackQuery(`Статус: ${status}`);
    await ctx.editMessageReplyMarkup();
  });
}
