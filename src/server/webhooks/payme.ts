import { Router } from "express";
import { prisma } from "../../db/prisma.js";
import { notifyUser } from "../notify.js";
import { makeT, resolveLang } from "../../i18n/index.js";

const PAYME_MERCHANT_ID = process.env.PAYME_MERCHANT_ID ?? "";
const PAYME_KEY = process.env.PAYME_KEY ?? "";

export function buildPaymeLink(amountSum: number, merchantTransId: string): string {
  const amountTiyin = Math.round(amountSum * 100);
  const params = `m=${PAYME_MERCHANT_ID};ac.order_id=${merchantTransId};a=${amountTiyin}`;
  const encoded = Buffer.from(params).toString("base64");
  return `https://checkout.paycom.uz/${encoded}`;
}

// Коды ошибок Payme (стандартные для Checkout API)
const PaymeError = {
  InvalidAmount: -31001,
  TransactionNotFound: -31003,
  UnableToPerform: -31008,
  OrderNotFound: -31050,
};

function rpcResult(id: any, result: any) {
  return { jsonrpc: "2.0", id, result };
}
function rpcError(id: any, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

export const paymeRouter = Router();

paymeRouter.post("/", async (req, res) => {
  // Basic Auth: Paycom:{PAYME_KEY}
  const auth = req.headers.authorization ?? "";
  const expected = "Basic " + Buffer.from(`Paycom:${PAYME_KEY}`).toString("base64");
  if (auth !== expected) {
    return res.status(200).json(rpcError(req.body?.id, -32504, "Unauthorized"));
  }

  const { method, params, id } = req.body ?? {};

  try {
    switch (method) {
      case "CheckPerformTransaction": {
        const orderId = params?.account?.order_id;
        const tx = await prisma.transaction.findUnique({ where: { merchantTransId: orderId } });
        if (!tx) return res.json(rpcError(id, PaymeError.OrderNotFound, "Заказ не найден"));
        if (Math.round(Number(tx.amount) * 100) !== params.amount) {
          return res.json(rpcError(id, PaymeError.InvalidAmount, "Неверная сумма"));
        }
        return res.json(rpcResult(id, { allow: true }));
      }

      case "CreateTransaction": {
        const orderId = params?.account?.order_id;
        const tx = await prisma.transaction.findUnique({ where: { merchantTransId: orderId } });
        if (!tx) return res.json(rpcError(id, PaymeError.OrderNotFound, "Заказ не найден"));

        // Идемпотентность: если уже создавали с этим params.id — вернуть тот же результат
        if (tx.providerTxId && tx.providerTxId !== params.id) {
          return res.json(rpcError(id, PaymeError.UnableToPerform, "Транзакция уже создана с другим id"));
        }

        await prisma.transaction.update({
          where: { id: tx.id },
          data: { providerTxId: params.id, status: "pending" },
        });

        return res.json(
          rpcResult(id, {
            create_time: Date.now(),
            transaction: tx.id,
            state: 1,
          })
        );
      }

      case "PerformTransaction": {
        const tx = await prisma.transaction.findFirst({ where: { providerTxId: params.id } });
        if (!tx) return res.json(rpcError(id, PaymeError.TransactionNotFound, "Транзакция не найдена"));

        if (tx.status !== "success") {
          await prisma.$transaction([
            prisma.transaction.update({ where: { id: tx.id }, data: { status: "success" } }),
            prisma.user.update({
              where: { id: tx.userId },
              data: { balance: { increment: tx.amount } },
            }),
          ]);
          const lang = await resolveLang(tx.userId);
          await notifyUser(tx.userId, makeT(lang)("topup.approved", { amount: Number(tx.amount) }));
        }

        return res.json(
          rpcResult(id, {
            transaction: tx.id,
            perform_time: Date.now(),
            state: 2,
          })
        );
      }

      case "CancelTransaction": {
        const tx = await prisma.transaction.findFirst({ where: { providerTxId: params.id } });
        if (!tx) return res.json(rpcError(id, PaymeError.TransactionNotFound, "Транзакция не найдена"));

        const wasSuccess = tx.status === "success";
        await prisma.transaction.update({ where: { id: tx.id }, data: { status: "cancelled" } });
        if (wasSuccess) {
          await prisma.user.update({ where: { id: tx.userId }, data: { balance: { decrement: tx.amount } } });
          await notifyUser(tx.userId, `❌ Платёж отменён, ${tx.amount} сум списано обратно`);
        } else {
          await notifyUser(tx.userId, "❌ Оплата не прошла");
        }

        return res.json(
          rpcResult(id, {
            transaction: tx.id,
            cancel_time: Date.now(),
            state: -1,
          })
        );
      }

      case "CheckTransaction": {
        const tx = await prisma.transaction.findFirst({ where: { providerTxId: params.id } });
        if (!tx) return res.json(rpcError(id, PaymeError.TransactionNotFound, "Транзакция не найдена"));
        return res.json(
          rpcResult(id, {
            create_time: tx.createdAt.getTime(),
            perform_time: tx.status === "success" ? tx.updatedAt.getTime() : 0,
            cancel_time: tx.status === "cancelled" ? tx.updatedAt.getTime() : 0,
            transaction: tx.id,
            state: tx.status === "success" ? 2 : tx.status === "cancelled" ? -1 : 1,
          })
        );
      }

      default:
        return res.json(rpcError(id, -32601, "Метод не поддерживается"));
    }
  } catch (e) {
    return res.json(rpcError(id, -32400, "Внутренняя ошибка сервера"));
  }
});
