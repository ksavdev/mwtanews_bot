"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDailyNewsScheduler = startDailyNewsScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("@/core/db");
const dailyNews_1 = require("@/features/news/commands/dailyNews");
/**
 * Конвертирует метки "UTC+3"/"UTC-2"/"UTC" в валидные IANA
 * Etc/GMT-инверсия используется по стандарту (знак меняется).
 */
function offsetToIana(label) {
    if (label === 'UTC')
        return 'Etc/UTC';
    const m = label.match(/^UTC([+-]\d{1,2})$/);
    if (m) {
        const offset = Number(m[1]);
        // инвертируем знак: UTC+3 → Etc/GMT-3, UTC-5 → Etc/GMT+5
        const inverted = -offset;
        return `Etc/GMT${inverted >= 0 ? `+${inverted}` : inverted}`;
    }
    // Если label уже был IANA-зоной (например Europe/Moscow), возвращаем напрямую
    return label;
}
/**
 * Запускает cron-таск, который каждый час проверяет
 * — есть ли у кого сейчас 09:00 по их часовому поясу.
 */
function startDailyNewsScheduler(bot) {
    // cron-выражение "0 * * * *" = каждую ЗЕРОВУЮ минуту каждого часа
    node_cron_1.default.schedule('0 * * * *', async () => {
        const now = new Date();
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
                // Получаем локальное время пользователя
                const str = now.toLocaleString('en-US', { timeZone: zone });
                userTime = new Date(str);
            }
            catch (e) {
                console.error(`[scheduler] неверная временная зона ${tz_id} → ${zone}`, e);
                continue;
            }
            // Если в этот час у пользователя ровно 09:00 – отсылаем дайли
            if (userTime.getHours() === 9) {
                try {
                    await (0, dailyNews_1.sendDailyNews)(bot, tg_id);
                }
                catch (e) {
                    console.error(`[scheduler] не смог отправить daily news ${tg_id}:`, e);
                }
            }
        }
    });
}
