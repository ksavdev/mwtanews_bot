import { helpMessage } from "../messages/helpMessage.js";
export const helpCommand = (bot) => {
    bot.command("help", async (ctx) => {
        ctx.reply(`Помощь
${helpMessage}`);
    });
};
