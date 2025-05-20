"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLangCommand = setLangCommand;
const grammy_1 = require("grammy");
const user_service_js_1 = require("../services/user.service.js");
function setLangCommand(bot) {
    /* меню с двумя кнопками */
    const kb = new grammy_1.InlineKeyboard()
        .text("🇷🇺 Русский", "lang_ru")
        .text("🇬🇧 English", "lang_en");
    /* /set_lang — показать меню */
    bot.command("set_lang", (ctx) => ctx.reply("Выберите язык новостей:", { reply_markup: kb }));
    /* обработчик нажатий */
    bot.callbackQuery(/lang_(ru|en)/, async (ctx) => {
        const lang = ctx.match[1];
        await (0, user_service_js_1.setLanguage)(ctx.from.id, lang);
        const label = lang === "ru" ? "Русский" : "English";
        await ctx.answerCallbackQuery({ text: `Сохранён язык: ${label}`, show_alert: true });
        await ctx.editMessageText(`✅ Вы выбрали язык: ${label}`, {
            reply_markup: { inline_keyboard: [] },
        });
    });
}
