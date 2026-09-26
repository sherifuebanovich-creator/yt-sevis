import type { Bot } from "grammy";

/**
 * 409 Conflict: terminated by other getUpdates request.
 *
 * На каждом деплое на Render это штатная гонка: новый инстанс стартует
 * раньше, чем старый успел отпустить long polling. Раньше это приводило
 * к process.exit(1) и crash-loop, причём Render показывал "live",
 * потому что трафик держал старый процесс с прошлым кодом.
 *
 * grammY сбрасывает pollingRunning в finally, поэтому bot.start()
 * можно вызывать повторно на том же инстансе.
 *
 * Вызывать без await: функция возвращается сразу, polling идёт в фоне.
 */
export function startPolling(bot: Bot<any>, name: string, fatal = false): void {
  void (async () => {
    for (let attempt = 1; ; attempt++) {
      // bot.start() не резолвится, пока polling жив — он возвращает управление
      // только при остановке. Поэтому «запущен» пишем ДО await, иначе строка
      // никогда не появится и в логах будет пустота при живом боте.
      console.log(`${name}: запускаю long polling (попытка ${attempt})`);
      try {
        await bot.start();
        console.log(`${name}: long polling остановлен`);
        return;
      } catch (err: any) {
        const message = err?.message ?? String(err);
        if (!message.includes("409")) {
          console.error(`${name}: неустранимая ошибка polling:`, message);
          if (fatal) process.exit(1);
          return;
        }
        const wait = Math.min(3000 * attempt, 20000);
        console.error(
          `${name}: 409 — старый инстанс ещё держит getUpdates, повтор через ${wait / 1000}с (попытка ${attempt})`
        );
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  })();
}
