import { Bot, InlineKeyboard, InputFile } from "grammy";
import axios from "axios";
import { prisma } from "../db/prisma.js";
import { makeT, resolveLang } from "../i18n/index.js";
import { startPolling } from "../bot/polling.js";

const NOTIFY_BOT_TOKEN = process.env.NOTIFY_BOT_TOKEN ?? "";
const NOTIFY_ADMIN_CHAT_ID = process.env.NOTIFY_ADMIN_CHAT_ID ?? "";
const BUYER_BOT_TOKEN = process.env.BOT_TOKEN ?? "";

let notifyBot: Bot | null = null;
let buyerBot: Bot | null = null;
let started = false;

function userLabel(username: string | undefined, id: number | bigint): string {
  return username ? `@${username}` : String(id);
}

export function orderInfoText(opts: {
  kind: string;
  username?: string;
  userId: number | bigint;
  what: string;
  amount: string | number;
  extra?: string[];
}): string {
  const lines = [
    `${opts.kind}`,
    `👤 Ism/username: ${userLabel(opts.username, opts.userId)}`,
    `🆔 ID: ${opts.userId}`,
    `📦 Nima sotib olindi: ${opts.what}`,
    `💰 To'lov: ${opts.amount}`,
  ];
  for (const e of opts.extra ?? []) lines.push(e);
  return lines.join("\n");
}

/** Админ (тот, кто нажал /start в боте-уведомителе) */
async function isNotifyAdmin(userId: number): Promise<boolean> {
  const row = await prisma.settings.findUnique({ where: { key: "admin_ids" } });
  const ids = new Set((row?.value ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  ids.add(NOTIFY_ADMIN_CHAT_ID);
  return ids.has(String(userId));
}

function resolveNotifyChatId(row: { value?: string | null } | null): string | null {
  return row?.value || null;
}

/** Обновить подпись фото-сообщения с оплатой и убрать кнопки у админа */
async function finishPaymentEdit(ctx: any, caption: string): Promise<void> {
  if (!notifyBot) return;
  const msg = ctx.callbackQuery?.message as { chat?: { id: number }; message_id?: number } | undefined;
  if (!msg?.chat || !msg.message_id) return;
  try {
    await notifyBot.api.editMessageCaption(msg.chat.id, msg.message_id, {
      caption,
      reply_markup: { inline_keyboard: [] },
    });
  } catch {
    // сообщение могло быть удалено или измениться — игнорируем
  }
}

export async function startNotifyBot(): Promise<void> {
  if (started || !NOTIFY_BOT_TOKEN) return;
  started = true;
  notifyBot = new Bot(NOTIFY_BOT_TOKEN);

  // Приветствие админу — только узбекский
  notifyBot.command("start", async (ctx) => {
    const chatId = String(ctx.chat.id);
    const adminId = String(ctx.from!.id);
    await prisma.settings.upsert({
      where: { key: "notify_chat_id" },
      update: { value: chatId },
      create: { key: "notify_chat_id", value: chatId },
    });
    const row = await prisma.settings.findUnique({ where: { key: "admin_ids" } });
    const ids = new Set((row?.value ?? "").split(",").map((s) => s.trim()).filter(Boolean));
    ids.add(adminId);
    await prisma.settings.upsert({
      where: { key: "admin_ids" },
      update: { value: [...ids].join(",") },
      create: { key: "admin_ids", value: adminId },
    });
    await ctx.reply(
      "✅ Xush kelibsiz! Admin bot.\n\nBu botga barcha to'lovlar va arizalar tushadi.\n\n• 💳 To'lovni tasdiqlash — «✅ Tasdiqlash» tugmasi\n• ❌ Rad etish — «❌ Rad etish» tugmasi\n\nTasdiqlangach pul mijoz balansiga tushadi va mijozga bildirishnoma yuboriladi."
    );
  });

  // ---- Оплата по карте (скриншот) ----
  notifyBot.callbackQuery(/^pay_ok:(.+)$/, async (ctx) => {
    if (!(await isNotifyAdmin(ctx.from!.id))) {
      return ctx.answerCallbackQuery({ text: "⚠️ Siz admin emassiz" });
    }
    const txId = ctx.match![1];
    const result = await prisma.$transaction(async (p) => {
      const tx = await p.transaction.findUnique({ where: { id: txId } });
      if (!tx || tx.status !== "pending") return { ok: false as const, status: tx?.status ?? "not_found" };
      await p.transaction.update({ where: { id: txId }, data: { status: "success" } });
      await p.user.update({ where: { id: tx.userId }, data: { balance: { increment: tx.amount } } });
      return { ok: true as const, userId: tx.userId, amount: Number(tx.amount) };
    });

    if (!result.ok) {
      return ctx.answerCallbackQuery({ text: result.status === "success" ? "✅ Allaqachon tasdiqlangan" : "⚠️ Holat o'zgarmagan" });
    }

    const lang = await resolveLang(result.userId);
    const t = makeT(lang);
    await notifyBuyer(result.userId, t("topup.approved", { amount: result.amount }));
    await ctx.answerCallbackQuery({ text: `✅ Tasdiqlandi: ${result.amount} so'm` });
    await finishPaymentEdit(ctx, `✅ TASDIQLANDI\n\n💳 Summa: ${result.amount} so'm`);
  });

  notifyBot.callbackQuery(/^pay_no:(.+)$/, async (ctx) => {
    if (!(await isNotifyAdmin(ctx.from!.id))) {
      return ctx.answerCallbackQuery({ text: "⚠️ Siz admin emassiz" });
    }
    const txId = ctx.match![1];
    const updated = await prisma.transaction.updateMany({
      where: { id: txId, status: "pending" },
      data: { status: "failed" },
    });
    if (updated.count === 0) {
      return ctx.answerCallbackQuery({ text: "⚠️ To'lov allaqachon ko'rib chiqilgan" });
    }
    const tx = await prisma.transaction.findUnique({ where: { id: txId } });
    const lang = tx ? await resolveLang(tx.userId) : "uz";
    const t = makeT(lang);
    if (tx) await notifyBuyer(tx.userId, t("topup.rejected"));
    await ctx.answerCallbackQuery({ text: "❌ Rad etildi" });
    await finishPaymentEdit(ctx, `❌ RAD ETILDI\n\n💳 Summa: ${tx ? Number(tx.amount) : ""} so'm`);
  });

  // ---- Заявки: курс / номера ----
  notifyBot.callbackQuery(/^order_done:([^:]+):(.+)$/, async (ctx) => {
    if (!(await isNotifyAdmin(ctx.from!.id))) return ctx.answerCallbackQuery({ text: "⚠️ Siz admin emassiz" });
    const [, orderId, userId] = ctx.match!;
    const order = await prisma.serviceOrder.update({
      where: { id: orderId },
      data: { status: "done" },
    }).catch(() => null);
    if (!order) return ctx.answerCallbackQuery({ text: "⚠️ Ariza topilmadi" });
    const lang = await resolveLang(BigInt(userId));
    await notifyBuyer(BigInt(userId), makeT(lang)("notify.orderApproved", { price: Number(order.price) }));
    await ctx.answerCallbackQuery({ text: "✅ Bajarildi" });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
  });

  notifyBot.callbackQuery(/^order_reject:([^:]+):(.+)$/, async (ctx) => {
    if (!(await isNotifyAdmin(ctx.from!.id))) return ctx.answerCallbackQuery({ text: "⚠️ Siz admin emassiz" });
    const [, orderId, userId] = ctx.match!;
    const order = await prisma.serviceOrder.update({
      where: { id: orderId },
      data: { status: "rejected" },
    }).catch(() => null);
    if (!order) return ctx.answerCallbackQuery({ text: "⚠️ Ariza topilmadi" });
    await prisma.user.update({ where: { id: BigInt(userId) }, data: { balance: { increment: order.price } } });
    const lang = await resolveLang(BigInt(userId));
    await notifyBuyer(BigInt(userId), makeT(lang)("notify.orderRejected", { amount: Number(order.price) }));
    await ctx.answerCallbackQuery({ text: "❌ Rad etildi" });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => undefined);
  });

  notifyBot.catch((err: any) => console.error("notify bot error:", err.message ?? err));
  await notifyBot.init();
  // 409 на деплое — штатная гонка со старым инстансом, startPolling переживает её
  startPolling(notifyBot, "Notify-бот");
  console.log("Notify-бот инициализирован");
}

export function getNotifyBot(): Bot | null {
  return notifyBot;
}

/** Основной бот, из которого отправляются уведомления покупателям (они стартовали именно его) */
export function setBuyerBot(bot: Bot<any>): void {
  buyerBot = bot;
}

export function getBuyerBot(): Bot | null {
  return buyerBot;
}

export async function notifyBuyer(userId: number | bigint, text: string): Promise<void> {
  const target = buyerBot ?? notifyBot;
  if (!target) return;
  try {
    await target.api.sendMessage(Number(userId), text);
  } catch (e: any) {
    console.error("buyer notify error:", e?.message ?? e);
  }
}

export async function notifyAdmin(text: string, markup?: any): Promise<void> {
  if (!notifyBot) return;
  let chatId: number | null;
  try {
    chatId = await resolveAdminChatId();
  } catch (e: any) {
    // БД недоступна — самый вероятный повод для алерта, но и доставить его
    // через БД не выйдет. В этом случае NOTIFY_ADMIN_CHAT_ID обязателен.
    console.error("notify chat lookup failed:", e?.message ?? e);
    return;
  }
  if (!chatId) return;
  try {
    await notifyBot.api.sendMessage(chatId, text, markup ? { reply_markup: markup } : {});
  } catch (e: any) {
    console.error("notify send error:", e?.message ?? e);
  }
}

/** Чат админа: сначала env, иначе тот, кто нажал /start в боте-уведомителе */
async function resolveAdminChatId(): Promise<number | null> {
  if (NOTIFY_ADMIN_CHAT_ID) return Number(NOTIFY_ADMIN_CHAT_ID);
  const row = await prisma.settings.findUnique({ where: { key: "notify_chat_id" } });
  const chatId = resolveNotifyChatId(row);
  return chatId ? Number(chatId) : null;
}

/** Отправить скриншот оплаты во второй (админский) бот */
export async function notifyAdminPhoto(fileId: string, caption: string, markup?: any): Promise<void> {
  if (!notifyBot) return;
  const chatId = await resolveAdminChatId().catch((e: any) => {
    console.error("notify chat lookup failed:", e?.message ?? e);
    return null;
  });
  if (!chatId) return;
  try {
    const buyer = getBuyerBot();
    if (buyer) {
      // file_id нельзя использовать между разными ботами —
      // качаем фото из основного бота и перезаливаем в админ-бот
      const f = await buyer.api.getFile(fileId);
      if (!f.file_path) throw new Error("file_path is empty");
      const url = `https://api.telegram.org/file/bot${BUYER_BOT_TOKEN}/${f.file_path}`;
      const res = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
      const photo = new InputFile(Buffer.from(res.data), "payment.jpg");
      await notifyBot.api.sendPhoto(chatId, photo, { caption, reply_markup: markup });
    } else {
      await notifyBot.api.sendPhoto(chatId, fileId, { caption, reply_markup: markup });
    }
  } catch (e: any) {
    console.error("notify photo error:", e?.message ?? e);
  }
}

/**
 * Отправить файл в админский чат. Используется бэкапами базы: диск Render
 * эфемерный, наружу файл не положить, а Telegram остаётся единственным
 * бесплатным надёжным хранилищем дампа.
 */
export async function notifyAdminDocument(
  buffer: Buffer,
  filename: string,
  caption: string
): Promise<boolean> {
  if (!notifyBot) return false;
  const chatId = await resolveAdminChatId().catch((e: any) => {
    console.error("notify chat lookup failed:", e?.message ?? e);
    return null;
  });
  if (!chatId) return false;
  try {
    const doc = new InputFile(buffer, filename);
    await notifyBot.api.sendDocument(chatId, doc, { caption });
    return true;
  } catch (e: any) {
    console.error("notify document error:", e?.message ?? e);
    return false;
  }
}