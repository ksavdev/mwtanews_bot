import { Composer, InlineKeyboard } from 'grammy';
import { DateTime } from 'luxon';

import { BotCtx } from '@/core/bot';
import { pool } from '@/core/db';
import { CalendarEvent, scrapeAllEvents } from '../services/scrape';

interface PrefRow {
  tz_id: string;
  importance: number;
  lang: string;
}

const mark = ['🟢', '🟡', '🔴'] as const;
const MAX_EVENTS = 20;

async function getPrefs(id: number): Promise<PrefRow | null> {
  const { rows } = await pool.query<PrefRow>(
    'SELECT tz_id, importance, lang FROM user_settings WHERE tg_id = $1',
    [id],
  );
  return rows[0] ?? null;
}

async function getWeekEvents(lang: string): Promise<CalendarEvent[]> {
  const events = await scrapeAllEvents();
  const now = DateTime.utc();
  const weekFromNow = now.plus({ days: 7 });

  return events.filter((e) => {
    if (!e.timestamp) return false;
    const ts = DateTime.fromISO(e.timestamp, { zone: 'utc' });
    return ts >= now && ts <= weekFromNow;
  });
}

export function registerWeeklyNewsCommand(composer: Composer<BotCtx>) {
  composer.command('weekly_news', async (ctx) => {
    const pref = await getPrefs(ctx.from!.id);
    if (!pref) return ctx.reply('Сначала введите /start 🙂');

    const events = (await getWeekEvents(pref.lang))
      .filter((e) => e.importance >= pref.importance && e.timestamp)
      .sort((a, b) => (a.timestamp! < b.timestamp! ? -1 : 1));

    if (!events.length) {
      return ctx.reply('На ближайшую неделю важных событий нет 🙂');
    }

    if (events.length > MAX_EVENTS) {
      return ctx.reply(
        `📋 Найдено ${events.length} событий — слишком много для Telegram.\n\n` +
        `Попробуйте выбрать более высокий уровень важности через команду /set_news_type.\n` +
        `Сейчас установлен уровень: ${pref.importance} (${mark[pref.importance - 1]})`
      );
    }

    const header = `Ключевые события ближайшей недели (${pref.tz_id}):`;
    const body = events
      .map((e) => {
        const t = DateTime.fromISO(e.timestamp!, { zone: 'utc' })
          .setZone(pref.tz_id)
          .toFormat('dd.LL HH:mm');
        return `${mark[e.importance - 1]} ${e.currency} — ${e.title} — ${t}`;
      })
      .join('\n');

    await ctx.reply(`${header}\n${body}`);
  });
}
