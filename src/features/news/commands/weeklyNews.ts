// src/features/news/commands/weeklyNews.ts

import { Composer } from 'grammy';
import { DateTime } from 'luxon';

import { BotCtx } from '@/core/bot';
import { pool } from '@/core/db';
import { CalendarEvent, scrapeAllEvents } from '../services/scrape';


const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
const info = (...a: unknown[]) => console.log('[INFO] ', ...a);
const debug = (...a: unknown[]) => LOG_LEVEL === 'debug' && console.log('[DEBUG]', ...a);

interface PrefRow {
  tz_id: string;
  importance: number;
  lang: string;
}

/** Получить настройки пользователя из БД */
async function getPrefs(id: number): Promise<PrefRow | null> {
  const { rows } = await pool.query<PrefRow>(
    'SELECT tz_id, importance, lang FROM user_settings WHERE tg_id = $1',
    [id],
  );
  return rows[0] ?? null;
}

/** Собрать все события недели в UTC */
async function getWeekEvents(lang: string): Promise<CalendarEvent[]> {
  const all = await scrapeAllEvents();
  const now = DateTime.utc();
  const weekFromNow = now.plus({ days: 7 });
  return all.filter((e) => {
    if (!e.timestamp) return false;
    const ts = DateTime.fromISO(e.timestamp!, { zone: 'utc' });
    return ts >= now && ts <= weekFromNow;
  });
}

/** Эмодзи по важности: 1=🟢,2=🟡,3=🔴 */
const mark = ['🟢', '🟡', '🔴'] as const;

/** Флаг по коду валюты */
function currencyFlag(cur: string): string {
  const map: Record<string, string> = {
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

export function registerWeeklyNewsCommand(composer: Composer<BotCtx>) {
  composer.command('weekly_news', async (ctx) => {
    const pref = await getPrefs(ctx.from!.id);
    const uid = ctx.from!.id;
    if (!pref) return ctx.reply('Сначала введите /start 🙂');

    const events = (await getWeekEvents(pref.lang))
      .filter((e) => e.importance >= pref.importance && e.timestamp)
      .sort((a, b) => (a.timestamp! < b.timestamp! ? -1 : 1));

    info(`/weekly_news ${uid}: scraped=${events.length}`);
    if (!events.length) {
      return ctx.reply('На ближайшую неделю важных событий нет 🙂');
    }

    // Если слишком много — предложить /set_news_type
    const MAX_EVENTS = 50;
    if (events.length > MAX_EVENTS) {
      return ctx.reply(
        `📋 Найдено ${events.length} событий — слишком много для одного сообщения.\n\n` +
        `Попробуйте выбрать более высокий уровень важности через /set_news_type.\n` +
        `Текущий уровень: ${pref.importance} (${mark[pref.importance - 1]})`
      );
    }

    // Формируем заголовок
    const header = `Ключевые события ближайшей недели (${pref.tz_id}):`;
    const footer = '_____________________________\nby MW:TA';

    // Формируем тело с флажками
    const body = events
      .map((e) => {
        const t = DateTime.fromISO(e.timestamp!, { zone: 'utc' })
          .setZone(pref.tz_id)
          .toFormat('dd.LL HH:mm');
        return (
          `${mark[e.importance - 1]} ` +
          `${currencyFlag(e.currency)} ${e.currency} — ${e.title} — ${t}`
        );
      })
      .join('\n');

    await ctx.reply(`${header}\n${body}\n${footer}`, {
      link_preview_options: { is_disabled: true },
    });
  });
}
