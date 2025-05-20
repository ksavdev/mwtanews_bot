// src/scheduler/dailyNewsScheduler.ts
import cron from "node-cron";
import { DateTime } from "luxon";
import { pool } from "../db.js";
import { Bot } from "grammy";
import type { OuterCtx } from "../bot.js";
import { sendDailyNews } from "../commands/dailyNews.js";

interface Row {
  tg_id: number;
  tz_id: string;
  last_daily_sent: Date | null;
}

/** Форматирует 2-значное число (07, 15, 00) */
const pad = (n: number) => n.toString().padStart(2, "0");

export function startDailyNewsScheduler(bot: Bot<OuterCtx>) {
  // каждые 60 с проверяем, у кого наступило нужное время
  cron.schedule("* * * * *", async () => {
    const utcNow = DateTime.utc();

    // все пользователи
    const { rows } = await pool.query<Row>(
      "SELECT tg_id, tz_id, last_daily_sent FROM user_settings",
    );

    for (const u of rows) {
      const local = utcNow.setZone(u.tz_id);

      // уже отправляли сегодня?
      const alreadySent =
        u.last_daily_sent &&
        DateTime.fromJSDate(u.last_daily_sent).hasSame(local, "day");

      // ровно 15:00:00 и не отправляли
      if (local.hour === 15 && local.minute === 0 && !alreadySent) {
        await sendDailyNews(bot as any, u.tg_id);

        // лог строки вида: [SCHEDULER] 15:00:00 → sent daily news to 890360195 (Europe/Moscow)
        console.log(
          `[SCHEDULER] ${pad(local.hour)}:${pad(local.minute)}:${pad(local.second)} ` +
          `→ sent daily news to ${u.tg_id} (${u.tz_id})`,
        );

        // отметим отправку
        await pool.query(
          "UPDATE user_settings SET last_daily_sent = CURRENT_DATE WHERE tg_id = $1",
          [u.tg_id],
        );
      }
    }
  });

  console.log("⏰ Daily-news scheduler started");
}
