import type { Bot } from "grammy";
import type { MyContext } from "../bot/types.js";

let botInstance: Bot<MyContext> | null = null;

export function registerBotForNotify(bot: Bot<MyContext>) {
  botInstance = bot;
}

export async function notifyUser(userId: bigint, text: string) {
  if (!botInstance) return;
  try {
    await botInstance.api.sendMessage(Number(userId), text);
  } catch {
    // пользователь мог заблокировать бота — игнорируем
  }
}
