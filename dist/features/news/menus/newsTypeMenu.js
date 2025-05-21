"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsTypeMenu = void 0;
const menu_1 = require("@grammyjs/menu");
exports.newsTypeMenu = new menu_1.Menu('news-type')
    .text('🗓 Дневные', (ctx) => ctx.api.sendMessage(ctx.chat.id, '/daily_news'))
    .row()
    .text('📅 Недельные', (ctx) => ctx.api.sendMessage(ctx.chat.id, '/weekly_news'))
    .row();
