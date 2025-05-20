"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const grammy_1 = require("grammy");
const conversations_1 = require("@grammyjs/conversations");
const helpMessage_js_1 = require("./messages/helpMessage.js");
// Команды 
const commandList_js_1 = require("./commands/commandList.js");
const help_js_1 = require("./commands/help.js");
const user_service_js_1 = require("./services/user.service.js");
const setNewsType_js_1 = require("./commands/setNewsType.js");
const timezoneMenu_js_1 = require("./menus/timezoneMenu.js");
const setTzCommand_js_1 = require("./commands/setTzCommand.js");
const utcHelp_js_1 = require("./commands/utcHelp.js");
const utcHelpConv_js_1 = require("./conversations/utcHelpConv.js");
const setLang_js_1 = require("./commands/setLang.js");
const dailyNews_js_1 = require("./commands/dailyNews.js");
const weeklyNews_js_1 = require("./commands/weeklyNews.js");
const dailyNewsScheduler_js_1 = require("./scheduler/dailyNewsScheduler.js");
const bot = new grammy_1.Bot(process.env.TG_BOT_TOKEN);
// bot.use(async (ctx, next) => {
//     ctx.config = {
//         botDeveloper: 123456789,
//         isDeveloper: ctx.from?.id === 123456789,
//     };
//     await next();
// });
bot.use((0, conversations_1.conversations)());
// Подключаем все разговоры
bot.use((0, conversations_1.createConversation)(utcHelpConv_js_1.utcHelpConversation));
bot.use(timezoneMenu_js_1.tzRegionMenu);
// Регистрируем команды (или команды-обработчики)
(0, weeklyNews_js_1.weeklyNewsCommand)(bot);
(0, dailyNews_js_1.dailyNewsCommand)(bot);
(0, setLang_js_1.setLangCommand)(bot);
(0, utcHelp_js_1.utcHelpCommand)(bot);
(0, setTzCommand_js_1.setTzCommand)(bot);
(0, setNewsType_js_1.setNewsTypeCommand)(bot);
(0, help_js_1.helpCommand)(bot);
(0, commandList_js_1.setupBotCommands)(bot);
(0, dailyNewsScheduler_js_1.startDailyNewsScheduler)(bot);
bot.command("daily_news", (ctx) => (0, dailyNews_js_1.sendDailyNews)(bot, ctx.from.id));
bot.command("start", async (ctx) => {
    const uid = ctx.from.id;
    const uname = ctx.from.username ?? "";
    const user = await (0, user_service_js_1.findUser)(uid);
    if (user) {
        await (0, user_service_js_1.updateUsername)(uid, uname);
        await ctx.reply(`Рады видеть снова, ${ctx.from.first_name}! 👋`);
    }
    else {
        await (0, user_service_js_1.createUser)(uid, uname);
        ctx.reply(`Привет ${ctx.from?.first_name}!
Добро пожаловать в Trade Soul News!

Бот будет регулярно оповещать Вас о самых важных экономических новостях, недели и дня.

Вы можете сами запросить события, или же бот будет уведомлять вас ежедневно в 09:00 по вашему времени, если укажете свой часовой пояс, по-умолчанию используется UTC-0.
${helpMessage_js_1.helpMessage}
`);
    }
});
bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`💥 Error while handling update ${ctx.update.update_id}:`, err.error);
});
bot.start();
console.log("Бот запущен");
