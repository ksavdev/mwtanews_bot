"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helpCommand = void 0;
const helpMessage_1 = require("@/shared/messages/helpMessage");
const helpCommand = (bot) => {
    bot.command('help', async (ctx) => {
        ctx.reply(`Помощь
${helpMessage_1.helpMessage}`);
    });
};
exports.helpCommand = helpCommand;
