"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWeeklyNewsCommand = registerWeeklyNewsCommand;
const luxon_1 = require("luxon");
const db_1 = require("@/core/db");
const scrape_1 = require("../services/scrape");
const logs_1 = require("@/shared/const/logs");
const marks_1 = require("@/shared/const/marks");
const CHUNK_SIZE = 20;
function currencyFlag(cur) {
    const map = {
        USD: '🇺🇸',
        EUR: '🇪🇺',
        CAD: '🇨🇦',
        GBP: '🇬🇧',
        JPY: '🇯🇵',
        AUD: '🇦🇺',
        NZD: '🇳🇿',
        CHF: '🇨🇭',
        CNY: '🇨🇳',
    };
    return map[cur] ?? '';
}
async function getPrefs(tgId) {
    const { rows } = await db_1.pool.query('SELECT tz_id, importance, lang FROM user_settings WHERE tg_id = $1', [tgId]);
    return rows[0] ?? null;
}
async function getWeekEvents() {
    const all = await (0, scrape_1.scrapeAllEvents)();
    const now = luxon_1.DateTime.utc();
    const weekEnd = now.plus({ days: 7 });
    return all.filter((e) => {
        if (!e.timestamp)
            return false;
        const ts = luxon_1.DateTime.fromISO(e.timestamp, { zone: 'utc' });
        return ts >= now && ts <= weekEnd;
    });
}
async function replyInChunks(ctx, lines, header, footer, chunkSize = CHUNK_SIZE) {
    for (let i = 0; i < lines.length; i += chunkSize) {
        const chunk = lines.slice(i, i + chunkSize);
        const text = [header, ...chunk, footer].join('\n');
        await ctx.reply(text, {
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true },
        });
    }
}
function registerWeeklyNewsCommand(composer) {
    composer.command('weekly_news', async (ctx) => {
        const tgId = ctx.from.id;
        const pref = await getPrefs(tgId);
        if (!pref)
            return ctx.reply('Сначала введите /start 🙂');
        let events;
        try {
            events = await getWeekEvents();
        }
        catch (err) {
            console.error('[weekly_news] ошибка скрапинга календаря:', err);
            return ctx.reply('⚠️ Не удалось получить календарь новостей, попробуйте чуть позже.');
        }
        (0, logs_1.info)(`/weekly_news ${tgId}: scraped=${events.length}, shown=${events.length}`);
        if (logs_1.LOG_LEVEL === "debug") {
            const dropped = events.filter(e => e.importance < pref.importance || !e.timestamp);
            (0, logs_1.debug)("Dropped:", dropped.length, JSON.stringify(dropped, null, 2));
        }
        if (!events.length) {
            return ctx.reply('Сегодня важных событий нет 🙂');
        }
        events = events
            .filter((e) => e.importance >= pref.importance && e.timestamp)
            .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
        if (!events.length) {
            return ctx.reply('На ближайшую неделю важных событий нет 🙂');
        }
        const weekStart = luxon_1.DateTime.utc().setZone(pref.tz_id).startOf('week');
        const weekEnd = weekStart.plus({ days: 6 });
        const grouped = {};
        for (const e of events) {
            const local = luxon_1.DateTime.fromISO(e.timestamp, { zone: 'utc' }).setZone(pref.tz_id);
            const key = local.toISODate();
            (grouped[key] ??= []).push(e);
        }
        const days = [];
        for (let i = 0; i < 7; i++) {
            days.push(weekStart.plus({ days: i }));
        }
        const rangeStart = weekStart.toFormat('dd.LL.yyyy');
        const rangeEnd = weekEnd.toFormat('dd.LL.yyyy');
        const header = `<b>Ключевые события недели</b> (${rangeStart} — ${rangeEnd}, ${pref.tz_id})`;
        const footer = '_____________________________\nby MW:TA';
        const allLines = [];
        for (const day of days) {
            const dayName = day.setLocale('ru').toFormat('cccc');
            const dateStr = day.toFormat('dd.LL.yyyy');
            const offsetHrs = day.offset / 60;
            const tzLabel = offsetHrs === 0 ? 'UTC' : `UTC${offsetHrs > 0 ? '+' : ''}${offsetHrs}`;
            allLines.push(`<b>${dayName.charAt(0).toUpperCase() + dayName.slice(1)} — ${dateStr} (${tzLabel})</b>`);
            const dayKey = day.toISODate();
            const evs = grouped[dayKey] ?? [];
            if (!evs.length) {
                allLines.push('Важные события на эту дату отсутствуют.');
            }
            else {
                for (const e of evs) {
                    const tLocal = luxon_1.DateTime.fromISO(e.timestamp, { zone: 'utc' })
                        .setZone(pref.tz_id)
                        .toFormat('HH:mm');
                    allLines.push(`${marks_1.mark[e.importance - 1]} ${currencyFlag(e.currency)} ${e.currency} — ${e.title} — ${tLocal}`);
                }
            }
            allLines.push('');
        }
        await replyInChunks(ctx, allLines, header, footer);
    });
}
