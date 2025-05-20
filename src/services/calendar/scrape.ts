// src/services/calendar/scrape.ts
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { load } from "cheerio";
import dayjs from "dayjs";

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

// ───────────────────────────────────────────────────────────────────────────────

// 1️⃣  Register the stealth plugin (now typed correctly)
puppeteer.use(StealthPlugin());

/**
 * Скачивает и парсит весь календарь,
 * возвращает неотфильтрованный массив событий.
 */
export async function scrapeAllEvents(): Promise<CalendarEvent[]> {
  const rootUrl = "https://ksavdev.github.io/testnews/";

  // 2️⃣  Launch a real browser instance
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/124.0.0.0 Safari/537.36"
  );

  // 3️⃣  Navigate to the outer page and wait for the iframe
  await page.goto(rootUrl, { waitUntil: "networkidle2" });
  await page.waitForSelector("iframe");

  // 4️⃣  Extract src from the iframe, typed element parameter
  const iframeSrc = await page.$eval(
    "iframe",
    (el: HTMLIFrameElement) => el.src
  );
  const calUrl = new URL(iframeSrc, rootUrl).href;

  // 5️⃣  Load the iframe content and wait for the table
  await page.goto(calUrl, { waitUntil: "networkidle2" });
  await page.waitForSelector("#ecEventsTable");

  // 6️⃣  Scrape the table into structured objects
  const calHtml = await page.content();
  await browser.close();

  const $ = load(calHtml);
  const rows = $('#ecEventsTable > tbody > tr[id^="eventRowId_"]');

  const events = rows
    .map((_, tr) => {
      const $tr = $(tr);
      if ($tr.find("td").length < 7) return null; // skip separators
      return {
        time: $tr.find("td.time").text().trim(),
        currency: $tr.find("td.flagCur").text().trim(),
        importance: $tr.find("td.sentiment i.grayFullBullishIcon").length,
        title: $tr.find("td.event").text().trim(),
        actual: $tr.find("td.act").text().trim() || null,
        forecast: $tr.find("td.fore").text().trim() || null,
        previous: $tr.find("td.prev").text().trim() || null,
        timestamp: $tr.attr("event_timestamp")
          ? dayjs($tr.attr("event_timestamp")).toISOString()
          : null
      } as CalendarEvent;
    })
    .get()
    .filter(Boolean);

  return events;
}
