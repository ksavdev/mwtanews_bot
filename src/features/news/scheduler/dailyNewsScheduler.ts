// src/features/news/scheduler/dailyNewsScheduler.ts
import { Bot } from 'grammy';
import cron from 'node-cron';
import { pool } from '@/core/db';
import { sendDailyNews } from '@/features/news/commands/dailyNews';
import type { BotCtx } from '@/core/bot';

interface UserPrefs {
  tg_id: number;
  tz_id: string;  // хранит строки вида "UTC", "UTC+3", "UTC-2" или уже IANA-зону
}

/**
 * Конвертирует метки "UTC+3"/"UTC-2"/"UTC" в валидные IANA
 * Etc/GMT-инверсия используется по стандарту (знак меняется).
 */
function offsetToIana(label: string): string {
  if (label === 'UTC') return 'Etc/UTC';
  const m = label.match(/^UTC([+-]\d{1,2})$/);
  if (m) {
    const offset = Number(m[1]);
    // инвертируем знак: UTC+3 → Etc/GMT-3, UTC-5 → Etc/GMT+5
    const inverted = -offset;
    return `Etc/GMT${inverted >= 0 ? `+${inverted}` : inverted}`;
  }
  // Если label уже был IANA-зоной (например Europe/Moscow), возвращаем напрямую
  return label;
}

/**
 * Запускает cron-таск, который каждый час проверяет
 * — есть ли у кого сейчас 09:00 по их часовому поясу.
 */
export function startDailyNewsScheduler(bot: Bot<BotCtx>) {
  // cron-выражение "0 * * * *" = каждую ЗЕРОВУЮ минуту каждого часа
  cron.schedule('0 * * * *', async () => {
    const now = new Date();
    let rows: UserPrefs[];
    try {
      const res = await pool.query<UserPrefs>(
        'SELECT tg_id, tz_id FROM user_settings',
      );
      rows = res.rows;
    } catch (err) {
      console.error('[scheduler] ошибка чтения user_settings:', err);
      return;
    }

    for (const { tg_id, tz_id } of rows) {
      const zone = offsetToIana(tz_id);
      let userTime: Date;
      try {
        // Получаем локальное время пользователя
        const str = now.toLocaleString('en-US', { timeZone: zone });
        userTime = new Date(str);
      } catch (e) {
        console.error(
          `[scheduler] неверная временная зона ${tz_id} → ${zone}`,
          e,
        );
        continue;
      }

      // Если в этот час у пользователя ровно 09:00 – отсылаем дайли
      if (userTime.getHours() === 9) {
        try {
          await sendDailyNews(bot, tg_id);
        } catch (e) {
          console.error(`[scheduler] не смог отправить daily news ${tg_id}:`, e);
        }
      }
    }
  });
}
