import { InlineKeyboard } from "grammy";
import type { MyContext, MyConversation } from "../types.js";
import { prisma } from "../../db/prisma.js";
import { getSettingNumber } from "../../services/settings.js";
import { makeT, resolveLang } from "../../i18n/index.js";

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID ?? "";

export async function youtubeOrderConversation(
  conversation: MyConversation,
  ctx: MyContext,
  type: "create_channel" | "connect_monetization"
) {
  const lang = await conversation.external(() => resolveLang(ctx.from!.id));
  const t = makeT(lang);
  const priceKey = type === "create_channel" ? "price_create_channel" : "price_connect_monetization";
  const price = await conversation.external(() => getSettingNumber(priceKey));

  if (type === "create_channel") {
    await ctx.reply(t("youtube.channelName"));
  } else {
    await ctx.reply(t("youtube.channelLink"));
  }
  const infoMsg = await conversation.waitFor("message:text");
  const channelUrl = type === "connect_monetization" ? infoMsg.message.text.trim() : null;
  const contactInfo = infoMsg.message.text.trim();

  await ctx.reply(t("youtube.contact"));
  const contactMsg = await conversation.waitFor("message:text");
  const contact = contactMsg.message.text.trim();

  const userId = BigInt(ctx.from!.id);
  const user = await conversation.external(() => prisma.user.findUnique({ where: { id: userId } }));

  if (!user || Number(user.balance) < price) {
    await ctx.reply(t("youtube.notEnough", { price, balance: Number(user?.balance ?? 0) }));
    return;
  }

  await ctx.reply(t("youtube.confirm", { price }));
  const confirmMsg = await conversation.waitFor("message:text");
  if (!/^(да|ha)$/i.test(confirmMsg.message.text.trim())) {
    await ctx.reply(t("youtube.cancelled"));
    return;
  }

  const order = await conversation.external(async () => {
    const [, created] = await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { balance: { decrement: price } } }),
      prisma.serviceOrder.create({
        data: {
          userId,
          type,
          price,
          channelUrl,
          contactInfo: `${contactInfo} | контакт: ${contact}`,
          status: "new",
        },
      }),
    ]);
    return created;
  });

  await ctx.reply(t("youtube.done"));

  if (ADMIN_CHAT_ID) {
    const kb = new InlineKeyboard()
      .text("▶️ В работу", `order:in_progress:${order.id}`)
      .row()
      .text("✅ Выполнено", `order:done:${order.id}`)
      .text("❌ Отклонить", `order:rejected:${order.id}`);
    await ctx.api.sendMessage(
      ADMIN_CHAT_ID,
      `🆕 Заявка #${order.id}\nТип: ${type}\nПользователь: ${ctx.from?.username ?? userId}\nДетали: ${order.contactInfo}\nСумма: ${price} сум`,
      { reply_markup: kb }
    );
  }
}