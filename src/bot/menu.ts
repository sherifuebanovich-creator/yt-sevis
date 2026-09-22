import { InlineKeyboard, Keyboard } from "grammy";
import { makeT, type Lang } from "../i18n/index.js";

export function mainMenu(lang: Lang = "uz"): Keyboard {
  const t = makeT(lang);
  return new Keyboard()
    .text(t("menu.createChannel"))
    .text(t("menu.connectMonetization"))
    .row()
    .text(t("menu.boost"))
    .text(t("menu.stars"))
    .row()
    .text(t("menu.topup"))
    .text(t("menu.settings"))
    .resized();
}

export function settingsMenu(lang: Lang = "uz"): InlineKeyboard {
  const t = makeT(lang);
  return new InlineKeyboard()
    .text(t("settings.balance"), "settings:balance")
    .row()
    .text(t("settings.orders"), "settings:orders")
    .row()
    .text(t("settings.history"), "settings:history")
    .row()
    .text(t("settings.starrate"), "settings:starrate")
    .row()
    .text(t("settings.language"), "settings:lang");
}

export function boostServiceMenu(lang: Lang = "uz"): InlineKeyboard {
  const t = makeT(lang);
  return new InlineKeyboard()
    .text(t("boost.subs"), "boost:yt_subs")
    .row()
    .text(t("boost.views"), "boost:yt_views")
    .row()
    .text(t("boost.likes"), "boost:yt_likes");
}