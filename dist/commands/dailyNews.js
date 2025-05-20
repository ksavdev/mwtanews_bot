"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dailyNewsCommand = dailyNewsCommand;
exports.sendDailyNews = sendDailyNews;
const luxon_1 = require("luxon");
const db_js_1 = require("../db.js");
const scrape_js_1 = require("../services/calendar/scrape.js");
/* ====== настройки логов ====== */
const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const info = (...a) => console.log("[INFO]", ...a);
const debug = (...a) => LOG_LEVEL === "debug" && console.log("[DEBUG]", ...a);
/* эмодзи по уровню важности */
const mark = ["🟢", "🟡", "🔴"];
/* ISO-коды поддерживаемых языков */
const ISO = {
    it: true, zh: true, ru: true, es: true, pl: true, tr: true, ja: true,
    pt: true, da: true, fa: true, ko: true, fr: true, no: true, id: true,
    de: true, hu: true, ar: true, sv: true,
};
/** Привязка кода валюты к флажку */
function currencyFlag(cur) {
    const map = {
        USD: "🇺🇸", EUR: "🇪🇺", CAD: "🇨🇦", GBP: "🇬🇧", JPY: "🇯🇵",
        AUD: "🇦🇺", NZD: "🇳🇿", CHF: "🇨🇭", CNY: "🇨🇳",
    };
    return map[cur] ?? "";
}
/** Разбивает длинный текст на чанки по 20 строк */
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
        await ctx.reply(parts.join("\n"), {
            link_preview_options: { is_disabled: true },
        });
    }
}
async function getPrefs(tgId) {
    const { rows } = await db_js_1.pool.query("SELECT tz_id, importance, lang FROM user_settings WHERE tg_id = $1", [tgId]);
    return rows[0] ?? null;
}
/**
 * Фильтрует события календаря только на «сегодня» (локально для tz).
 */
async function getTodayEvents(lang, tz) {
    const all = await (0, scrape_js_1.scrapeAllEvents)();
    const today = luxon_1.DateTime.utc().setZone(tz);
    const startUtc = today.startOf("day").toUTC();
    const endUtc = today.endOf("day").toUTC();
    return all.filter(e => {
        if (!e.timestamp)
            return false;
        const ts = luxon_1.DateTime.fromISO(e.timestamp, { zone: "utc" });
        return ts >= startUtc && ts <= endUtc;
    });
}
/* ───────── команда /daily_news ───────── */
function dailyNewsCommand(bot) {
    bot.command("daily_news", async (ctx) => {
        const uid = ctx.from.id;
        const pref = await getPrefs(uid);
        if (!pref)
            return ctx.reply("Сначала введите /start 🙂");
        let events;
        try {
            events = await getTodayEvents(pref.lang, pref.tz_id);
        }
        catch (err) {
            console.error("[calendar scrape]", err);
            return ctx.reply("⚠️ Не удалось получить новости, попробуйте позже.");
        }
        events = events
            .filter(e => e.importance >= pref.importance && e.timestamp)
            .sort((a, b) => a.timestamp < b.timestamp ? -1 : 1);
        info(`/daily_news ${uid}: scraped=${events.length}`);
        if (!events.length)
            return ctx.reply("Сегодня важных событий нет 🙂");
        const today = luxon_1.DateTime.utc().setZone(pref.tz_id)
            .setLocale(ISO[pref.lang] ? pref.lang : "en");
        const header = `Ключевые события ${today.toFormat("cccc - dd.LL.yyyy")} (${pref.tz_id}):`;
        const footer = "_____________________________\nby Trade Soul News";
        const lines = events.map(e => {
            const t = luxon_1.DateTime.fromISO(e.timestamp, { zone: "utc" })
                .setZone(pref.tz_id)
                .toFormat("dd.LL HH:mm");
            return `${mark[e.importance - 1]} ${currencyFlag(e.currency)} ${e.currency} — ${e.title} — ${t}`;
        });
        await replyInChunks(ctx, header, lines, footer);
    });
}
/* ───────── для фонового планировщика ───────── */
async function sendDailyNews(bot, userId) {
    const pref = await getPrefs(userId);
    if (!pref)
        return; // пользователь ещё не /start
    let events;
    try {
        events = await getTodayEvents(pref.lang, pref.tz_id);
    }
    catch (err) {
        console.error("[calendar scrape]", err);
        return bot.api.sendMessage(userId, "⚠️ Не удалось получить новости, попробуйте позже.");
    }
    events = events
        .filter(e => e.importance >= pref.importance && e.timestamp)
        .sort((a, b) => a.timestamp < b.timestamp ? -1 : 1);
    if (!events.length) {
        return bot.api.sendMessage(userId, "Сегодня важных событий нет 🙂");
    }
    const today = luxon_1.DateTime.utc().setZone(pref.tz_id)
        .setLocale(ISO[pref.lang] ? pref.lang : "en");
    const header = `Ключевые события ${today.toFormat("cccc - dd.LL.yyyy")} (${pref.tz_id}):`;
    const footer = "_____________________________\nby Trade Soul News";
    const lines = events.map(e => {
        const t = luxon_1.DateTime.fromISO(e.timestamp, { zone: "utc" })
            .setZone(pref.tz_id)
            .toFormat("dd.LL HH:mm");
        return `${mark[e.importance - 1]} ${currencyFlag(e.currency)} ${e.currency} — ${e.title} — ${t}`;
    });
    // временно создаём «контекст-клон» c типизированным параметром
    await replyInChunks({
        ...bot,
        reply: (txt) => bot.api.sendMessage(userId, txt),
    }, header, lines, footer);
}
