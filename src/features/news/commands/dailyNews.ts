// src/features/news/commands/dailyNews.ts
import { Composer, Bot } from 'grammy';
import { DateTime } from 'luxon';

import { BotCtx } from '@/core/bot';
import { pool } from '@/core/db';
import { CalendarEvent, scrapeAllEvents } from '../services/scrape';

// ──────────────────────── utils ────────────────────────────

const LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';
const info = (...a: unknown[]) => console.log('[INFO] ', ...a);
const debug = (...a: unknown[]) => LOG_LEVEL === 'debug' && console.log('[DEBUG]', ...a);

// эмоджи по важности
const mark = ['🟢', '🟡', '🔴'] as const;

// поддерживаемые ISO-коды языков (для локализации дня недели)
const ISO: Record<string, true> = {
  it: true, zh: true, ru: true, es: true, pl: true, tr: true, ja: true,
  pt: true, da: true, fa: true, ko: true, fr: true, no: true, id: true,
  de: true, hu: true, ar: true, sv: true,
};

// возвращает флаг по коду валюты
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

// отправка большими порциями по 20 строк
async function replyInChunks(
  ctx: Pick<BotCtx, 'reply'>,
  header: string,
  lines: string[],
  footer: string,
) {
  const batchSize = 20;
  for (let i = 0; i < lines.length; i += batchSize) {
    const part: string[] = [];
    if (i === 0) part.push(header);
    part.push(...lines.slice(i, i + batchSize));
    if (i + batchSize >= lines.length) part.push(footer);

    await ctx.reply(part.join('\n'), {
      link_preview_options: { is_disabled: true },
    });
  }
}

// ──────────────────────── DB модели ─────────────────────────

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

// ──────────────────────── Calendar helpers ──────────────────

async function getTodayEvents(lang: string, tz: string): Promise<CalendarEvent[]> {
  const all = await scrapeAllEvents();
  const today = DateTime.utc().setZone(tz);
  const startUtc = today.startOf('day').toUTC();
  const endUtc   = today.endOf('day').toUTC();

  return all.filter((e) => {
    if (!e.timestamp) return false;
    const ts = DateTime.fromISO(e.timestamp!, { zone: 'utc' });
    return ts >= startUtc && ts <= endUtc;
  });
}

// ──────────────────────── Команда /daily_news ───────────────

export function registerDailyNewsCommand(composer: Composer<BotCtx>) {
  composer.command('daily_news', async (ctx) => {
    const uid = ctx.from!.id;
    const pref = await getPrefs(uid);
    if (!pref) return ctx.reply('Сначала введите /start 🙂');

    let events: CalendarEvent[];
    try {
      events = await getTodayEvents(pref.lang, pref.tz_id);
    } catch (err: unknown) {
      console.error('[calendar scrape]', err);
      return ctx.reply('⚠️ Не удалось получить новости, попробуйте позже.');
    }

    events = events
      .filter((e) => e.importance >= pref.importance && e.timestamp)
      .sort((a, b) => (a.timestamp! < b.timestamp! ? -1 : 1));

    info(`/daily_news ${uid}: scraped=${events.length}`);

    if (!events.length) {
      return ctx.reply('Сегодня важных событий нет 🙂');
    }

    // формируем заголовок и подвал
    const today = DateTime.utc()
      .setZone(pref.tz_id)
      .setLocale(ISO[pref.lang] ? pref.lang : 'en');
    const header = `Ключевые события ${today.toFormat('cccc - dd.LL.yyyy')} (${pref.tz_id}):`;
    const footer = '_____________________________\nby MW:TA';

    // формируем строки с флажками
    const lines = events.map((e) => {
      const tLocal = DateTime.fromISO(e.timestamp!, { zone: 'utc' })
        .setZone(pref.tz_id)
        .toFormat('HH:mm');
      return (
        `${mark[e.importance - 1]} ` +
        `${currencyFlag(e.currency)} ${e.currency} — ${e.title} — ${tLocal}`
      );
    });

    // отправляем порциями
    await replyInChunks(ctx, header, lines, footer);
  });
}

// ──────────────────────── PUSH-уведомление (cron) ───────────

export async function sendDailyNews(bot: Bot<BotCtx>, userId: number) {
  const pref = await getPrefs(userId);
  if (!pref) return;

  let events: CalendarEvent[];
  try {
    events = await getTodayEvents(pref.lang, pref.tz_id);
  } catch (err: unknown) {
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
    const tLocal = DateTime.fromISO(e.timestamp!, { zone: 'utc' })
      .setZone(pref.tz_id)
      .toFormat('HH:mm');
    return (
      `${mark[e.importance - 1]} ` +
      `${currencyFlag(e.currency)} ${e.currency} — ${e.title} — ${tLocal}`
    );
  });

  await replyInChunks(
    { reply: (txt: string) => bot.api.sendMessage(userId, txt) } as Pick<BotCtx, 'reply'>,
    header,
    lines,
    footer,
  );
}
