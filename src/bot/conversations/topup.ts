import { InlineKeyboard } from "grammy";
import type { MyContext, MyConversation } from "../types.js";
import { prisma } from "../../db/prisma.js";
import { getSetting, getSettingNumber } from "../../services/settings.js";
import { makeT, resolveLang } from "../../i18n/index.js";
import { notifyAdminPhoto } from "../../services/notifyAdmin.js";

function formatDateTime(lang: "ru" | "uz", date: Date): string {
  return new Intl.DateTimeFormat(lang === "uz" ? "uz-UZ" : "ru-RU", {
    timeZone: "Asia/Tashkent",
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export async function topupConversation(conversation: MyConversation, ctx: MyContext) {
  const lang = await conversation.external(() => resolveLang(ctx.from!.id));
  const t = makeT(lang);
  const minTopup = await conversation.external(() => getSettingNumber("min_topup"));

  await ctx.reply(t("topup.amount", { min: minTopup }));

  let amount = 0;
  while (true) {
    const msg = await conversation.waitFor("message:text");
    const parsed = Number(msg.message.text.replace(/[^\d]/g, ""));
    if (!parsed || parsed < minTopup) {
      await ctx.reply(t("topup.invalid", { min: minTopup }));
      continue;
    }
    amount = parsed;
    break;
  }

  const userId = BigInt(ctx.from!.id);

  const [cardNumber, cardHolder] = await conversation.external(() =>
    Promise.all([getSetting("card_number"), getSetting("card_holder")])
  );
  if (!cardNumber || !cardHolder) {
    await ctx.reply(t("topup.cardNotConfigured"));
    return;
  }

  await ctx.reply(t("topup.cardDetails", { amount, cardNumber, cardHolder }));
  await ctx.reply(t("topup.awaitScreenshot"));

  const photoMsg = await conversation.waitFor("message:photo");
  const merchantTransId = `card_${userId}_${Date.now()}`;
  const tx = await conversation.external(() =>
    prisma.transaction.create({
      data: { userId, provider: "card", amount, merchantTransId, status: "pending" },
    })
  );

  const kb = new InlineKeyboard()
    .text(t("topup.approve"), `pay_ok:${tx.id}`)
    .text(t("topup.reject"), `pay_no:${tx.id}`);

  const username = ctx.from?.username ? `@${ctx.from.username}` : String(userId);
  const caption = [
    t("topup.newPayment"),
    t("topup.sum", { amount }),
    t("topup.user", { user: username }),
    t("topup.time", { time: formatDateTime(lang, new Date()) }),
  ].join("\n");

  const photo = photoMsg.message.photo[photoMsg.message.photo.length - 1];
  await conversation.external(() => notifyAdminPhoto(photo.file_id, caption, kb));
  await ctx.reply(t("topup.screenshotDone"));
}