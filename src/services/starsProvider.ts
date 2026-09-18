/**
 * Покупка Telegram Stars от лица пользователя — не официальный Bot API метод
 * (Stars пользователь обычно покупает сам через Apple/Google IAP внутри Telegram).
 * Рабочий вариант для таких ботов в СНГ — Fragment.com (покупка Stars за TON
 * на @username получателя, неофициальный API). Реализация вынесена сюда отдельным
 * модулем: если решишь сменить поставщика — меняешь только этот файл.
 *
 * Ниже — заглушка с понятным контрактом. Подставь реальный вызов Fragment API
 * или процесс ручной выдачи админом (тогда buyStars просто создаёт заявку
 * админу и возвращает pending=true, а статус закрывается вручную командой).
 */

export interface StarsPurchaseResult {
  success: boolean;
  pending?: boolean; // true если выдача требует ручного подтверждения админом
  txHash?: string;
  error?: string;
}

export async function buyStars(username: string, count: number): Promise<StarsPurchaseResult> {
  // TODO: заменить на реальный вызов Fragment API либо на ручную очередь для админа.
  // Временная безопасная заглушка — всегда уходит в очередь на ручное подтверждение,
  // чтобы бот не "терял" деньги пользователей до подключения реального провайдера.
  return { success: true, pending: true };
}
