// src/commands/weeklyNews.ts

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
const debug = (...a: unknown[]) => LOG_LEVEL === "debug" && console.log("[DEBUG]", ...a);

/* эмодзи по важности */
const mark = ["🟢", "🟡", "🔴"];

/* поддерживаемые ISO-коды языков */
const ISO: Record<string, true> = {
  it: true, zh: true, ru: true, es: true, pl: true, tr: true, ja: true,
  pt: true, da: true, fa: true, ko: true, fr: true, no: true, id: true,
  de: true, hu: true, ar: true, sv: true,
};

/** Флаг по коду валюты */
function currencyFlag(cur: string): string {
  const map: Record<string,string> = {
    USD: "🇺🇸", EUR: "🇪🇺", CAD: "🇨🇦", GBP: "🇬🇧",
    JPY: "🇯🇵", AUD: "🇦🇺", NZD: "🇳🇿", CHF: "🇨🇭", CNY: "🇨🇳",
  };
  return map[cur] || "";
}

/** Полное название валюты на русском */
function currencyName(cur: string): string {
  const map: Record<string,string> = {
    USD: "США", EUR: "ЕС", CAD: "Канада", GBP: "Великобритания",
    JPY: "Япония", AUD: "Австралия", NZD: "Новая Зеландия",
    CHF: "Швейцария", CNY: "Китай",
  };
  return map[cur] || cur;
}

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
 * Возвращает все события текущей недели (понедельник—воскресенье) в UTC.
 */
async function getWeekEvents(lang: string, tz: string): Promise<CalendarEvent[]> {
  const all = await scrapeAllEvents();
  const today     = DateTime.utc().setZone(tz);
  const weekStart = today.startOf("week").toUTC();
  const weekEnd   = today.endOf("week").toUTC();
  return all.filter(e => {
    if (!e.timestamp) return false;
    const ts = DateTime.fromISO(e.timestamp, { zone: "utc" });
    return ts >= weekStart && ts <= weekEnd;
  });
}

/* ───────── команда /weekly_news ───────── */
export function weeklyNewsCommand(bot: Bot<OuterCtx>) {
  bot.command("weekly_news", async (ctx) => {
    const uid  = ctx.from!.id;
    const pref = await getPrefs(uid);
    if (!pref) return ctx.reply("Сначала введите /start 🙂");

    const lang = ISO[pref.lang] ? pref.lang : "en";
    let raw: CalendarEvent[];
    try {
      raw = await getWeekEvents(lang, pref.tz_id);
    } catch (err) {
      console.error("[calendar scrape]", err);
      return ctx.reply("⚠️ Не удалось получить новости, попробуйте позже.");
    }

    // Фильтр + сортировка
    const events = raw
      .filter((e): e is CalendarEvent & { timestamp: string } =>
        e.importance >= pref.importance && e.timestamp != null
      )
      .sort((a, b) => a.timestamp! < b.timestamp! ? -1 : 1);

    info(`/weekly_news ${uid}: scraped=${raw.length}, shown=${events.length}`);
    if (LOG_LEVEL === "debug") {
      const dropped = raw.filter(e => e.importance < pref.importance || !e.timestamp);
      debug("Dropped:", dropped.length, JSON.stringify(dropped, null, 2));
    }
    if (!events.length) {
      return ctx.reply("На этой неделе важных событий нет 🙂");
    }

    // Группируем по дате
    const grouped: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const local = DateTime.fromISO(e.timestamp!, { zone: "utc" }).setZone(pref.tz_id);
      const key = local.toISODate()!;
      (grouped[key] ??= []).push(e);
    }

    // Заголовок с диапазоном недели
    const weekStart = DateTime.utc().setZone(pref.tz_id).startOf("week");
    const weekEnd   = DateTime.utc().setZone(pref.tz_id).endOf("week");
    const header = `<b>Ключевые события недели</b> ` +
      `(${weekStart.toFormat("dd.LL.yyyy")} — ${weekEnd.toFormat("dd.LL.yyyy")}, ${pref.tz_id})`;

    // Собираем блоки по дням
    const dayBlocks: string[] = [];
    for (let i = 0; i < 7; i++) {
      const day     = weekStart.plus({ days: i });
      const iso     = day.toISODate()!;
      const dayName = day.setLocale("ru").toFormat("cccc");
      const dateStr = day.toFormat("dd.LL.yyyy");

      let blk = `\n<b>${dayName.charAt(0).toUpperCase() + dayName.slice(1)} — ${dateStr} ` +
                `(UTC${day.toFormat("ZZ")}):</b>\n`;
      const evs = grouped[iso] ?? [];
      if (!evs.length) {
        blk += "Важные события на эту дату отсутствуют.\n";
      } else {
        for (const e of evs) {
          const t = DateTime.fromISO(e.timestamp!, { zone: "utc" })
            .setZone(pref.tz_id)
            .toFormat("HH:mm");
          blk +=
            `${mark[e.importance - 1]} ${currencyFlag(e.currency)} ` +
            `${currencyName(e.currency)} — ${e.title} — ${t}\n`;
        }
      }
      dayBlocks.push(blk);
    }

    // Склеиваем всё в один текст и проверяем длину
    const full = header + "\n" + dayBlocks.join("") +
      "\n_____________________________\nby Ksavdev";

    // Если длина вышла за лимит — сразу предлагаем выбрать тип новостей
    if (full.length > 4000) { // с запасом под UTF-8 и разметку
      return ctx.reply(
        "⚠️ Слишком много новостей для текущего типа. " +
        "Пожалуйста, используйте команду /set_news_type, чтобы выбрать, какие категории вы хотите получать."
      );
    }

    // Иначе — шлём одним сообщением
    return ctx.reply(full, {
      parse_mode: "HTML",
      link_preview_options: { is_disabled: true },
    });
  });
}
