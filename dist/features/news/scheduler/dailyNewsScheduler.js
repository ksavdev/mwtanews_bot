"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDailyNewsScheduler = startDailyNewsScheduler;
// src/features/news/scheduler/dailyNewsScheduler.ts
require("dotenv/config"); // должен быть первым
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("@/core/db");
const dailyNews_1 = require("@/features/news/commands/dailyNews");
/**
 * Конвертирует метки "UTC+3"/"UTC-2"/"UTC" в валидные IANA.
 * В стандарте POSIX знак инвертируется:
 *  UTC+3 → Etc/GMT-3, UTC-5 → Etc/GMT+5.
 */
function offsetToIana(label) {
    if (label === 'UTC')
        return 'Etc/UTC';
    const m = label.match(/^UTC([+-]\d{1,2})$/);
    if (m) {
        const offset = Number(m[1]);
        const inverted = -offset;
        return `Etc/GMT${inverted >= 0 ? `+${inverted}` : inverted}`;
    }
    // Если уже IANA-зона
    return label;
}
/**
 * Запускает cron-таск по расписанию из ENV (час и минута).
 */
function startDailyNewsScheduler(bot) {
    // Расписание запускаем каждую минуту, чтобы точнее ловить нужную минуту
    node_cron_1.default.schedule('* * * * *', async () => {
        const now = new Date();
        const TARGET_HOUR = parseInt(process.env.DAILY_NEWS_HOUR ?? '9', 10);
        const TARGET_MINUTE = parseInt(process.env.DAILY_NEWS_MINUTE ?? '0', 10);
        console.log(`[scheduler] tick at ${now.toISOString()}; ` +
            `target ${TARGET_HOUR}:${TARGET_MINUTE.toString().padStart(2, '0')}`);
        let rows;
        try {
            const res = await db_1.pool.query('SELECT tg_id, tz_id FROM user_settings');
            rows = res.rows;
        }
        catch (err) {
            console.error('[scheduler] ошибка чтения user_settings:', err);
            return;
        }
        for (const { tg_id, tz_id } of rows) {
            const zone = offsetToIana(tz_id);
            let userTime;
            try {
                const localString = now.toLocaleString('en-US', { timeZone: zone });
                userTime = new Date(localString);
            }
            catch (e) {
                console.error(`[scheduler] неверная временная зона "${tz_id}" → "${zone}":`, e);
                continue;
            }
            console.log(`[scheduler] user=${tg_id}, tz_id="${tz_id}", ` +
                `iana="${zone}", userTime=${userTime.toISOString()}`);
            if (userTime.getHours() === TARGET_HOUR &&
                userTime.getMinutes() === TARGET_MINUTE) {
                console.log(`[scheduler] отправляем daily news для ${tg_id}`);
                try {
                    await (0, dailyNews_1.sendDailyNews)(bot, tg_id);
                }
                catch (e) {
                    console.error(`[scheduler] не смог отправить daily news для ${tg_id}:`, e);
                }
            }
        }
    });
}
