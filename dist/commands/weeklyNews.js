// src/commands/weeklyNews.ts
import { DateTime } from "luxon";
import { pool } from "../db.js";
import { scrapeAllEvents, } from "../services/calendar/scrape.js";
/* ====== настройки логов ====== */
const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const info = (...a) => console.log("[INFO]", ...a);
const debug = (...a) => LOG_LEVEL === "debug" && console.log("[DEBUG]", ...a);
/* эмодзи по важности */
const mark = ["🟢", "🟡", "🔴"];
/* поддерживаемые ISO-коды языков для локалей */
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
    const { rows } = await pool.query("SELECT tz_id, importance, lang FROM user_settings WHERE tg_id=$1", [tgId]);
    return rows[0] ?? null;
}
/**
 * Возвращает события текущей недели (понедельник—воскресенье) в UTC,
 * а мы потом переводим их в таймзону пользователя.
 */
async function getWeekEvents(lang, tz) {
    const all = await scrapeAllEvents();
    const today = DateTime.utc().setZone(tz);
    const weekStart = today.startOf("week").toUTC();
    const weekEnd = today.endOf("week").toUTC();
    return all.filter(e => {
        if (!e.timestamp)
            return false;
        const ts = DateTime.fromISO(e.timestamp, { zone: "utc" });
        return ts >= weekStart && ts <= weekEnd;
    });
}
/* ───────── команда /weekly_news ───────── */
export function weeklyNewsCommand(bot) {
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
        // Фильтрация и сортировка
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
        // Группируем по локальной дате
        const grouped = {};
        for (const e of events) {
            const local = DateTime.fromISO(e.timestamp, { zone: "utc" })
                .setZone(pref.tz_id);
            const key = local.toISODate(); // yyyy-MM-dd
            (grouped[key] ??= []).push(e);
        }
        // Формируем заголовок
        const weekStart = DateTime.utc().setZone(pref.tz_id).startOf("week");
        const weekEnd = DateTime.utc().setZone(pref.tz_id).endOf("week");
        const header = `<b>Ключевые события недели</b> ` +
            `(${weekStart.toFormat("dd.LL.yyyy")} — ${weekEnd.toFormat("dd.LL.yyyy")}, ${pref.tz_id})`;
        // Перебираем каждый день недели
        const lines = [header];
        for (let i = 0; i < 7; i++) {
            const day = weekStart.plus({ days: i });
            const iso = day.toISODate();
            const dayName = day.setLocale("ru").toFormat("cccc");
            const dateStr = day.toFormat("dd.LL.yyyy");
            lines.push(`\n<b>${dayName.charAt(0).toUpperCase() + dayName.slice(1)} — ${dateStr} (UTC${day.toFormat("ZZ")}):</b>`);
            const evs = grouped[iso] ?? [];
            if (!evs.length) {
                lines.push("Важные события на эту дату отсутствуют.");
            }
            else {
                for (const e of evs) {
                    const t = DateTime.fromISO(e.timestamp, { zone: "utc" })
                        .setZone(pref.tz_id)
                        .toFormat("HH:mm");
                    lines.push(`${mark[e.importance - 1]} ${currencyFlag(e.currency)} ` +
                        `${currencyName(e.currency)} — ${e.title} — ${t}`);
                }
            }
        }
        // Подпись в конце
        lines.push("\n_____________________________");
        lines.push("by Ksavdev");
        await ctx.reply(lines.join("\n"), {
            parse_mode: "HTML",
            link_preview_options: { is_disabled: true },
        });
    });
}
