import { Router } from "express";
import crypto from "node:crypto";
import { prisma } from "../../db/prisma.js";
import { notifyUser } from "../notify.js";
import { makeT, resolveLang } from "../../i18n/index.js";

const CLICK_MERCHANT_ID = process.env.CLICK_MERCHANT_ID ?? "";
const CLICK_SERVICE_ID = process.env.CLICK_SERVICE_ID ?? "";
const CLICK_SECRET_KEY = process.env.CLICK_SECRET_KEY ?? "";

export function buildClickLink(amountSum: number, merchantTransId: string): string {
  const params = new URLSearchParams({
    service_id: CLICK_SERVICE_ID,
    merchant_id: CLICK_MERCHANT_ID,
    amount: String(amountSum),
    transaction_param: merchantTransId,
  });
  return `https://my.click.uz/services/pay?${params.toString()}`;
}

function checkSign(body: Record<string, any>, withPrepareId: boolean): boolean {
  const parts = withPrepareId
    ? [
        body.click_trans_id,
        body.service_id,
        CLICK_SECRET_KEY,
        body.merchant_trans_id,
        body.merchant_prepare_id,
        body.amount,
        body.action,
        body.sign_time,
      ]
    : [
        body.click_trans_id,
        body.service_id,
        CLICK_SECRET_KEY,
        body.merchant_trans_id,
        body.amount,
        body.action,
        body.sign_time,
      ];
  const expected = crypto.createHash("md5").update(parts.join("")).digest("hex");
  return expected === body.sign_string;
}

export const clickRouter = Router();

// action = 0: Prepare
clickRouter.post("/prepare", async (req, res) => {
  const body = req.body;
  const tx = await prisma.transaction.findUnique({ where: { merchantTransId: body.merchant_trans_id } });

  if (!checkSign(body, false)) {
    return res.json({ error: -1, error_note: "Неверная подпись" });
  }
  if (!tx) {
    return res.json({ error: -5, error_note: "Заказ не найден" });
  }
  if (Number(tx.amount) !== Number(body.amount)) {
    return res.json({ error: -2, error_note: "Неверная сумма" });
  }

  await prisma.transaction.update({ where: { id: tx.id }, data: { providerTxId: body.click_trans_id } });

  return res.json({
    click_trans_id: body.click_trans_id,
    merchant_trans_id: body.merchant_trans_id,
    merchant_prepare_id: tx.id,
    error: 0,
    error_note: "Success",
  });
});

// action = 1: Complete
clickRouter.post("/complete", async (req, res) => {
  const body = req.body;
  const tx = await prisma.transaction.findUnique({ where: { merchantTransId: body.merchant_trans_id } });

  if (!checkSign(body, true)) {
    return res.json({ error: -1, error_note: "Неверная подпись" });
  }
  if (!tx) {
    return res.json({ error: -5, error_note: "Заказ не найден" });
  }

  if (Number(body.error) < 0) {
    await prisma.transaction.update({ where: { id: tx.id }, data: { status: "failed" } });
    await notifyUser(tx.userId, "❌ Оплата не прошла");
    return res.json({
      click_trans_id: body.click_trans_id,
      merchant_trans_id: body.merchant_trans_id,
      merchant_confirm_id: tx.id,
      error: -9,
      error_note: "Отменено",
    });
  }

  if (tx.status !== "success") {
    await prisma.$transaction([
      prisma.transaction.update({ where: { id: tx.id }, data: { status: "success" } }),
      prisma.user.update({ where: { id: tx.userId }, data: { balance: { increment: tx.amount } } }),
    ]);
    const lang = await resolveLang(tx.userId);
    await notifyUser(tx.userId, makeT(lang)("topup.approved", { amount: Number(tx.amount) }));
  }

  return res.json({
    click_trans_id: body.click_trans_id,
    merchant_trans_id: body.merchant_trans_id,
    merchant_confirm_id: tx.id,
    error: 0,
    error_note: "Success",
  });
});
