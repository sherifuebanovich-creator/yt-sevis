import { InlineKeyboard } from "grammy";
import type { MyContext, MyConversation } from "../types.js";
import { numbersMenu, NUMBER_PRICE_KEYS, mainMenu } from "../menu.js";
import { prisma } from "../../db/prisma.js";
import { getSettingNumber } from "../../services/settings.js";
import { makeT, resolveLang } from "../../i18n/index.js";
import { notifyAdmin, orderInfoText } from "../../services/notifyAdmin.js";
import { waitForText, waitForTextLoop } from "./helpers.js";

const CANCEL_WORDS = ["0", "отмена", "cancel", "qaytish", "yo'q", "нет"];

export async function numbersConversation(conversation: MyConversation, ctx: MyContext) {
  const lang = await conversation.external(() => resolveLang(ctx.from!.id));
  const t = makeT(lang);

  const prices = await conversation.external(async () => {
    const entries = Object.entries(NUMBER_PRICE_KEYS);
    const nums = await Promise.all(entries.map(([, k]) => getSettingNumber(k)));
    const out: Record<string, number> = {};
    entries.forEach(([country], i) => (out[country] = nums[i]));
    return out;
  });

  await ctx.reply(t("numbers.title"), { reply_markup: numbersMenu(lang, prices) });

  const countryCbs = Object.keys(NUMBER_PRICE_KEYS).map((c) => `numbers:${c}`);
  const choice = await conversation.waitForCallbackQuery([...countryCbs, "nav:back"]);
  await choice.answerCallbackQuery();
  if (choice.callbackQuery.data === "nav:back") {
    await ctx.reply(t("start.welcome"), { reply_markup: mainMenu(lang) });
    return;
  }

  const country = choice.callbackQuery.data!.split(":")[1];
  const pricePerNum = prices[country];

  await ctx.reply(t("numbers.quantity", { price: pricePerNum }));
  let quantity = 0;
  while (true) {
    const text = await waitForTextLoop(conversation, ctx, lang);
    if (text === null) return;
    const lower = text.toLowerCase();
    if (CANCEL_WORDS.includes(lower)) {
      await ctx.reply(t("numbers.cancelled"));
      return;
    }
    const parsed = Number(text.replace(/[^\d]/g, ""));
    if (!parsed || parsed < 1 || parsed > 100) {
      await ctx.reply(t("numbers.quantityInvalid"));
      continue;
    }
    quantity = parsed;
    break;
  }

  const totalCost = quantity * pricePerNum;
  const userId = BigInt(ctx.from!.id);
  const user = await conversation.external(() => prisma.user.findUnique({ where: { id: userId } }));

  if (!user || Number(user.balance) < totalCost) {
    await ctx.reply(t("numbers.notEnough", { total: totalCost, balance: Number(user?.balance ?? 0) }));
    return;
  }

  await ctx.reply(t("numbers.confirm", { total: totalCost, quantity, country: t(`numbers.country.${country}`) }));
  const confirmText = await waitForText(conversation, ctx, lang);
  if (confirmText === null || !/^(да|ha)$/i.test(confirmText)) {
    await ctx.reply(t("numbers.cancelled"));
    return;
  }

  const order = await conversation.external(async () => {
    const [, created] = await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { balance: { decrement: totalCost } } }),
      prisma.numberOrder.create({
        data: { userId, country, quantity, pricePerNum, totalCost, status: "new" },
      }),
    ]);
    return created;
  });

  await ctx.reply(t("numbers.done"));

  const kb = new InlineKeyboard()
    .text("✅ Выполнено", `number_done:${order.id}:${userId}`)
    .text("❌ Отклонить", `number_reject:${order.id}:${userId}`);
  await notifyAdmin(
    orderInfoText({
      kind: "📱 Новая заявка на номера",
      username: ctx.from?.username,
      userId,
      what: `Виртуальные номера (${t(`numbers.country.${country}`)})`,
      amount: `${totalCost} сум`,
      extra: [`🔢 Количество: ${quantity}`],
    }),
    kb
  );
}