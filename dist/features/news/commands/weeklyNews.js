"use strict";
// src/features/news/commands/weeklyNews.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerWeeklyNewsCommand = registerWeeklyNewsCommand;
const luxon_1 = require("luxon");
const db_1 = require("@/core/db");
const scrape_1 = require("../services/scrape");
const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
const info = (...a) => console.log('[INFO] ', ...a);
const debug = (...a) => LOG_LEVEL === 'debug' && console.log('[DEBUG]', ...a);
/** Получить настройки пользователя из БД */
async function getPrefs(id) {
    const { rows } = await db_1.pool.query('SELECT tz_id, importance, lang FROM user_settings WHERE tg_id = $1', [id]);
    return rows[0] ?? null;
}
/** Собрать все события недели в UTC */
async function getWeekEvents(lang) {
    const all = await (0, scrape_1.scrapeAllEvents)();
    const now = luxon_1.DateTime.utc();
    const weekFromNow = now.plus({ days: 7 });
    return all.filter((e) => {
        if (!e.timestamp)
            return false;
        const ts = luxon_1.DateTime.fromISO(e.timestamp, { zone: 'utc' });
        return ts >= now && ts <= weekFromNow;
    });
}
/** Эмодзи по важности: 1=🟢,2=🟡,3=🔴 */
const mark = ['🟢', '🟡', '🔴'];
/** Флаг по коду валюты */
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
function registerWeeklyNewsCommand(composer) {
    composer.command('weekly_news', async (ctx) => {
        const pref = await getPrefs(ctx.from.id);
        const uid = ctx.from.id;
        if (!pref)
            return ctx.reply('Сначала введите /start 🙂');
        const events = (await getWeekEvents(pref.lang))
            .filter((e) => e.importance >= pref.importance && e.timestamp)
            .sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
        info(`/weekly_news ${uid}: scraped=${events.length}`);
        if (!events.length) {
            return ctx.reply('На ближайшую неделю важных событий нет 🙂');
        }
        // Если слишком много — предложить /set_news_type
        const MAX_EVENTS = 50;
        if (events.length > MAX_EVENTS) {
            return ctx.reply(`📋 Найдено ${events.length} событий — слишком много для одного сообщения.\n\n` +
                `Попробуйте выбрать более высокий уровень важности через /set_news_type.\n` +
                `Текущий уровень: ${pref.importance} (${mark[pref.importance - 1]})`);
        }
        // Формируем заголовок
        const header = `Ключевые события ближайшей недели (${pref.tz_id}):`;
        const footer = '_____________________________\nby MW:TA';
        // Формируем тело с флажками
        const body = events
            .map((e) => {
            const t = luxon_1.DateTime.fromISO(e.timestamp, { zone: 'utc' })
                .setZone(pref.tz_id)
                .toFormat('dd.LL HH:mm');
            return (`${mark[e.importance - 1]} ` +
                `${currencyFlag(e.currency)} ${e.currency} — ${e.title} — ${t}`);
        })
            .join('\n');
        await ctx.reply(`${header}\n${body}\n${footer}`, {
            link_preview_options: { is_disabled: true },
        });
    });
}
