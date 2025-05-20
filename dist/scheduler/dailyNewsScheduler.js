"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDailyNewsScheduler = startDailyNewsScheduler;
// src/scheduler/dailyNewsScheduler.ts
const node_cron_1 = __importDefault(require("node-cron"));
const luxon_1 = require("luxon");
const db_js_1 = require("../db.js");
const dailyNews_js_1 = require("../commands/dailyNews.js");
/** Форматирует 2-значное число (07, 15, 00) */
const pad = (n) => n.toString().padStart(2, "0");
function startDailyNewsScheduler(bot) {
    // каждые 60 с проверяем, у кого наступило нужное время
    node_cron_1.default.schedule("* * * * *", async () => {
        const utcNow = luxon_1.DateTime.utc();
        // все пользователи
        const { rows } = await db_js_1.pool.query("SELECT tg_id, tz_id, last_daily_sent FROM user_settings");
        for (const u of rows) {
            const local = utcNow.setZone(u.tz_id);
            // уже отправляли сегодня?
            const alreadySent = u.last_daily_sent &&
                luxon_1.DateTime.fromJSDate(u.last_daily_sent).hasSame(local, "day");
            // ровно 15:00:00 и не отправляли
            if (local.hour === 15 && local.minute === 0 && !alreadySent) {
                await (0, dailyNews_js_1.sendDailyNews)(bot, u.tg_id);
                // лог строки вида: [SCHEDULER] 15:00:00 → sent daily news to 890360195 (Europe/Moscow)
                console.log(`[SCHEDULER] ${pad(local.hour)}:${pad(local.minute)}:${pad(local.second)} ` +
                    `→ sent daily news to ${u.tg_id} (${u.tz_id})`);
                // отметим отправку
                await db_js_1.pool.query("UPDATE user_settings SET last_daily_sent = CURRENT_DATE WHERE tg_id = $1", [u.tg_id]);
            }
        }
    });
    console.log("⏰ Daily-news scheduler started");
}
