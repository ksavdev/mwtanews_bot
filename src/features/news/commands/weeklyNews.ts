// src/features/news/commands/weeklyNews.ts
import { Composer } from 'grammy';
import { DateTime } from 'luxon';

import { BotCtx } from '@/core/bot';
import { pool } from '@/core/db';
import { CalendarEvent, scrapeAllEvents } from '../services/scrape';


/* ====== настройки логов ====== */
const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
const info  = (...a: unknown[]) => console.log("[INFO]",  ...a);
const debug = (...a: unknown[]) => LOG_LEVEL === "debug" && console.log("[DEBUG]", ...a);

// ───── параметры разбивки ─────
const CHUNK_SIZE = 20;

// ───── эмодзи по важности ─────
const mark = ['🟢', '🟡', '🔴'] as const;

// ─────️ флаг по коду валюты ─────
function currencyFlag(cur: string): string {
  const map: Record<string, string> = {
    USD: '🇺🇸', EUR: '🇪🇺', CAD: '🇨🇦', GBP: '🇬🇧',
    JPY: '🇯🇵', AUD: '🇦🇺', NZD: '🇳🇿', CHF: '🇨🇭',
    CNY: '🇨🇳',
  };
  return map[cur] ?? '';
}

// ───── получить настройки пользователя ─────
interface PrefRow {
  tz_id: string;
  importance: number;
  lang: string;
}
async function getPrefs(tgId: number): Promise<PrefRow | null> {
  const { rows } = await pool.query<PrefRow>(
    'SELECT tz_id, importance, lang FROM user_settings WHERE tg_id = $1',
    [tgId],
  );
  return rows[0] ?? null;
}

// ───── собрать все события на неделю вперед ─────
async function getWeekEvents(): Promise<CalendarEvent[]> {
  const all = await scrapeAllEvents();
  const now = DateTime.utc();
  const weekEnd = now.plus({ days: 7 });
  return all.filter((e) => {
    if (!e.timestamp) return false;
    const ts = DateTime.fromISO(e.timestamp, { zone: 'utc' });
    return ts >= now && ts <= weekEnd;
  });
}

// ───── разбивка на чанки с header+footer ─────
async function replyInChunks(
  ctx: Pick<BotCtx, 'reply'>,
  lines: string[],
  header: string,
  footer: string,
  chunkSize = CHUNK_SIZE,
) {
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    const text = [header, ...chunk, footer].join('\n');
    await ctx.reply(text, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  }
}

// ───── регистрация команды /weekly_news ─────

export function registerWeeklyNewsCommand(composer: Composer<BotCtx>) {
  composer.command('weekly_news', async (ctx) => {
    const tgId = ctx.from!.id;
    const pref = await getPrefs(tgId);
    if (!pref) return ctx.reply('Сначала введите /start 🙂');

    let events: CalendarEvent[];
    try {
      events = await getWeekEvents();
    } catch (err) {
      console.error('[weekly_news] ошибка скрапинга календаря:', err);
      return ctx.reply(
        '⚠️ Не удалось получить календарь новостей, попробуйте чуть позже.'
      );
    }

    info(`/weekly_news ${tgId}: scraped=${events.length}, shown=${events.length}`);
    if (LOG_LEVEL === "debug") {
      const dropped = events.filter(e => e.importance < pref.importance || !e.timestamp);
      debug("Dropped:", dropped.length, JSON.stringify(dropped, null, 2));
    }
    if (!events.length) {
      return ctx.reply('Сегодня важных событий нет 🙂');
    }

    // собрали и отфильтровали события
    events = events
      .filter((e) => e.importance >= pref.importance && e.timestamp)
      .sort((a, b) => (a.timestamp! < b.timestamp! ? -1 : 1));

    if (!events.length) {
      return ctx.reply('На ближайшую неделю важных событий нет 🙂');
    }

    // вычисляем границы недели (пн–вс) в зоне пользователя
    const weekStart = DateTime.utc().setZone(pref.tz_id).startOf('week');
    const weekEnd = weekStart.plus({ days: 6 });

    // группируем события по дате YYYY-MM-DD
    const grouped: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const local = DateTime.fromISO(e.timestamp!, { zone: 'utc' })
        .setZone(pref.tz_id);
      const key = local.toISODate()!;
      (grouped[key] ??= []).push(e);
    }

    // готовим массив всех семи дней от пн до вс
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(weekStart.plus({ days: i }));
    }

    // общий заголовок и футер
    const rangeStart = weekStart.toFormat('dd.LL.yyyy');
    const rangeEnd = weekEnd.toFormat('dd.LL.yyyy');
    const header = `<b>Ключевые события недели</b> (${rangeStart} — ${rangeEnd}, ${pref.tz_id})`;
    const footer = '_____________________________\nby MW:TA';

    // собираем все строки: для каждого дня — заголовок и либо события, либо надпись об их отсутствии
    const allLines: string[] = [];
    for (const day of days) {
      const dayName = day.setLocale('ru').toFormat('cccc');
      const dateStr = day.toFormat('dd.LL.yyyy');
      // вычисляем офсет часов
      const offsetHrs = day.offset / 60;
      const tzLabel = offsetHrs === 0
        ? 'UTC'
        : `UTC${offsetHrs > 0 ? '+' : ''}${offsetHrs}`;
      // жирный заголовок дня
      allLines.push(
        `<b>${dayName.charAt(0).toUpperCase() + dayName.slice(1)} — ${dateStr} (${tzLabel})</b>`
      );

      const dayKey = day.toISODate()!;
      const evs = grouped[dayKey] ?? [];
      if (!evs.length) {
        allLines.push('Важные события на эту дату отсутствуют.');
      } else {
        for (const e of evs) {
          const tLocal = DateTime.fromISO(e.timestamp!, { zone: 'utc' })
            .setZone(pref.tz_id)
            .toFormat('HH:mm');
          allLines.push(
            `${mark[e.importance - 1]} ${currencyFlag(e.currency)} ${e.currency} — ${e.title} — ${tLocal}`
          );
        }
      }
      allLines.push(''); // пустая строка между днями
    }

    // отправляем чанками
    await replyInChunks(ctx, allLines, header, footer);
  });
}
