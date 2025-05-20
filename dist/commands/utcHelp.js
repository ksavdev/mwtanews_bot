"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utcHelpCommand = void 0;
const utcHelpCommand = (bot) => {
    bot.command("utc_help", async (ctx) => {
        await ctx.conversation.enter("utcHelpConversation");
    });
};
exports.utcHelpCommand = utcHelpCommand;
