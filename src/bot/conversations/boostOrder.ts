import type { MyContext, MyConversation } from "../types.js";
import { boostServiceMenu } from "../menu.js";
import { prisma } from "../../db/prisma.js";
import { getSettingNumber } from "../../services/settings.js";
import { placeBoostOrder } from "../../services/boostProvider.js";
import { makeT, resolveLang, type Lang } from "../../i18n/index.js";

const PRICE_SETTING_KEY: Record<string, string> = {
  yt_subs: "price_yt_subs_per_1000",
  yt_views: "price_yt_views_per_1000",
  yt_likes: "price_yt_likes_per_1000",
};

function serviceLabel(lang: Lang, service: string): string {
  const t = makeT(lang);
  if (service === "yt_subs") return t("boost.subs");
  if (service === "yt_views") return t("boost.views");
  return t("boost.likes");
}

export async function boostOrderConversation(conversation: MyConversation, ctx: MyContext) {
  const lang = await conversation.external(() => resolveLang(ctx.from!.id));
  const t = makeT(lang);
  await ctx.reply(t("boost.title"), { reply_markup: boostServiceMenu(lang) });

  const choice = await conversation.waitForCallbackQuery(["boost:yt_subs", "boost:yt_views", "boost:yt_likes"]);
  const service = choice.callbackQuery.data!.split(":")[1];
  await choice.answerCallbackQuery();

  await ctx.reply(t("boost.link"));
  const linkMsg = await conversation.waitFor("message:text");
  const link = linkMsg.message.text.trim();

  const pricePer1000 = await conversation.external(() => getSettingNumber(PRICE_SETTING_KEY[service]));

  await ctx.reply(t("boost.quantity", { service: serviceLabel(lang, service), price: pricePer1000 }));
  let quantity = 0;
  while (true) {
    const qMsg = await conversation.waitFor("message:text");
    const parsed = Number(qMsg.message.text.replace(/[^\d]/g, ""));
    if (!parsed || parsed < 10) {
      await ctx.reply(t("boost.quantityInvalid", { min: 10 }));
      continue;
    }
    quantity = parsed;
    break;
  }

  const totalCost = Math.ceil((quantity / 1000) * pricePer1000);
  const userId = BigInt(ctx.from!.id);

  const user = await conversation.external(() => prisma.user.findUnique({ where: { id: userId } }));
  if (!user || Number(user.balance) < totalCost) {
    await ctx.reply(t("boost.notEnough", { need: totalCost, balance: Number(user?.balance ?? 0) }));
    return;
  }

  await ctx.reply(t("boost.confirm", { total: totalCost, quantity, service: serviceLabel(lang, service) }));
  const confirmMsg = await conversation.waitFor("message:text");
  if (!/^(да|ha)$/i.test(confirmMsg.message.text.trim())) {
    await ctx.reply(t("boost.cancelled"));
    return;
  }

  const order = await conversation.external(async () => {
    const [, created] = await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { balance: { decrement: totalCost } } }),
      prisma.boostOrder.create({
        data: { userId, service, link, quantity, pricePer1000, totalCost, status: "pending" },
      }),
    ]);
    return created;
  });

  const result = await conversation.external(() => placeBoostOrder(service, link, quantity));

  if (result.success) {
    await conversation.external(() =>
      prisma.boostOrder.update({
        where: { id: order.id },
        data: { status: "processing", providerOrderId: result.providerOrderId },
      })
    );
    await ctx.reply(t("boost.done"));
  } else {
    // возврат средств при ошибке размещения
    await conversation.external(() =>
      prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { balance: { increment: totalCost } } }),
        prisma.boostOrder.update({ where: { id: order.id }, data: { status: "failed" } }),
      ])
    );
    await ctx.reply(t("boost.failed", { error: result.error ?? "xato" }));
  }
}