/* ─────────── src/commands/dailyNews.ts ───────────
   /daily_news — календарь на сегодня + логирование
   ------------------------------------------------- */

import { Bot } from "grammy";
import { DateTime } from "luxon";
import type { OuterCtx } from "../bot.js";
import { getTodayEvents } from "../lib/teApi.js";
import { pool } from "../db.js";

/* ====== настройки логов ====== */
const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const info = (...a: unknown[]) => console.log("[INFO]", ...a);
const debug = (...a: unknown[]) => {
  if (LOG_LEVEL === "debug") console.log("[DEBUG]", ...a);
};

/* эмодзи по уровню */
const mark = ["🟢", "🟡", "🔴"];

/* ISO‑коды, которые поддерживает TradingEconomics */
const ISO: Record<string, true> = {
  it: true, zh: true, ru: true, es: true, pl: true, tr: true, ja: true,
  pt: true, da: true, fa: true, ko: true, fr: true, no: true, id: true,
  de: true, hu: true, ar: true, sv: true,
};

/* ───────── SQL helper ───────── */
interface PrefRow {
  tz_id: string;
  importance: number;
  lang: string;
}
async function getPrefs(tgId: number): Promise<PrefRow | null> {
  const { rows } = await pool.query<PrefRow>(
    "SELECT tz_id, importance, lang FROM user_settings WHERE tg_id=$1",
    [tgId],
  );
  return rows[0] ?? null;
}

/* ───────── команда ───────── */
export function dailyNewsCommand(bot: Bot<OuterCtx>) {
  bot.command("daily_news", async (ctx) => {
    const uid = ctx.from!.id;

    /* 1. настройки пользователя */
    const pref = await getPrefs(uid);
    if (!pref) return ctx.reply("Сначала введите /start 🙂");

    /* 2. грузим календарь TE */
    const lang = ISO[pref.lang] ? pref.lang : "en";
    let raw;
    try {
      raw = await getTodayEvents(lang);
    } catch (err) {
      console.error("TradingEconomics:", err);
      return ctx.reply("⚠️ Не удалось получить новости, попробуйте позже.");
    }

    /* 3. фильтруем */
    const events = raw
      .filter(e =>
        e.Importance >= pref.importance &&
        e.time && e.time !== "",
      )
      .sort((a, b) => a.time.localeCompare(b.time));


    /* ─── логируем ─── */
    info(`/daily_news ${uid}: API=${raw.length}, shown=${events.length}`);
    if (LOG_LEVEL === "debug") {
      const dropped = raw.filter(e =>
        e.Importance < pref.importance || !e.ActualTime || e.ActualTime === "",
      );
      debug("Dropped:", dropped.length, "events");
      debug("Dropped events:\n" + JSON.stringify(dropped, null, 2));
    }

    if (!events.length) return ctx.reply("Сегодня важных событий нет 🙂");

    /* 4. форматируем */
    const locale = ISO[pref.lang] ? pref.lang : "en";

    const today = DateTime.utc().setZone(pref.tz_id).setLocale(locale);  ;
    const header = `Ключевые события ${today.toFormat("cccc - dd.LL.yyyy")} (${pref.tz_id}):`;

    const lines = events.map((e) => {
      const t = DateTime.fromISO(e.time, { zone: "utc" })
        .setZone(pref.tz_id)
        .toFormat("HH:mm");

      return `${mark[e.Importance - 1]} ${e.Country} – ${e.Event} – ${t}`;
    });

    await ctx.reply(
      [header, ...lines, "_____________________________", "by Ksavdev (тут напишем что скажешь)"].join("\n"),
      { link_preview_options: { is_disabled: true } },
    );
  });
}
