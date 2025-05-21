"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSetLangCommand = registerSetLangCommand;
// src/features/user/commands/setLang.ts
const grammy_1 = require("grammy");
const user_service_1 = require("@/features/user/services/user.service");
/** Регистрирует команду `/set_lang ru|en` */
function registerSetLangCommand(composer) {
    /* ───────── клавиатура выбора ───────── */
    const langKb = new grammy_1.InlineKeyboard().text('Русский', 'lang_ru').text('English', 'lang_en');
    /* ───────── сама команда ───────── */
    composer.command('set_lang', async (ctx) => {
        const arg = ctx.message?.text.split(' ')[1]?.toLowerCase();
        if (arg === 'ru' || arg === 'en') {
            await (0, user_service_1.setLang)(ctx.from.id, arg);
            return ctx.reply(`✅ Язык новостей установлен: ${arg === 'ru' ? 'Русский' : 'English'}`);
        }
        // если аргумент не указан — показываем кнопки
        await ctx.reply('Выберите язык:', { reply_markup: langKb });
    });
    /* ───────── обработка коллбэков ───────── */
    composer.callbackQuery(['lang_ru', 'lang_en'], async (ctx) => {
        const lang = ctx.callbackQuery.data === 'lang_ru' ? 'ru' : 'en';
        await (0, user_service_1.setLang)(ctx.from.id, lang);
        await ctx.editMessageText(`✅ Язык новостей: ${lang === 'ru' ? 'Русский' : 'English'}`);
        await ctx.answerCallbackQuery();
    });
}
