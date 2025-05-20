"use strict";
// src/commands/weeklyNews.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.weeklyNewsCommand = weeklyNewsCommand;
const luxon_1 = require("luxon");
const db_js_1 = require("../db.js");
const scrape_js_1 = require("../services/calendar/scrape.js");
/* ====== настройки логов ====== */
const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const info = (...a) => console.log("[INFO]", ...a);
const debug = (...a) => LOG_LEVEL === "debug" && console.log("[DEBUG]", ...a);
/* эмодзи по важности */
const mark = ["🟢", "🟡", "🔴"];
/* поддерживаемые ISO-коды языков */
const ISO = {
    it: true, zh: true, ru: true, es: true, pl: true, tr: true, ja: true,
    pt: true, da: true, fa: true, ko: true, fr: true, no: true, id: true,
    de: true, hu: true, ar: true, sv: true,
};
/** Флаг по коду валюты */
function currencyFlag(cur) {
    const map = {
        USD: "🇺🇸", EUR: "🇪🇺", CAD: "🇨🇦", GBP: "🇬🇧",
        JPY: "🇯🇵", AUD: "🇦🇺", NZD: "🇳🇿", CHF: "🇨🇭", CNY: "🇨🇳",
    };
    return map[cur] || "";
}
/** Полное название валюты на русском */
function currencyName(cur) {
    const map = {
        USD: "США", EUR: "ЕС", CAD: "Канада", GBP: "Великобритания",
        JPY: "Япония", AUD: "Австралия", NZD: "Новая Зеландия",
        CHF: "Швейцария", CNY: "Китай",
    };
    return map[cur] || cur;
}
async function getPrefs(tgId) {
    const { rows } = await db_js_1.pool.query("SELECT tz_id, importance, lang FROM user_settings WHERE tg_id=$1", [tgId]);
    return rows[0] ?? null;
}
/**
 * Возвращает все события текущей недели (понедельник—воскресенье) в UTC.
 */
async function getWeekEvents(lang, tz) {
    const all = await (0, scrape_js_1.scrapeAllEvents)();
    const today = luxon_1.DateTime.utc().setZone(tz);
    const weekStart = today.startOf("week").toUTC();
    const weekEnd = today.endOf("week").toUTC();
    return all.filter(e => {
        if (!e.timestamp)
            return false;
        const ts = luxon_1.DateTime.fromISO(e.timestamp, { zone: "utc" });
        return ts >= weekStart && ts <= weekEnd;
    });
}
/* ───────── команда /weekly_news ───────── */
function weeklyNewsCommand(bot) {
    bot.command("weekly_news", async (ctx) => {
        const uid = ctx.from.id;
        const pref = await getPrefs(uid);
        if (!pref)
            return ctx.reply("Сначала введите /start 🙂");
        const lang = ISO[pref.lang] ? pref.lang : "en";
        let raw;
        try {
            raw = await getWeekEvents(lang, pref.tz_id);
        }
        catch (err) {
            console.error("[calendar scrape]", err);
            return ctx.reply("⚠️ Не удалось получить новости, попробуйте позже.");
        }
        // Фильтр + сортировка
        const events = raw
            .filter((e) => e.importance >= pref.importance && e.timestamp != null)
            .sort((a, b) => a.timestamp < b.timestamp ? -1 : 1);
        info(`/weekly_news ${uid}: scraped=${raw.length}, shown=${events.length}`);
        if (LOG_LEVEL === "debug") {
            const dropped = raw.filter(e => e.importance < pref.importance || !e.timestamp);
            debug("Dropped:", dropped.length, JSON.stringify(dropped, null, 2));
        }
        if (!events.length) {
            return ctx.reply("На этой неделе важных событий нет 🙂");
        }
        // Группируем по дате
        const grouped = {};
        for (const e of events) {
            const local = luxon_1.DateTime.fromISO(e.timestamp, { zone: "utc" }).setZone(pref.tz_id);
            const key = local.toISODate();
            (grouped[key] ??= []).push(e);
        }
        // Заголовок с диапазоном недели
        const weekStart = luxon_1.DateTime.utc().setZone(pref.tz_id).startOf("week");
        const weekEnd = luxon_1.DateTime.utc().setZone(pref.tz_id).endOf("week");
        const header = `<b>Ключевые события недели</b> ` +
            `(${weekStart.toFormat("dd.LL.yyyy")} — ${weekEnd.toFormat("dd.LL.yyyy")}, ${pref.tz_id})`;
        // Собираем блоки по дням
        const dayBlocks = [];
        for (let i = 0; i < 7; i++) {
            const day = weekStart.plus({ days: i });
            const iso = day.toISODate();
            const dayName = day.setLocale("ru").toFormat("cccc");
            const dateStr = day.toFormat("dd.LL.yyyy");
            let blk = `\n<b>${dayName.charAt(0).toUpperCase() + dayName.slice(1)} — ${dateStr} ` +
                `(UTC${day.toFormat("ZZ")}):</b>\n`;
            const evs = grouped[iso] ?? [];
            if (!evs.length) {
                blk += "Важные события на эту дату отсутствуют.\n";
            }
            else {
                for (const e of evs) {
                    const t = luxon_1.DateTime.fromISO(e.timestamp, { zone: "utc" })
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
            return ctx.reply("⚠️ Слишком много новостей для текущего типа. " +
                "Пожалуйста, используйте команду /set_news_type, чтобы выбрать, какие категории вы хотите получать.");
        }
        // Иначе — шлём одним сообщением
        return ctx.reply(full, {
            parse_mode: "HTML",
            link_preview_options: { is_disabled: true },
        });
    });
}
