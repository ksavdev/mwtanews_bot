import { Bot } from "grammy";
import { OuterCtx } from "../bot";
import { helpMessage } from "../messages/helpMessage.js";

export const helpCommand = (bot: Bot<OuterCtx>) => {
    bot.command("help", async (ctx) => {
        ctx.reply(`Помощь
${helpMessage}`,
        );
    });
}