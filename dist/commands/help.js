"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.helpCommand = void 0;
const helpMessage_js_1 = require("../messages/helpMessage.js");
const helpCommand = (bot) => {
    bot.command("help", async (ctx) => {
        ctx.reply(`Помощь
${helpMessage_js_1.helpMessage}`);
    });
};
exports.helpCommand = helpCommand;
