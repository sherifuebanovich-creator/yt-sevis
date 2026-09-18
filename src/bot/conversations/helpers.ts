import type { MyConversation, MyContext } from "../types.js";
import { makeT, type Lang } from "../../i18n/index.js";
import { mainMenu } from "../menu.js";

/** Wait for text; if user sends /command, abort conversation and show main menu → return null */
export async function waitForText(
  conversation: MyConversation,
  ctx: MyContext,
  lang: Lang,
): Promise<string | null> {
  const t = makeT(lang);
  const msg = await conversation.waitFor("message:text");
  const text = msg.message.text.trim();
  if (text.startsWith("/")) {
    await ctx.reply(t("start.welcome"), { reply_markup: mainMenu(lang) });
    return null;
  }
  return text;
}

/** Same but inside a while-loop: returns null to signal abort (caller must return) */
export async function waitForTextLoop(
  conversation: MyConversation,
  ctx: MyContext,
  lang: Lang,
): Promise<string | null> {
  const t = makeT(lang);
  const msg = await conversation.waitFor("message:text");
  const text = msg.message.text.trim();
  if (text.startsWith("/")) {
    await ctx.reply(t("start.welcome"), { reply_markup: mainMenu(lang) });
    return null;
  }
  return text;
}
