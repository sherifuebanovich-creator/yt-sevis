import { Bot } from "grammy";
import type { MyContext } from "./types.js";
import { setSetting } from "../services/settings.js";
import { prisma } from "../db/prisma.js";

const ADMIN_IDS = (process.env.ADMIN_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

function isAdmin(ctx: MyContext): boolean {
  return !!ctx.from && ADMIN_IDS.includes(String(ctx.from.id));
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
    if (!isAdmin(ctx)) return;
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
    if (!isAdmin(ctx)) return;
    const [, value] = (ctx.message?.text ?? "").split(" ");
    if (!value || Number.isNaN(Number(value))) return ctx.reply("Использование: /setstarrate <сумма_за_звезду>");
    await setSetting("star_rate", value);
    await ctx.reply(`Курс звезды установлен: ${value} сум`);
  });

  bot.command("settopupmin", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const [, value] = (ctx.message?.text ?? "").split(" ");
    if (!value || Number.isNaN(Number(value))) return ctx.reply("Использование: /settopupmin <сумма>");
    await setSetting("min_topup", value);
    await ctx.reply(`Минимальное пополнение установлено: ${value} сум`);
  });

  // Реквизиты карты для оплаты по скриншоту
  bot.command("setcard", async (ctx) => {
    if (!isAdmin(ctx)) return;
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
    if (!isAdmin(ctx)) return;
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

  // Обработка заявок из админ-уведомлений (кнопки под сообщением, см. main.ts)
  bot.callbackQuery(/^order:(in_progress|done|rejected):(.+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return ctx.answerCallbackQuery();
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
