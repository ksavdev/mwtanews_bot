import { Composer, Bot } from 'grammy';
import { DateTime } from 'luxon';
import { BotCtx } from '@/core/bot';
import { pool } from '@/core/db';
import { CalendarEvent, scrapeAllEvents } from '../services/scrape';
import { info, debug, LOG_LEVEL } from '@/shared/const/logs';
import { ISO, mark } from '@/shared/const/marks';


function currencyFlag(cur: string): string {
  const map: Record<string, string> = {
    USD: '🇺🇸', EUR: '🇪🇺', CAD: '🇨🇦', GBP: '🇬🇧',
    JPY: '🇯🇵', AUD: '🇦🇺', NZD: '🇳🇿', CHF: '🇨🇭',
    CNY: '🇨🇳',
  };
  return map[cur] ?? '';
}

async function replyInChunks(
  ctx: Pick<BotCtx, 'reply'>,
  lines: string[],
  header: string,
  footer: string,
  chunkSize = 20,
) {
  for (let i = 0; i < lines.length; i += chunkSize) {
    const chunk = lines.slice(i, i + chunkSize);
    const text = [header, ...chunk, footer].join('\n');
    await ctx.reply(text, { link_preview_options: { is_disabled: true } });
  }
}

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

async function getTodayEvents(lang: string, tz: string): Promise<CalendarEvent[]> {
  const all = await scrapeAllEvents();
  const today = DateTime.utc().setZone(tz);
  const startUtc = today.startOf('day').toUTC();
  const endUtc = today.endOf('day').toUTC();

  return all.filter((e) => {
    if (!e.timestamp) return false;
    const ts = DateTime.fromISO(e.timestamp, { zone: 'utc' });
    return ts >= startUtc && ts <= endUtc;
  });
}

export function registerDailyNewsCommand(composer: Composer<BotCtx>) {
  composer.command('daily_news', async (ctx) => {
    const tgId = ctx.from!.id;
    const pref = await getPrefs(tgId);
    if (!pref) return ctx.reply('Сначала введите /start 🙂');

    let events: CalendarEvent[];
    try {
      events = await getTodayEvents(pref.lang, pref.tz_id);
    } catch (err) {
      console.error('[daily_news] ошибка скрапинга календаря:', err);
      return ctx.reply('⚠️ Не удалось получить дневной календарь, попробуйте позже.');
    }

    events = events
      .filter((e) => e.importance >= pref.importance && e.timestamp)
      .sort((a, b) => (a.timestamp! < b.timestamp! ? -1 : 1));

    info(`/daily_news ${tgId}: scraped=${events.length}, shown=${events.length}`);
    if (LOG_LEVEL === "debug") {
      const dropped = events.filter(e => e.importance < pref.importance || !e.timestamp);
      debug("Dropped:", dropped.length, JSON.stringify(dropped, null, 2));
    }
    if (!events.length) {
      return ctx.reply('Сегодня важных событий нет 🙂');
    }

    const today = DateTime.utc()
      .setZone(pref.tz_id)
      .setLocale(ISO[pref.lang] ? pref.lang : 'en');
    const header = `Ключевые события ${today.toFormat('cccc - dd.LL.yyyy')} (${pref.tz_id}):`;
    const footer = '_____________________________\nby MW:TA';

    const lines = events.map((e) => {
      const t = DateTime.fromISO(e.timestamp!, { zone: 'utc' })
        .setZone(pref.tz_id)
        .toFormat('HH:mm');
      return `${mark[e.importance - 1]} ${currencyFlag(e.currency)} ${e.currency} — ${e.title} — ${t}`;
    });

    await replyInChunks(ctx, lines, header, footer);
  });
}

export async function sendDailyNews(bot: Bot<BotCtx>, userId: number) {
  const pref = await getPrefs(userId);
  if (!pref) return;

  let events: CalendarEvent[];
  try {
    events = await getTodayEvents(pref.lang, pref.tz_id);
  } catch (err) {
    console.error('[calendar scrape]', err);
    return bot.api.sendMessage(userId, '⚠️ Не удалось получить новости, попробуйте позже.');
  }

  events = events
    .filter((e) => e.importance >= pref.importance && e.timestamp)
    .sort((a, b) => (a.timestamp! < b.timestamp! ? -1 : 1));

  if (!events.length) {
    return bot.api.sendMessage(userId, 'Сегодня важных событий нет 🙂');
  }

  const today = DateTime.utc()
    .setZone(pref.tz_id)
    .setLocale(ISO[pref.lang] ? pref.lang : 'en');
  const header = `Ключевые события ${today.toFormat('cccc - dd.LL.yyyy')} (${pref.tz_id}):`;
  const footer = '_____________________________\nby MW:TA';

  const lines = events.map((e) => {
    const t = DateTime.fromISO(e.timestamp!, { zone: 'utc' })
      .setZone(pref.tz_id)
      .toFormat('HH:mm');
    return `${mark[e.importance - 1]} ${currencyFlag(e.currency)} ${e.currency} — ${e.title} — ${t}`;
  });

  for (let i = 0; i < lines.length; i += 20) {
    const chunk = lines.slice(i, i + 20);
    const text = [header, ...chunk, footer].join('\n');
    await bot.api.sendMessage(userId, text);
  }
}