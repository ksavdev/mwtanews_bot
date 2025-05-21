/* ─────────── src/lib/teApi.ts ───────────
   TradingEconomics API helper
   — нормализуем дату события
   --------------------------------------- */

import axios from 'axios';

const TOKEN = process.env.TE_TOKEN;
if (!TOKEN) throw new Error('TE_TOKEN is not set');

/* «сырое» событие из TradingEconomics */
interface TeEventRaw {
  Date: string; // "2025-05-06T15:15:00"
  Importance: number;
  Country: string;
  Event: string;
  Category: string;
  /* …другие поля нам сейчас не нужны, но сохраняем через [k: string]: any */
  [k: string]: any;
}

/* событие, которое будет использовать бот */
export interface TeEvent extends TeEventRaw {
  /** оригинальный Date перекладываем в удобное поле time */
  time: string; // то же значение, дублирование для удобства
}

/**
 * События на сегодня (UTC дата), переведённые на нужный язык
 * @param lang — ISO‑код (ru, en, es …). Если TE его не знает, API вернёт en.
 */
export async function getTodayEvents(lang = 'en'): Promise<TeEvent[]> {
  const today = new Date().toISOString().slice(0, 10); // YYYY‑MM‑DD
  const c = encodeURIComponent(TOKEN!); // ':' → %3A

  const url =
    `https://api.tradingeconomics.com/calendar` +
    `?c=${c}&d1=${today}&d2=${today}&f=json&lang=${lang}`;

  const { data } = await axios.get<TeEventRaw[]>(url);

  // преобразуем: добавляем поле time
  return data.map((e) => ({
    ...e,
    time: e.Date, // оставляем исходный ISO‑формат
  }));
}
