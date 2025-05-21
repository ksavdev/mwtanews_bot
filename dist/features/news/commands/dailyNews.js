"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDailyNewsCommand = registerDailyNewsCommand;
exports.sendDailyNews = sendDailyNews;
const luxon_1 = require("luxon");
const db_1 = require("@/core/db");
const scrape_1 = require("../services/scrape");
/* ====== настройки логов ====== */
const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const info = (...a) => console.log("[INFO]", ...a);
const debug = (...a) => LOG_LEVEL === "debug" && console.log("[DEBUG]", ...a);
// ──────────────────────── utils ────────────────────────────
const mark = ['🟢', '🟡', '🔴'];
const ISO = {
    it: true, zh: true, ru: true, es: true, pl: true,
    tr: true, ja: true, pt: true, da: true, fa: true,
    ko: true, fr: true, no: true, id: true, de: true,
    hu: true, ar: true, sv: true,
};
function currencyFlag(cur) {
    const map = {
        USD: '🇺🇸', EUR: '🇪🇺', CAD: '🇨🇦', GBP: '🇬🇧',
        JPY: '🇯🇵', AUD: '🇦🇺', NZD: '🇳🇿', CHF: '🇨🇭',
        CNY: '🇨🇳',
    };
    return map[cur] ?? '';
}
async function replyInChunks(ctx, lines, header, footer, chunkSize = 20) {
    for (let i = 0; i < lines.length; i += chunkSize) {
        const chunk = lines.slice(i, i + chunkSize);
        const text = [header, ...chunk, footer].join('\n');
        await ctx.reply(text, { link_preview_options: { is_disabled: true } });
    }
}
async function getPrefs(tgId) {
    const { rows } = await db_1.pool.query('SELECT tz_id, importance, lang FROM user_settings WHERE tg_id = $1', [tgId]);
    return rows[0] ?? null;
}
// ──────────────────────── Calendar ──────────────────────────
async function getTodayEvents(lang, tz) {
    const all = await (0, scrape_1.scrapeAllEvents)();
    const today = luxon_1.DateTime.utc().setZone(tz);
    const startUtc = today.startOf('day').toUTC();
    const endUtc = today.endOf('day').toUTC();
    return all.filter((e) => {
        if (!e.timestamp)
            return false;
        const ts = luxon_1.DateTime.fromISO(e.timestamp, { zone: 'utc' });
        return ts >= startUtc && ts <= endUtc;
    });
}
// ──────────────────────── /daily_news ───────────────────────
function registerDailyNewsCommand(composer) {
    composer.command('daily_news', async (ctx) => {
        const tgId = ctx.from.id;
        const pref = await getPrefs(tgId);
        if (!pref)
            return ctx.reply('Сначала введите /start 🙂');
        let events;
        try {
            events = await getTodayEvents(pref.lang, pref.tz_id);
        }
        catch (err) {
            console.error('[daily_news] ошибка скрапинга календаря:', err);
            return ctx.reply('⚠️ Не удалось получить дневной календарь, попробуйте позже.');
        }
        events = events
            .filter((e) => e.importance >= pref.importance && e.timestamp)
            .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
        info(`/daily_news ${tgId}: scraped=${events.length}, shown=${events.length}`);
        if (LOG_LEVEL === "debug") {
            const dropped = events.filter(e => e.importance < pref.importance || !e.timestamp);
            debug("Dropped:", dropped.length, JSON.stringify(dropped, null, 2));
        }
        if (!events.length) {
            return ctx.reply('Сегодня важных событий нет 🙂');
        }
        const today = luxon_1.DateTime.utc()
            .setZone(pref.tz_id)
            .setLocale(ISO[pref.lang] ? pref.lang : 'en');
        const header = `Ключевые события ${today.toFormat('cccc - dd.LL.yyyy')} (${pref.tz_id}):`;
        const footer = '_____________________________\nby MW:TA';
        const lines = events.map((e) => {
            const t = luxon_1.DateTime.fromISO(e.timestamp, { zone: 'utc' })
                .setZone(pref.tz_id)
                .toFormat('HH:mm');
            return `${mark[e.importance - 1]} ${currencyFlag(e.currency)} ${e.currency} — ${e.title} — ${t}`;
        });
        await replyInChunks(ctx, lines, header, footer);
    });
}
// ──────────────────────── CRON push ⏰ ───────────────────────
async function sendDailyNews(bot, userId) {
    const pref = await getPrefs(userId);
    if (!pref)
        return;
    let events;
    try {
        events = await getTodayEvents(pref.lang, pref.tz_id);
    }
    catch (err) {
        console.error('[calendar scrape]', err);
        return bot.api.sendMessage(userId, '⚠️ Не удалось получить новости, попробуйте позже.');
    }
    events = events
        .filter((e) => e.importance >= pref.importance && e.timestamp)
        .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
    if (!events.length) {
        return bot.api.sendMessage(userId, 'Сегодня важных событий нет 🙂');
    }
    const today = luxon_1.DateTime.utc()
        .setZone(pref.tz_id)
        .setLocale(ISO[pref.lang] ? pref.lang : 'en');
    const header = `Ключевые события ${today.toFormat('cccc - dd.LL.yyyy')} (${pref.tz_id}):`;
    const footer = '_____________________________\nby MW:TA';
    const lines = events.map((e) => {
        const t = luxon_1.DateTime.fromISO(e.timestamp, { zone: 'utc' })
            .setZone(pref.tz_id)
            .toFormat('HH:mm');
        return `${mark[e.importance - 1]} ${currencyFlag(e.currency)} ${e.currency} — ${e.title} — ${t}`;
    });
    for (let i = 0; i < lines.length; i += 20) {
        const chunk = lines.slice(i, i + 20);
        const text = [header, ...chunk, footer].join('\n');
        await bot.api.sendMessage(userId, text);
    }
}
