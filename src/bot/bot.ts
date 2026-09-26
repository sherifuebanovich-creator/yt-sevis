import { Bot, session, InlineKeyboard } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import type { MyContext } from "./types.js";
import { mainMenu, settingsMenu } from "./menu.js";
import { topupConversation } from "./conversations/topup.js";
import { youtubeOrderConversation } from "./conversations/youtubeOrder.js";
import { boostOrderConversation } from "./conversations/boostOrder.js";
import { starsBuyConversation } from "./conversations/starsBuy.js";
import { registerAdminCommands } from "./admin.js";
import { ensureUser } from "../services/settings.js";
import { prisma } from "../db/prisma.js";
import { makeT, resolveLang } from "../i18n/index.js";
import { notifyAdmin } from "../services/notifyAdmin.js";

/**
 * Без bot.catch grammY по умолчанию ОСТАНАВЛИВАЕТ polling при первой ошибке
 * в middleware (см. node_modules/grammy/out/bot.js: дефолтный errorHandler
 * вызывает this.stop() и пробрасывает исключение). Любая недоступность БД
 * приводила бы к process.exit(1) и бесконечному циклу аварий на Render.
 * Со своим обработчиком бот переживает обрыв и оживает, когда БД вернётся.
 */
let lastAlertAt = 0;
const ALERT_COOLDOWN_MS = 10 * 60 * 1000;

function registerErrorHandler(bot: Bot<MyContext>): void {
  bot.catch((err) => {
    const e = err.error as Error | undefined;
    const message = e?.message ?? String(e);
    console.error("bot error:", message);

    // Не шумим в админский чат на каждом апдейте: при лежащей БД их будет
    // ровно столько, сколько сообщений пришло
    if (Date.now() - lastAlertAt < ALERT_COOLDOWN_MS) return;
    lastAlertAt = Date.now();
    void notifyAdmin(`🚨 Ошибка бота: ${message}`).catch(() => {});
  });
}

/** Регистрируем обработчик на кнопку меню в обеих языковых версиях */
function hearMenu(
  bot: Bot<MyContext>,
  labelKey: string,
  handler: (ctx: MyContext) => unknown
): void {
  bot.hears(makeT("ru")(labelKey), handler);
  bot.hears(makeT("uz")(labelKey), handler);
}

export function createBot(): Bot<MyContext> {
  const bot = new Bot<MyContext>(process.env.BOT_TOKEN ?? "");

  bot.use(session({ initial: () => ({}) }));
  bot.use(conversations());

  bot.use(createConversation<MyContext>(topupConversation, "topup"));
  bot.use(createConversation<MyContext>(boostOrderConversation, "boostOrder"));
  bot.use(createConversation<MyContext>(starsBuyConversation, "starsBuy"));
  bot.use(
    createConversation<MyContext>(
      (conv, ctx) => youtubeOrderConversation(conv, ctx, "create_channel"),
      "createChannel"
    )
  );
  bot.use(
    createConversation<MyContext>(
      (conv, ctx) => youtubeOrderConversation(conv, ctx, "connect_monetization"),
      "connectMonetization"
    )
  );

  // регистрируем/обновляем пользователя на каждый апдейт
  bot.use(async (ctx, next) => {
    if (ctx.from) await ensureUser(BigInt(ctx.from.id), ctx.from.username);
    await next();
  });

  bot.command("start", async (ctx) => {
    // Приветствие одним текстом на обоих языках
    const tUz = makeT("uz");
    const tRu = makeT("ru");
    const text = `${tUz("start.welcome")}\n\n${tUz("start.brief")}\n\n` +
      `${tRu("start.welcome")}\n\n${tRu("start.brief")}`;
    await ctx.reply(text);
    // Меню — на выбранном языке пользователя
    const lang = await resolveLang(ctx.from?.id);
    const t = makeT(lang);
    await ctx.reply(t("start.welcome"), { reply_markup: mainMenu(lang) });
  });

  hearMenu(bot, "menu.createChannel", (ctx) => ctx.conversation.enter("createChannel"));
  hearMenu(bot, "menu.connectMonetization", (ctx) => ctx.conversation.enter("connectMonetization"));
  hearMenu(bot, "menu.boost", (ctx) => ctx.conversation.enter("boostOrder"));
  hearMenu(bot, "menu.stars", (ctx) => ctx.conversation.enter("starsBuy"));
  hearMenu(bot, "menu.topup", (ctx) => ctx.conversation.enter("topup"));
  hearMenu(bot, "menu.settings", async (ctx) => {
    const lang = await resolveLang(ctx.from?.id);
    await ctx.reply(makeT(lang)("settings.title"), { reply_markup: settingsMenu(lang) });
  });

  bot.callbackQuery("settings:topup", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.conversation.enter("topup");
  });

  bot.callbackQuery("settings:balance", async (ctx) => {
    await ctx.answerCallbackQuery();
    const t = makeT(await resolveLang(ctx.from!.id));
    const user = await prisma.user.findUnique({ where: { id: BigInt(ctx.from!.id) } });
    await ctx.reply(t("balance.line", { balance: Number(user?.balance ?? 0) }));
  });

  bot.callbackQuery("settings:orders", async (ctx) => {
    await ctx.answerCallbackQuery();
    const t = makeT(await resolveLang(ctx.from!.id));
    const userId = BigInt(ctx.from!.id);
    const [orders, boosts] = await Promise.all([
      prisma.serviceOrder.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
      prisma.boostOrder.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 }),
    ]);
    const lines = [
      ...orders.map((o: (typeof orders)[number]) => t("orders.line", { type: o.type, status: o.status, price: Number(o.price) })),
      ...boosts.map((b: (typeof boosts)[number]) => t("orders.boostLine", { service: b.service, quantity: b.quantity, status: b.status, total: Number(b.totalCost) })),
    ];
    await ctx.reply(lines.length ? lines.join("\n") : t("orders.empty"));
  });

  bot.callbackQuery("settings:history", async (ctx) => {
    await ctx.answerCallbackQuery();
    const t = makeT(await resolveLang(ctx.from!.id));
    const userId = BigInt(ctx.from!.id);
    const txs = await prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 10 });
    const lines = txs.map((tr: (typeof txs)[number]) => t("history.line", { provider: tr.provider, amount: Number(tr.amount), status: tr.status }));
    await ctx.reply(lines.length ? lines.join("\n") : t("history.empty"));
  });

  bot.callbackQuery("settings:starrate", async (ctx) => {
    await ctx.answerCallbackQuery();
    const t = makeT(await resolveLang(ctx.from!.id));
    const setting = await prisma.settings.findUnique({ where: { key: "star_rate" } });
    await ctx.reply(t("settings.starrate") + `: ${setting?.value ?? "180"}`);
  });

  // Смена языка
  bot.callbackQuery("settings:lang", async (ctx) => {
    await ctx.answerCallbackQuery();
    const t = makeT(await resolveLang(ctx.from!.id));
    const kb = new InlineKeyboard().text("🇷🇺 Русский", "lang:ru").text("🇺🇿 O'zbek", "lang:uz");
    await ctx.reply(t("lang.select"), { reply_markup: kb });
  });

  bot.callbackQuery(/^lang:(ru|uz)$/, async (ctx) => {
    const lang = ctx.match![1] as "ru" | "uz";
    await ctx.answerCallbackQuery();
    await prisma.user.update({ where: { id: BigInt(ctx.from!.id) }, data: { lang } });
    const t = makeT(lang);
    await ctx.reply(t(lang === "uz" ? "lang.savedUz" : "lang.saved"));
    await ctx.reply(t("start.welcome"), { reply_markup: mainMenu(lang) });
  });

  registerAdminCommands(bot);
  registerErrorHandler(bot);

  return bot;
}