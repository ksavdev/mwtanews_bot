import { DateTime } from "luxon";
import { pool } from "../db.js";
import { scrapeAllEvents, } from "../services/calendar/scrape.js";
/* ====== настройки логов ====== */
const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const info = (...a) => console.log("[INFO]", ...a);
const debug = (...a) => LOG_LEVEL === "debug" && console.log("[DEBUG]", ...a);
/* эмодзи по уровню важности */
const mark = ["🟢", "🟡", "🔴"];
/* ISO-коды валют, которые поддерживаем */
const ISO = {
    it: true, zh: true, ru: true, es: true, pl: true, tr: true, ja: true,
    pt: true, da: true, fa: true, ko: true, fr: true, no: true, id: true,
    de: true, hu: true, ar: true, sv: true,
};
/** Привязка кода валюты к флажку */
function currencyFlag(cur) {
    const map = {
        USD: "🇺🇸",
        EUR: "🇪🇺",
        CAD: "🇨🇦",
        GBP: "🇬🇧",
        JPY: "🇯🇵",
        AUD: "🇦🇺",
        NZD: "🇳🇿",
        CHF: "🇨🇭",
        CNY: "🇨🇳",
    };
    return map[cur] ?? "";
}
/** Разбивает длинное сообщение на чанки по 20 строк */
async function replyInChunks(ctx, header, lines, footer) {
    const batchSize = 20;
    for (let i = 0; i < lines.length; i += batchSize) {
        const chunk = lines.slice(i, i + batchSize);
        const parts = [];
        if (i === 0)
            parts.push(header);
        parts.push(...chunk);
        if (i + batchSize >= lines.length)
            parts.push(footer);
        await ctx.reply(parts.join("\n"), { link_preview_options: { is_disabled: true } });
    }
}
async function getPrefs(tgId) {
    const { rows } = await pool.query("SELECT tz_id, importance, lang FROM user_settings WHERE tg_id=$1", [tgId]);
    return rows[0] ?? null;
}
/**
 * Выбирает события за «сегодня» в таймзоне пользователя.
 */
async function getTodayEvents(lang, tz) {
    const all = await scrapeAllEvents();
    const today = DateTime.utc().setZone(tz);
    const startUtc = today.startOf("day").toUTC();
    const endUtc = today.endOf("day").toUTC();
    return all.filter(e => {
        if (!e.timestamp)
            return false;
        const ts = DateTime.fromISO(e.timestamp, { zone: "utc" });
        return ts >= startUtc && ts <= endUtc;
    });
}
/* ───────── команда /daily_news ───────── */
export function dailyNewsCommand(bot) {
    bot.command("daily_news", async (ctx) => {
        const uid = ctx.from.id;
        const pref = await getPrefs(uid);
        if (!pref)
            return ctx.reply("Сначала введите /start 🙂");
        const lang = ISO[pref.lang] ? pref.lang : "en";
        let raw;
        try {
            raw = await getTodayEvents(lang, pref.tz_id);
        }
        catch (err) {
            console.error("[calendar scrape]", err);
            return ctx.reply("⚠️ Не удалось получить новости, попробуйте позже.");
        }
        const events = raw
            .filter(e => e.importance >= pref.importance && e.timestamp)
            .sort((a, b) => a.timestamp < b.timestamp ? -1 : 1);
        info(`/daily_news ${uid}: scraped=${raw.length}, shown=${events.length}`);
        if (LOG_LEVEL === "debug") {
            const dropped = raw.filter(e => e.importance < pref.importance || !e.timestamp);
            debug("Dropped:", dropped.length, JSON.stringify(dropped, null, 2));
        }
        if (!events.length)
            return ctx.reply("Сегодня важных событий нет 🙂");
        const locale = ISO[pref.lang] ? pref.lang : "en";
        const today = DateTime.utc().setZone(pref.tz_id).setLocale(locale);
        const header = `Ключевые события ${today.toFormat("cccc - dd.LL.yyyy")} (${pref.tz_id}):`;
        const footer = "_____________________________\nby Тут тоже напишу что скажешь потом ";
        const lines = events.map(e => {
            const t = DateTime.fromISO(e.timestamp, { zone: "utc" })
                .setZone(pref.tz_id)
                .toFormat("dd.LL HH:mm");
            return `${mark[e.importance - 1]} ${currencyFlag(e.currency)} ${e.currency} — ${e.title} — ${t}`;
        });
        await replyInChunks(ctx, header, lines, footer);
    });
}
