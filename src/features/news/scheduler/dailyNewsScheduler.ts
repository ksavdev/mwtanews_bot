import 'dotenv/config';
import { Bot } from 'grammy';
import cron from 'node-cron';
import { pool } from '@/core/db';
import { sendDailyNews } from '@/features/news/commands/dailyNews';
import type { BotCtx } from '@/core/bot';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

interface UserPrefs {
  tg_id: number;
  tz_id: string;
}

function offsetToIana(label: string): string {
  if (label === 'UTC') return 'Etc/UTC';
  const m = label.match(/^UTC([+-]\d{1,2})$/);
  if (m) {
    const offset = Number(m[1]);
    const inverted = -offset;
    return `Etc/GMT${inverted >= 0 ? `+${inverted}` : inverted}`;
  }
  return label;
}

export function startDailyNewsScheduler(bot: Bot<BotCtx>) {
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const TARGET_HOUR = parseInt(process.env.DAILY_NEWS_HOUR ?? '9', 10);
    const TARGET_MINUTE = parseInt(process.env.DAILY_NEWS_MINUTE ?? '0', 10);
    console.log(
      `[scheduler] tick at ${now.toISOString()}; target ${TARGET_HOUR}:${TARGET_MINUTE
        .toString()
        .padStart(2, '0')}`
    );

    const batchSize = 100;
    let offset = 0;
    while (true) {
      let res;
      try {
        res = await pool.query<UserPrefs>(
          'SELECT tg_id, tz_id FROM user_settings LIMIT $1 OFFSET $2',
          [batchSize, offset]
        );
      } catch (err) {
        console.error('[scheduler] ошибка чтения user_settings:', err);
        break;
      }

      if (res.rowCount === 0) break;

      for (const { tg_id, tz_id } of res.rows) {
        const zone = offsetToIana(tz_id);
        let localTime;
        try {
          localTime = dayjs().tz(zone);
        } catch (e) {
          console.error(
            `[scheduler] ошибка расчёта времени для tz_id "${tz_id}" → "${zone}":`,
            e
          );
          continue;
        }

        console.log(
          `[scheduler] user=${tg_id}, tz_id="${tz_id}", iana="${zone}", localTime=${localTime.format()}`
        );

        if (localTime.hour() === TARGET_HOUR && localTime.minute() === TARGET_MINUTE) {
          console.log(`[scheduler] отправляем daily news для ${tg_id}`);
          try {
            await sendDailyNews(bot, tg_id);
          } catch (e) {
            console.error(`[scheduler] не смог отправить daily news для ${tg_id}:`, e);
          }
        }
      }

      offset += batchSize;
    }
  });
}