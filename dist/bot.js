import "dotenv/config";
import { Bot } from "grammy";
import { conversations, } from "@grammyjs/conversations";
import { helpMessage } from "./messages/helpMessage.js";
// Команды 
import { setupBotCommands } from "./commands/commandList.js";
import { helpCommand } from "./commands/helpCommand.js";
const bot = new Bot(process.env.TG_BOT_TOKEN);
// bot.use(async (ctx, next) => {
//     ctx.config = {
//         botDeveloper: 123456789,
//         isDeveloper: ctx.from?.id === 123456789,
//     };
//     await next();
// });
bot.use(conversations());
// bot.use(createConversation<OuterCtx, InnerCtx>(calc));
// bot.use(clothesMenu);
// bot.use(startMenu);
// Регистрируем команды (или команды-обработчики)
helpCommand(bot);
setupBotCommands(bot);
bot.command("start", (ctx) => ctx.reply(`Привет ${ctx.from?.first_name}!
Добро пожаловать в Trade Soul News!

Бот будет регулярно оповещать Вас о самых важных экономических новостях, недели и дня.

Вы можете сами запросить события, или же бот будет уведомлять вас ежедневно в 09:00 по вашему времени, если укажете свой часовой пояс, по-умолчанию используется UTC-0.
${helpMessage}
`));
bot.start();
console.log("Бот запущен");
