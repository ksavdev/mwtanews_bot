"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDailyNewsScheduler = startDailyNewsScheduler;
require("dotenv/config");
const node_cron_1 = __importDefault(require("node-cron"));
const db_1 = require("@/core/db");
const dailyNews_1 = require("@/features/news/commands/dailyNews");
const dayjs_1 = __importDefault(require("dayjs"));
const utc_1 = __importDefault(require("dayjs/plugin/utc"));
const timezone_1 = __importDefault(require("dayjs/plugin/timezone"));
dayjs_1.default.extend(utc_1.default);
dayjs_1.default.extend(timezone_1.default);
function offsetToIana(label) {
    if (label === 'UTC')
        return 'Etc/UTC';
    const m = label.match(/^UTC([+-]\d{1,2})$/);
    if (m) {
        const offset = Number(m[1]);
        const inverted = -offset;
        return `Etc/GMT${inverted >= 0 ? `+${inverted}` : inverted}`;
    }
    return label;
}
function startDailyNewsScheduler(bot) {
    node_cron_1.default.schedule('* * * * *', async () => {
        const now = new Date();
        const TARGET_HOUR = parseInt(process.env.DAILY_NEWS_HOUR ?? '9', 10);
        const TARGET_MINUTE = parseInt(process.env.DAILY_NEWS_MINUTE ?? '0', 10);
        console.log(`[scheduler] tick at ${now.toISOString()}; target ${TARGET_HOUR}:${TARGET_MINUTE
            .toString()
            .padStart(2, '0')}`);
        const batchSize = 100;
        let offset = 0;
        while (true) {
            let res;
            try {
                res = await db_1.pool.query('SELECT tg_id, tz_id FROM user_settings LIMIT $1 OFFSET $2', [batchSize, offset]);
            }
            catch (err) {
                console.error('[scheduler] ошибка чтения user_settings:', err);
                break;
            }
            if (res.rowCount === 0)
                break;
            for (const { tg_id, tz_id } of res.rows) {
                const zone = offsetToIana(tz_id);
                let localTime;
                try {
                    localTime = (0, dayjs_1.default)().tz(zone);
                }
                catch (e) {
                    console.error(`[scheduler] ошибка расчёта времени для tz_id "${tz_id}" → "${zone}":`, e);
                    continue;
                }
                console.log(`[scheduler] user=${tg_id}, tz_id="${tz_id}", iana="${zone}", localTime=${localTime.format()}`);
                if (localTime.hour() === TARGET_HOUR && localTime.minute() === TARGET_MINUTE) {
                    console.log(`[scheduler] отправляем daily news для ${tg_id}`);
                    try {
                        await (0, dailyNews_1.sendDailyNews)(bot, tg_id);
                    }
                    catch (e) {
                        console.error(`[scheduler] не смог отправить daily news для ${tg_id}:`, e);
                    }
                }
            }
            offset += batchSize;
        }
    });
}
