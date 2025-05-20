import { Bot } from "grammy";
import { DateTime } from "luxon";
import type { OuterCtx } from "../bot.js";
import { pool } from "../db.js";
import {
  scrapeAllEvents,
  type CalendarEvent,
} from "../services/calendar/scrape.js";

const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const info  = (...a: unknown[]) => console.log("[INFO]",  ...a);
const debug = (...a: unknown[]) => LOG_LEVEL === "debug" && console.log("[DEBUG]", ...a);

const mark = ["🟢", "🟡", "🔴"];

const ISO: Record<string, true> = {
  it: true, zh: true, ru: true, es: true, pl: true, tr: true, ja: true,
  pt: true, da: true, fa: true, ko: true, fr: true, no: true, id: true,
  de: true, hu: true, ar: true, sv: true,
};

function currencyFlag(cur: string): string {
  const map: Record<string, string> = {
    USD: "🇺🇸", EUR: "🇪🇺", CAD: "🇨🇦", GBP: "🇬🇧", JPY: "🇯🇵",
    AUD: "🇦🇺", NZD: "🇳🇿", CHF: "🇨🇭", CNY: "🇨🇳",
  };
  return map[cur] ?? "";
}

async function replyInChunks(
  ctx: OuterCtx,
  header: string,
  lines: string[],
  footer: string,
) {
  const batchSize = 20;
  for (let i = 0; i < lines.length; i += batchSize) {
    const chunk = lines.slice(i, i + batchSize);
    const parts: string[] = [];
    if (i === 0) parts.push(header);
    parts.push(...chunk);
    if (i + batchSize >= lines.length) parts.push(footer);

    await ctx.reply(parts.join("\n"), {
      link_preview_options: { is_disabled: true },
    });
  }
}

interface PrefRow { tz_id: string; importance: number; lang: string; }

async function getPrefs(tgId: number): Promise<PrefRow | null> {
  const { rows } = await pool.query<PrefRow>(
    "SELECT tz_id, importance, lang FROM user_settings WHERE tg_id = $1",
    [tgId],
  );
  return rows[0] ?? null;
}

async function getTodayEvents(lang: string, tz: string): Promise<CalendarEvent[]> {
  const all = await scrapeAllEvents();
  const today = DateTime.utc().setZone(tz);
  const startUtc = today.startOf("day").toUTC();
  const endUtc   = today.endOf("day").toUTC();

  return all.filter(e => {
    if (!e.timestamp) return false;
    const ts = DateTime.fromISO(e.timestamp, { zone: "utc" });
    return ts >= startUtc && ts <= endUtc;
  });
}

export function dailyNewsCommand(bot: Bot<OuterCtx>) {
  bot.command("daily_news", async (ctx) => {
    const uid  = ctx.from!.id;
    const pref = await getPrefs(uid);
    if (!pref) return ctx.reply("Сначала введите /start 🙂");

    let events: CalendarEvent[];
    try {
      events = await getTodayEvents(pref.lang, pref.tz_id);
    } catch (err) {
      console.error("[calendar scrape]", err);
      return ctx.reply("⚠️ Не удалось получить новости, попробуйте позже.");
    }

    events = events
      .filter(e => e.importance >= pref.importance && e.timestamp)
      .sort((a, b) => a.timestamp! < b.timestamp! ? -1 : 1);

    info(`/daily_news ${uid}: scraped=${events.length}`);

    if (!events.length) return ctx.reply("Сегодня важных событий нет 🙂");

    const today = DateTime.utc().setZone(pref.tz_id)
      .setLocale(ISO[pref.lang] ? pref.lang : "en");

    const header = `Ключевые события ${today.toFormat("cccc - dd.LL.yyyy")} (${pref.tz_id}):`;
    const footer = "_____________________________\nby MW:TA";

    const lines = events.map(e => {
      const t = DateTime.fromISO(e.timestamp!, { zone: "utc" })
        .setZone(pref.tz_id)
        .toFormat("dd.LL HH:mm");
      return `${mark[e.importance - 1]} ${currencyFlag(e.currency)} ${e.currency} — ${e.title} — ${t}`;
    });

    await replyInChunks(ctx, header, lines, footer);
  });
}

export async function sendDailyNews(bot: Bot<OuterCtx>, userId: number) {
  const pref = await getPrefs(userId);
  if (!pref) return; // пользователь ещё не /start

  let events: CalendarEvent[];
  try {
    events = await getTodayEvents(pref.lang, pref.tz_id);
  } catch (err) {
    console.error("[calendar scrape]", err);
    return bot.api.sendMessage(userId, "⚠️ Не удалось получить новости, попробуйте позже.");
  }

  events = events
    .filter(e => e.importance >= pref.importance && e.timestamp)
    .sort((a, b) => a.timestamp! < b.timestamp! ? -1 : 1);

  if (!events.length) {
    return bot.api.sendMessage(userId, "Сегодня важных событий нет 🙂");
  }

  const today = DateTime.utc().setZone(pref.tz_id)
    .setLocale(ISO[pref.lang] ? pref.lang : "en");

  const header = `Ключевые события ${today.toFormat("cccc - dd.LL.yyyy")} (${pref.tz_id}):`;
  const footer = "_____________________________\nby MW:TA";

  const lines = events.map(e => {
    const t = DateTime.fromISO(e.timestamp!, { zone: "utc" })
      .setZone(pref.tz_id)
      .toFormat("dd.LL HH:mm");
    return `${mark[e.importance - 1]} ${currencyFlag(e.currency)} ${e.currency} — ${e.title} — ${t}`;
  });

  await replyInChunks(
    {
      ...bot,
      reply: (txt: string) => bot.api.sendMessage(userId, txt),
    } as unknown as OuterCtx,
    header,
    lines,
    footer,
  );
}
