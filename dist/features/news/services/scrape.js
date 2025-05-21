"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapeAllEvents = scrapeAllEvents;
const puppeteer_extra_1 = __importDefault(require("puppeteer-extra"));
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const cheerio_1 = require("cheerio");
const dayjs_1 = __importDefault(require("dayjs"));
puppeteer_extra_1.default.use((0, puppeteer_extra_plugin_stealth_1.default)());
async function scrapeAllEvents() {
    const rootUrl = 'https://ksavdev.github.io/testnews/';
    const browser = await puppeteer_extra_1.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/124.0.0.0 Safari/537.36');
    await page.goto(rootUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('iframe');
    const iframeSrc = await page.$eval('iframe', (el) => el.src);
    const calUrl = new URL(iframeSrc, rootUrl).href;
    await page.goto(calUrl, { waitUntil: 'networkidle2' });
    await page.waitForSelector('#ecEventsTable', { timeout: 60000 });
    const calHtml = await page.content();
    await browser.close();
    const $ = (0, cheerio_1.load)(calHtml);
    const rows = $('#ecEventsTable > tbody > tr[id^="eventRowId_"]');
    const events = rows
        .map((_, tr) => {
        const $tr = $(tr);
        if ($tr.find('td').length < 7)
            return null;
        return {
            time: $tr.find('td.time').text().trim(),
            currency: $tr.find('td.flagCur').text().trim(),
            importance: $tr.find('td.sentiment i.grayFullBullishIcon').length,
            title: $tr.find('td.event').text().trim(),
            actual: $tr.find('td.act').text().trim() || null,
            forecast: $tr.find('td.fore').text().trim() || null,
            previous: $tr.find('td.prev').text().trim() || null,
            timestamp: $tr.attr('event_timestamp')
                ? (0, dayjs_1.default)($tr.attr('event_timestamp')).toISOString()
                : null,
        };
    })
        .get()
        .filter(Boolean);
    return events;
}
