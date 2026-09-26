import { prisma } from "../db/prisma.js";

/**
 * Единый список админов.
 *
 * Раньше права проверялись в двух несвязанных местах: ADMIN_IDS из env
 * (admin.ts) и admin_ids из БД (notifyAdmin.ts). Человек, добавленный в один
 * список, не получал прав из другого. Теперь оба смотрят сюда.
 */
function envAdmins(): string[] {
  return (process.env.ADMIN_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function getAdminIds(): Promise<Set<string>> {
  const ids = new Set<string>(envAdmins());

  const row = await prisma.settings.findUnique({ where: { key: "admin_ids" } });
  for (const s of (row?.value ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    ids.add(s);
  }

  // В личных чатах chat id == user id, поэтому админский чат = админ.
  const chat = process.env.NOTIFY_ADMIN_CHAT_ID?.trim();
  if (chat) ids.add(chat);

  return ids;
}

export async function isAdminId(id: number | string | null | undefined): Promise<boolean> {
  if (id == null) return false;
  return (await getAdminIds()).has(String(id));
}

/** Кто в списке навсегда зашит в env — тех нельзя удалить командой. */
export function isLockedAdmin(id: string): boolean {
  return envAdmins().includes(id);
}

const KEY = "admin_ids";

export async function addAdminId(id: string): Promise<string[]> {
  const row = await prisma.settings.findUnique({ where: { key: KEY } });
  const list = (row?.value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!list.includes(id)) list.push(id);
  await prisma.settings.upsert({
    where: { key: KEY },
    create: { key: KEY, value: list.join(",") },
    update: { value: list.join(",") },
  });
  return list;
}

export async function removeAdminId(id: string): Promise<string[]> {
  const row = await prisma.settings.findUnique({ where: { key: KEY } });
  const list = (row?.value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const next = list.filter((s) => s !== id);
  await prisma.settings.upsert({
    where: { key: KEY },
    create: { key: KEY, value: next.join(",") },
    update: { value: next.join(",") },
  });
  return next;
}
