"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSetNewsTypeCommand = registerSetNewsTypeCommand;
const grammy_1 = require("grammy");
const user_service_1 = require("@/features/user/services/user.service");
function registerSetNewsTypeCommand(composer) {
    const kb = new grammy_1.InlineKeyboard()
        .text('🟢 1', 'nt_1')
        .text('🟡 2', 'nt_2')
        .text('🔴 3', 'nt_3');
    composer.command('set_news_type', async (ctx) => {
        const argRaw = ctx.message?.text.split(' ')[1];
        const argNum = Number(argRaw);
        if ([1, 2, 3].includes(argNum)) {
            await (0, user_service_1.setImportance)(ctx.from.id, argNum);
            return ctx.reply(`✅ Будут показываться события важности ≥ ${argNum}`);
        }
        await ctx.reply('Какой минимальный уровень важности новостей показывать?', {
            reply_markup: kb,
        });
    });
    composer.callbackQuery(/nt_(\d)/, async (ctx) => {
        const level = Number(ctx.match[1]);
        await (0, user_service_1.setImportance)(ctx.from.id, level);
        await ctx.editMessageText(`✅ Сохранил: важность ≥ ${level}`);
        await ctx.answerCallbackQuery();
    });
}
