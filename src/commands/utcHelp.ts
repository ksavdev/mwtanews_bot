import { Bot } from "grammy";
import type { OuterCtx, InnerCtx } from "../bot.js";


export const utcHelpCommand = (bot: Bot<OuterCtx>) => {
    bot.command("utc_help", async (ctx) => {
        await ctx.conversation.enter("utcHelpConversation");
    });
}