"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setNewsTypeCommand = void 0;
const grammy_1 = require("grammy");
const user_service_js_1 = require("../services/user.service.js");
const setNewsTypeCommand = (bot) => {
    /* ---------- хендлер команды ---------- */
    bot.command("set_news_type", async (ctx) => {
        const kb = new grammy_1.InlineKeyboard()
            .text("🔴 Только важные", "imp:3").row()
            .text("🟡 Средние + 🔴", "imp:2").row()
            .text("🟢 Все новости", "imp:1");
        await ctx.reply("Какой уровень важности новостей вы хотите получать?", { reply_markup: kb });
    });
    /* ---------- хендлер callback‑кнопок ---------- */
    bot.callbackQuery(/^imp:(\d)$/, async (ctx) => {
        const level = Number(ctx.match[1]); // 1‑3
        await (0, user_service_js_1.setImportance)(ctx.from.id, level); // запись в БД
        const label = level === 3 ? "🔴 Только важные" :
            level === 2 ? "🟡 Средние + 🔴" :
                "🟢 Все новости";
        await ctx.answerCallbackQuery({
            text: `Сохранено: ${label}`,
            show_alert: true,
        });
        await ctx.editMessageText(`✅ Вы выбрали: ${label}`, {
            reply_markup: { inline_keyboard: [] }
        });
    });
};
exports.setNewsTypeCommand = setNewsTypeCommand;
