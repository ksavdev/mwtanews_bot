"use strict";
/* ─────────── src/lib/teApi.ts ───────────
   TradingEconomics API helper
   — нормализуем дату события
   --------------------------------------- */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayEvents = getTodayEvents;
const axios_1 = __importDefault(require("axios"));
const TOKEN = process.env.TE_TOKEN;
if (!TOKEN)
    throw new Error("TE_TOKEN is not set");
/**
 * События на сегодня (UTC дата), переведённые на нужный язык
 * @param lang — ISO‑код (ru, en, es …). Если TE его не знает, API вернёт en.
 */
async function getTodayEvents(lang = "en") {
    const today = new Date().toISOString().slice(0, 10); // YYYY‑MM‑DD
    const c = encodeURIComponent(TOKEN); // ':' → %3A
    const url = `https://api.tradingeconomics.com/calendar` +
        `?c=${c}&d1=${today}&d2=${today}&f=json&lang=${lang}`;
    const { data } = await axios_1.default.get(url);
    // преобразуем: добавляем поле time
    return data.map((e) => ({
        ...e,
        time: e.Date, // оставляем исходный ISO‑формат
    }));
}
