import { InlineKeyboard } from "grammy";
import type { MyContext, MyConversation } from "../types.js";
import { courseMenu, mainMenu } from "../menu.js";
import { prisma } from "../../db/prisma.js";
import { getSettingNumber } from "../../services/settings.js";
import { makeT, resolveLang } from "../../i18n/index.js";
import { notifyAdmin, orderInfoText } from "../../services/notifyAdmin.js";
import { waitForText } from "./helpers.js";

const COURSE_TYPES = { solo: "course", bundle: "course_monetization" } as const;

export async function courseConversation(conversation: MyConversation, ctx: MyContext) {
  const lang = await conversation.external(() => resolveLang(ctx.from!.id));
  const t = makeT(lang);

  const [priceSolo, priceBundle] = await conversation.external(() =>
    Promise.all([getSettingNumber("price_course"), getSettingNumber("price_course_monetization")])
  );

  await ctx.reply(t("course.title"), { reply_markup: courseMenu(lang, priceSolo, priceBundle) });

  const choice = await conversation.waitForCallbackQuery(["course:solo", "course:bundle", "nav:back"]);
  await choice.answerCallbackQuery();
  if (choice.callbackQuery.data === "nav:back") {
    await ctx.reply(t("start.welcome"), { reply_markup: mainMenu(lang) });
    return;
  }

  const type =
    choice.callbackQuery.data === "course:solo" ? COURSE_TYPES.solo : COURSE_TYPES.bundle;
  const price = choice.callbackQuery.data === "course:solo" ? priceSolo : priceBundle;

  await ctx.reply(
    choice.callbackQuery.data === "course:solo"
      ? t("course.soloDesc", { price })
      : t("course.bundleDesc", { price })
  );

  await ctx.reply(t("course.contact"));
  const contact = await waitForText(conversation, ctx, lang);
  if (contact === null) return;

  const userId = BigInt(ctx.from!.id);
  const user = await conversation.external(() => prisma.user.findUnique({ where: { id: userId } }));

  if (!user || Number(user.balance) < price) {
    await ctx.reply(t("course.notEnough", { price, balance: Number(user?.balance ?? 0) }));
    return;
  }

  await ctx.reply(t("course.confirm", { price }));
  const confirmText = await waitForText(conversation, ctx, lang);
  if (confirmText === null || !/^(да|ha)$/i.test(confirmText)) {
    await ctx.reply(t("course.cancelled"));
    return;
  }

  const order = await conversation.external(async () => {
    const [, created] = await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { balance: { decrement: price } } }),
      prisma.serviceOrder.create({
        data: { userId, type, price, contactInfo: contact, status: "new" },
      }),
    ]);
    return created;
  });

  await ctx.reply(t("course.done"));

  const kb = new InlineKeyboard()
    .text("✅ Выполнено", `order_done:${order.id}:${userId}`)
    .text("❌ Отклонить", `order_reject:${order.id}:${userId}`);
  await notifyAdmin(
    orderInfoText({
      kind: "🆕 Новая заявка",
      username: ctx.from?.username,
      userId,
      what: type === "course" ? "📚 Курс" : "📚 Курс + монетизация",
      amount: `${price} сум`,
      extra: [`📩 Контакт: ${contact}`],
    }),
    kb
  );
}