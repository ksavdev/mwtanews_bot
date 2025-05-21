"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSetNewsTypeCommand = registerSetNewsTypeCommand;
const grammy_1 = require("grammy");
const user_service_1 = require("@/features/user/services/user.service");
/**
 * importance: 1 — 🟢 низкая, 2 — 🟡 средняя, 3 — 🔴 высокая.
 */
function registerSetNewsTypeCommand(composer) {
    /* ───── инлайн-клавиатура ───── */
    const kb = new grammy_1.InlineKeyboard().text('🟢 1', 'nt_1').text('🟡 2', 'nt_2').text('🔴 3', 'nt_3');
    /* ───── сама команда `/set_news_type` ───── */
    composer.command('set_news_type', async (ctx) => {
        const argRaw = ctx.message?.text.split(' ')[1];
        const argNum = Number(argRaw);
        if ([1, 2, 3].includes(argNum)) {
            // сузили тип
            await (0, user_service_1.setImportance)(ctx.from.id, argNum);
            return ctx.reply(`✅ Будут показываться события важности ≥ ${argNum}`);
        }
        // если аргумент не указан / некорректен — показываем кнопки
        await ctx.reply('Какой минимальный уровень важности новостей показывать?', {
            reply_markup: kb,
        });
    });
    /* ───── обработка нажатий кнопок ───── */
    composer.callbackQuery(/nt_(\d)/, async (ctx) => {
        const level = Number(ctx.match[1]); // сужаем тип
        await (0, user_service_1.setImportance)(ctx.from.id, level);
        await ctx.editMessageText(`✅ Сохранил: важность ≥ ${level}`);
        await ctx.answerCallbackQuery();
    });
}
