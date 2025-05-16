/* ─────────── src/commands/weeklyNews.ts ───────────
   /weekly_news — календарь на текущую календарную неделю (пн–вс)
   ------------------------------------------------- */

import { Bot } from "grammy";
import { DateTime } from "luxon";
import type { OuterCtx } from "../bot.js";
import { pool } from "../db.js";
import {
  scrapeAllEvents,
  CalendarEvent,
} from "../services/calendar/scrape.js";

/* ====== настройки логов ====== */
const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const info  = (...a: unknown[]) => console.log("[INFO]",  ...a);
const debug = (...a: unknown[]) => {
  if (LOG_LEVEL === "debug") console.log("[DEBUG]", ...a);
};

/* эмодзи по уровню */
const mark = ["🟢", "🟡", "🔴"];

/* ISO-коды для TE */
const ISO: Record<string, true> = {
  it: true, zh: true, ru: true, es: true, pl: true, tr: true, ja: true,
  pt: true, da: true, fa: true, ko: true, fr: true, no: true, id: true,
  de: true, hu: true, ar: true, sv: true,
};

/* ───────── SQL helper ───────── */
interface PrefRow { tz_id: string; importance: number; lang: string; }
async function getPrefs(tgId: number): Promise<PrefRow | null> {
  const { rows } = await pool.query<PrefRow>(
    "SELECT tz_id, importance, lang FROM user_settings WHERE tg_id=$1",
    [tgId],
  );
  return rows[0] ?? null;
}

/**
 * Возвращает события за понедельник–воскресенье текущей недели
 * в указанной таймзоне.
 */
async function getWeekEvents(
  lang: string,
  tz: string
): Promise<CalendarEvent[]> {
  const all = await scrapeAllEvents();

  // локальная сегодняшняя дата
  const todayLocal = DateTime.utc().setZone(tz);
  // начало недели (понедельник)
  const weekStartLocal = todayLocal.startOf("week");
  // конец недели (воскресенье 23:59:59)
  const weekEndLocal = weekStartLocal.plus({ days: 6 }).endOf("day");

  // границы в UTC для фильтрации
  const startUtc = weekStartLocal.toUTC();
  const endUtc   = weekEndLocal.toUTC();

  return all.filter(e => {
    if (!e.timestamp) return false;
    const ts = DateTime.fromISO(e.timestamp, { zone: "utc" });
    return ts >= startUtc && ts <= endUtc;
  });
}

/* ───────── команда ───────── */
export function weeklyNewsCommand(bot: Bot<OuterCtx>) {
  bot.command("weekly_news", async (ctx) => {
    const uid = ctx.from!.id;

    /* 1. настройки */
    const pref = await getPrefs(uid);
    if (!pref) return ctx.reply("Сначала введите /start 🙂");

    /* 2. язык + события недели */
    const lang = ISO[pref.lang] ? pref.lang : "en";
    let raw: CalendarEvent[];
    try {
      raw = await getWeekEvents(lang, pref.tz_id);
    } catch (err) {
      console.error("[calendar scrape]", err);
      return ctx.reply("⚠️ Не удалось получить новости, попробуйте позже.");
    }

    /* 3. фильтрация и сортировка */
    const events = raw
      .filter(e => e.importance >= pref.importance && e.timestamp)
      .sort((a, b) =>
        a.timestamp! < b.timestamp! ? -1 : a.timestamp! > b.timestamp! ? 1 : 0
      );

    /* логируем */
    info(`/weekly_news ${uid}: scraped=${raw.length}, shown=${events.length}`);
    if (LOG_LEVEL === "debug") {
      const dropped = raw.filter(e =>
        e.importance < pref.importance || !e.timestamp
      );
      debug("Dropped:", dropped.length, "events");
      debug("Dropped events:\n" + JSON.stringify(dropped, null, 2));
    }

    if (!events.length) {
      return ctx.reply("На этой неделе важных событий нет 🙂");
    }

    /* 4. форматирование */
    const locale = ISO[pref.lang] ? pref.lang : "en";
    const weekStart = DateTime.utc()
      .setZone(pref.tz_id)
      .startOf("week")
      .setLocale(locale);
    const weekEnd = weekStart
      .plus({ days: 6 })
      .setLocale(locale);

    const header = `Ключевые события ${weekStart.toFormat("dd.LL.yyyy")}` +
                   ` — ${weekEnd.toFormat("dd.LL.yyyy")} (${pref.tz_id}):`;

    const lines = events.map(e => {
      const t = DateTime.fromISO(e.timestamp!, { zone: "utc" })
        .setZone(pref.tz_id)
        .toFormat("dd.LL HH:mm");
      return `${mark[e.importance - 1]} ${e.currency} — ${e.title} — ${t}`;
    });

    await ctx.reply(
      [header, ...lines, "_____________________________", "by Ksavdev"].join("\n"),
      { link_preview_options: { is_disabled: true } },
    );
  });
}
