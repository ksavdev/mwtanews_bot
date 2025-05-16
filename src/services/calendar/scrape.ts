// services/calendar/scrape.ts 

import axios from "axios";
import { load } from "cheerio";
import dayjs from "dayjs";
import type { DateTime } from "luxon";

/** Тип события, аналогичный тому, что у вас в cache.ts */
export interface CalendarEvent {
  time: string;
  currency: string;
  importance: number;
  title: string;
  actual: string | null;
  forecast: string | null;
  previous: string | null;
  timestamp: string | null;
}

/**
 * Скачивает и парсит весь календарь,
 * возвращает неотфильтрованный массив событий.
 */
export async function scrapeAllEvents(): Promise<CalendarEvent[]> {
  const rootUrl = "https://ksavdev.github.io/testnews/";

  // 1) Загрузить HTML с «главной» (где iframe)
  const { data: rootHtml } = await axios.get<string>(rootUrl);
  const $root = load(rootHtml);
  const iframeSrc = $root("iframe").attr("src");
  if (!iframeSrc) throw new Error("iframe не найден на странице");

  // 2) Подготовить URL календаря
  const calUrl = new URL(iframeSrc, rootUrl).href;

  // 3) Скачать HTML календаря
  const { data: calHtml } = await axios.get<string>(calUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: rootUrl,
    },
  });

  // 4) Распарсить таблицу
  const $ = load(calHtml);
  const rows = $('#ecEventsTable > tbody > tr[id^="eventRowId_"]');

  const events: Array<CalendarEvent | null> = rows
    .map((_, tr) => {
      const $tr = $(tr);
      // Пропускаем «разделители»
      if ($tr.find("td").length < 7) return null;

      return {
        time:       $tr.find("td.time").text().trim(),
        currency:   $tr.find("td.flagCur").text().trim(),
        importance: $tr.find("td.sentiment i.grayFullBullishIcon").length,
        title:      $tr.find("td.event").text().trim(),
        actual:     $tr.find("td.act").text().trim()  || null,
        forecast:   $tr.find("td.fore").text().trim() || null,
        previous:   $tr.find("td.prev").text().trim() || null,
        timestamp:  $tr.attr("event_timestamp")
                      ? dayjs($tr.attr("event_timestamp")).toISOString()
                      : null,
      };
    })
    .get();

  // Убираем null’ы
  return events.filter((e): e is CalendarEvent => e !== null);
}
