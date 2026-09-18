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
import { makeT, resolveLang, type Lang } from "../i18n/index.js";

type Handler = (ctx: MyContext) => unknown;

/** Регистрируем обработчик на кнопку меню в обеих языковых версиях */
function hearMenu(bot: Bot<MyContext>, labelKey: string, handler: Handler) {
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
    const lang = await resolveLang(ctx.from?.id);
    const t = makeT(lang);
    const tRu = makeT("ru");

    // Краткое описание на языке пользователя
    await ctx.reply(`${t("start.welcome")}\n\n${t("start.brief")}`);
    // И то же краткое описание на русском
    if (lang !== "ru") {
      await ctx.reply(`${tRu("start.welcome")}\n\n${tRu("start.brief")}`);
    }

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
      ...boosts.map(
        (b: (typeof boosts)[number]) => t("orders.boostLine", { service: b.service, quantity: b.quantity, status: b.status, total: Number(b.totalCost) })
      ),
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

  // Смена языка
  bot.callbackQuery("settings:lang", async (ctx) => {
    await ctx.answerCallbackQuery();
    const t = makeT(await resolveLang(ctx.from!.id));
    const kb = new InlineKeyboard().text("🇷🇺 Русский", "lang:ru").text("🇺🇿 O'zbek", "lang:uz");
    await ctx.reply(t("lang.select"), { reply_markup: kb });
  });

  bot.callbackQuery(/^lang:(ru|uz)$/, async (ctx) => {
    const lang = ctx.match![1] as Lang;
    await ctx.answerCallbackQuery();
    await prisma.user.update({ where: { id: BigInt(ctx.from!.id) }, data: { lang } });
    const t = makeT(lang);
    await ctx.reply(t(lang === "uz" ? "lang.savedUz" : "lang.saved"));
    await ctx.reply(t("start.welcome"), { reply_markup: mainMenu(lang) });
  });

  registerAdminCommands(bot);

  return bot;
}