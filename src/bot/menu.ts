import { InlineKeyboard, Keyboard } from "grammy";
import { makeT } from "../i18n/index.js";
import type { Lang } from "../i18n/index.js";

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

export function courseMenu(lang: Lang, priceSolo: number, priceBundle: number): InlineKeyboard {
  const t = makeT(lang);
  return new InlineKeyboard()
    .text(t("course.solo", { price: priceSolo }), "course:solo")
    .row()
    .text(t("course.bundle", { price: priceBundle }), "course:bundle")
    .row()
    .text(t("menu.back"), "nav:back");
}

export const NUMBER_PRICE_KEYS: Record<string, string> = {
  usa: "price_number_usa",
  indonesia: "price_number_indonesia",
  malaysia: "price_number_malaysia",
  philippines: "price_number_philippines",
  kenya: "price_number_kenya",
};

export function numbersMenu(lang: Lang, prices: Record<string, number>): InlineKeyboard {
  const t = makeT(lang);
  return new InlineKeyboard()
    .text(t("numbers.usa", { price: prices.usa }), "numbers:usa")
    .row()
    .text(t("numbers.indonesia", { price: prices.indonesia }), "numbers:indonesia")
    .row()
    .text(t("numbers.malaysia", { price: prices.malaysia }), "numbers:malaysia")
    .row()
    .text(t("numbers.philippines", { price: prices.philippines }), "numbers:philippines")
    .row()
    .text(t("numbers.kenya", { price: prices.kenya }), "numbers:kenya")
    .row()
    .text(t("menu.back"), "nav:back");
}