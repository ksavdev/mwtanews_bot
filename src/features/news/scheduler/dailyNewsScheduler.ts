// src/features/news/scheduler/dailyNewsScheduler.ts
import 'dotenv/config';            // должен быть первым
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
 * Конвертирует метки "UTC+3"/"UTC-2"/"UTC" в валидные IANA.
 * В стандарте POSIX знак инвертируется: 
 *  UTC+3 → Etc/GMT-3, UTC-5 → Etc/GMT+5.
 */
function offsetToIana(label: string): string {
  if (label === 'UTC') return 'Etc/UTC';
  const m = label.match(/^UTC([+-]\d{1,2})$/);
  if (m) {
    const offset = Number(m[1]);
    const inverted = -offset;
    return `Etc/GMT${inverted >= 0 ? `+${inverted}` : inverted}`;
  }
  // Если уже IANA-зона
  return label;
}

/**
 * Запускает cron-таск по расписанию из ENV (час и минута).
 */
export function startDailyNewsScheduler(bot: Bot<BotCtx>) {
  // Расписание запускаем каждую минуту, чтобы точнее ловить нужную минуту
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const TARGET_HOUR   = parseInt(process.env.DAILY_NEWS_HOUR  ?? '9', 10);
    const TARGET_MINUTE = parseInt(process.env.DAILY_NEWS_MINUTE ?? '0', 10);

    console.log(
      `[scheduler] tick at ${now.toISOString()}; ` +
      `target ${TARGET_HOUR}:${TARGET_MINUTE.toString().padStart(2,'0')}`
    );

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
        const localString = now.toLocaleString('en-US', { timeZone: zone });
        userTime = new Date(localString);
      } catch (e) {
        console.error(`[scheduler] неверная временная зона "${tz_id}" → "${zone}":`, e);
        continue;
      }

      console.log(
        `[scheduler] user=${tg_id}, tz_id="${tz_id}", ` +
        `iana="${zone}", userTime=${userTime.toISOString()}`
      );

      if (
        userTime.getHours()   === TARGET_HOUR  &&
        userTime.getMinutes() === TARGET_MINUTE
      ) {
        console.log(`[scheduler] отправляем daily news для ${tg_id}`);
        try {
          await sendDailyNews(bot, tg_id);
        } catch (e) {
          console.error(`[scheduler] не смог отправить daily news для ${tg_id}:`, e);
        }
      }
    }
  });
}
