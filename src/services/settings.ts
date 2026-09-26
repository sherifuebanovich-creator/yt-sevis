import { prisma } from "../db/prisma.js";

const DEFAULTS: Record<string, string> = {
  star_rate: "180", // сум за 1 звезду
  min_topup: "1000", // мин. пополнение в сумах
  price_create_channel: "150000",
  price_connect_monetization: "100000",
  price_yt_subs_per_1000: "60000",
  price_yt_views_per_1000: "15000",
  price_yt_likes_per_1000: "20000",
  card_number: "5614 6835 1197 1202", // номер карты для оплаты (по скриншоту)
  card_holder: "S S", // ФИО получателя
};

export async function getSetting(key: string): Promise<string> {
  const row = await prisma.settings.findUnique({ where: { key } });
  if (row) return row.value;
  return DEFAULTS[key] ?? "0";
}

export async function getSettingNumber(key: string): Promise<number> {
  return Number(await getSetting(key));
}

export async function setSetting(key: string, value: string): Promise<void> {
  await prisma.settings.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function ensureUser(id: bigint, username?: string) {
  return prisma.user.upsert({
    where: { id },
    update: { username },
    create: { id, username, balance: 0, lang: "uz" },
  });
}
