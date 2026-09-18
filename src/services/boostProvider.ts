import axios from "axios";

/**
 * Обёртка над внешней SMM-панелью для накрутки (подписчики/просмотры/лайки).
 * Большинство панелей (JAP, SMMflow, любая на движке Perfect Panel) используют
 * один и тот же API-контракт: POST с полями key/action/service/link/quantity.
 * Меняешь SMM_API_URL + SMM_API_KEY + карту SERVICE_ID_MAP под своего поставщика —
 * остальной код бота трогать не нужно.
 */

const SMM_API_URL = process.env.SMM_API_URL ?? "";
const SMM_API_KEY = process.env.SMM_API_KEY ?? "";

// service-код в нашей БД -> ID услуги у поставщика SMM-панели
const SERVICE_ID_MAP: Record<string, string> = {
  yt_subs: process.env.SMM_SERVICE_ID_YT_SUBS ?? "",
  yt_views: process.env.SMM_SERVICE_ID_YT_VIEWS ?? "",
  yt_likes: process.env.SMM_SERVICE_ID_YT_LIKES ?? "",
};

export interface BoostPlaceResult {
  success: boolean;
  providerOrderId?: string;
  error?: string;
}

export async function placeBoostOrder(
  service: string,
  link: string,
  quantity: number
): Promise<BoostPlaceResult> {
  const providerServiceId = SERVICE_ID_MAP[service];
  if (!providerServiceId) {
    return { success: false, error: `Нет привязки service_id для ${service}` };
  }
  try {
    const { data } = await axios.post(SMM_API_URL, {
      key: SMM_API_KEY,
      action: "add",
      service: providerServiceId,
      link,
      quantity,
    });
    if (data?.order) {
      return { success: true, providerOrderId: String(data.order) };
    }
    return { success: false, error: data?.error ?? "Неизвестная ошибка панели" };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Ошибка запроса к SMM-панели" };
  }
}

export type BoostStatus = "Pending" | "In progress" | "Completed" | "Partial" | "Canceled" | "Unknown";

export async function checkBoostStatus(providerOrderId: string): Promise<BoostStatus> {
  try {
    const { data } = await axios.post(SMM_API_URL, {
      key: SMM_API_KEY,
      action: "status",
      order: providerOrderId,
    });
    return (data?.status as BoostStatus) ?? "Unknown";
  } catch {
    return "Unknown";
  }
}
