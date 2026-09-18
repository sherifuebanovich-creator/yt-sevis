import type { MyContext, MyConversation } from "../types.js";
import { prisma } from "../../db/prisma.js";
import { getSettingNumber } from "../../services/settings.js";
import { buyStars } from "../../services/starsProvider.js";
import { makeT, resolveLang } from "../../i18n/index.js";

export async function starsBuyConversation(conversation: MyConversation, ctx: MyContext) {
  const lang = await conversation.external(() => resolveLang(ctx.from!.id));
  const t = makeT(lang);
  const rate = await conversation.external(() => getSettingNumber("star_rate"));
  await ctx.reply(t("stars.ratePlease", { rate }));

  let count = 0;
  while (true) {
    const msg = await conversation.waitFor("message:text");
    const parsed = Number(msg.message.text.replace(/[^\d]/g, ""));
    if (!parsed || parsed < 1) {
      await ctx.reply(t("stars.quantityInvalid"));
      continue;
    }
    count = parsed;
    break;
  }

  const totalCost = Math.ceil(count * rate);
  const userId = BigInt(ctx.from!.id);
  const user = await conversation.external(() => prisma.user.findUnique({ where: { id: userId } }));

  if (!user || Number(user.balance) < totalCost) {
    await ctx.reply(t("stars.notEnough", { need: totalCost, balance: Number(user?.balance ?? 0) }));
    return;
  }

  await ctx.reply(t("stars.confirm", { total: totalCost, count }));
  const confirmMsg = await conversation.waitFor("message:text");
  if (!/^(да|ha)$/i.test(confirmMsg.message.text.trim())) {
    await ctx.reply(t("stars.cancelled"));
    return;
  }

  if (!ctx.from?.username) {
    await ctx.reply(t("stars.noUsername"));
    return;
  }

  const purchase = await conversation.external(async () => {
    const [, created] = await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { balance: { decrement: totalCost } } }),
      prisma.starPurchase.create({
        data: { userId, starsCount: count, pricePerStar: rate, totalCost, status: "pending" },
      }),
    ]);
    return created;
  });

  const result = await conversation.external(() => buyStars(ctx.from!.username!, count));

  if (result.success && !result.pending) {
    await conversation.external(() =>
      prisma.starPurchase.update({ where: { id: purchase.id }, data: { status: "delivered" } })
    );
    await ctx.reply(t("stars.done"));
  } else if (result.success && result.pending) {
    await ctx.reply(t("stars.pending"));
  } else {
    await conversation.external(() =>
      prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { balance: { increment: totalCost } } }),
        prisma.starPurchase.update({ where: { id: purchase.id }, data: { status: "failed" } }),
      ])
    );
    await ctx.reply(t("stars.failed", { error: result.error ?? "xato" }));
  }
}