import "dotenv/config";
import { Bot, Context } from "grammy";
import {
    conversations, createConversation,
    ConversationFlavor,
} from "@grammyjs/conversations";

import { helpMessage } from "./messages/helpMessage.js";

// Команды 
import { setupBotCommands } from "./commands/commandList.js";
import { helpCommand } from "./commands/help.js";
import { createUser, findUser, updateUsername } from "./services/user.service.js";
import { setNewsTypeCommand } from "./commands/setNewsType.js";
import { MenuFlavor } from "@grammyjs/menu";
import { tzRegionMenu } from "./menus/timezoneMenu.js";
import { setTzCommand } from "./commands/setTzCommand.js";
import { utcHelpCommand } from "./commands/utcHelp.js";
import { utcHelpConversation } from "./conversations/utcHelpConv.js";
import { setLangCommand } from "./commands/setLang.js";
import { dailyNewsCommand, sendDailyNews } from "./commands/dailyNews.js";
import { weeklyNewsCommand } from "./commands/weeklyNews.js";
import { startDailyNewsScheduler } from "./scheduler/dailyNewsScheduler.js";

interface BotConfig {
    botDeveloper: number;
    isDeveloper: boolean;
}

export type OuterCtx =
    & Context
    & ConversationFlavor<Context>
    & MenuFlavor
    & { config: BotConfig };

export type InnerCtx =
    & Context
    & { config: BotConfig };

const bot = new Bot<OuterCtx>(process.env.TG_BOT_TOKEN!);

// bot.use(async (ctx, next) => {
//     ctx.config = {
//         botDeveloper: 123456789,
//         isDeveloper: ctx.from?.id === 123456789,
//     };
//     await next();
// });

bot.use(conversations<OuterCtx, InnerCtx>());

// Подключаем все разговоры
bot.use(createConversation(utcHelpConversation));

bot.use(tzRegionMenu)

// Регистрируем команды (или команды-обработчики)
weeklyNewsCommand(bot);
dailyNewsCommand(bot);
setLangCommand(bot);
utcHelpCommand(bot);
setTzCommand(bot);
setNewsTypeCommand(bot);
helpCommand(bot);

setupBotCommands(bot);
startDailyNewsScheduler(bot);

bot.command("daily_news", (ctx) => sendDailyNews(bot, ctx.from!.id));

bot.command("start", async (ctx) => {
    const uid = ctx.from!.id;
    const uname = ctx.from!.username ?? "";

    const user = await findUser(uid);

    if (user) {
        await updateUsername(uid, uname);
        await ctx.reply(
            `Рады видеть снова, ${ctx.from!.first_name}! 👋`
        );
    }
    else {
        await createUser(uid, uname);
        ctx.reply(`Привет ${ctx.from?.first_name}!
Добро пожаловать в Trade Soul News!

Бот будет регулярно оповещать Вас о самых важных экономических новостях, недели и дня.

Вы можете сами запросить события, или же бот будет уведомлять вас ежедневно в 09:00 по вашему времени, если укажете свой часовой пояс, по-умолчанию используется UTC-0.
${helpMessage}
`);
    }
});

bot.catch((err) => {
  const ctx = err.ctx;
  console.error(
    `💥 Error while handling update ${ctx.update.update_id}:`,
    err.error,
  );
});
bot.start();
console.log("Бот запущен");