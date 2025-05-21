"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = void 0;
const grammy_1 = require("grammy");
const conversations_1 = require("@grammyjs/conversations");
const config_1 = require("@/core/config");
const logger_1 = require("@/core/logger");
const user_1 = require("@/features/user");
const tzRegionMenu_1 = require("@/features/user/menus/tzRegionMenu");
const utcHelp_1 = require("@/features/user/commands/utcHelp");
const help_1 = require("@/features/user/commands/help");
const dailyNews_1 = require("@/features/news/commands/dailyNews");
const weeklyNews_1 = require("@/features/news/commands/weeklyNews");
const setLang_1 = require("@/features/user/commands/setLang");
const setTzCommand_1 = require("@/features/user/commands/setTzCommand");
const setNewsType_1 = require("@/features/user/commands/setNewsType");
const commandList_1 = require("@/features/user/commands/commandList");
const dailyNewsScheduler_1 = require("@/features/news/scheduler/dailyNewsScheduler");
const user_service_1 = require("@/features/user/services/user.service");
const helpMessage_1 = require("@/shared/messages/helpMessage");
exports.bot = new grammy_1.Bot(config_1.config.TG_BOT_TOKEN);
exports.bot.use((0, conversations_1.conversations)());
exports.bot.use(tzRegionMenu_1.tzRegionMenu);
(0, weeklyNews_1.registerWeeklyNewsCommand)(exports.bot);
(0, dailyNews_1.registerDailyNewsCommand)(exports.bot);
(0, setLang_1.registerSetLangCommand)(exports.bot);
(0, utcHelp_1.utcHelpCommand)(exports.bot);
(0, setTzCommand_1.registerSetTzCommand)(exports.bot);
(0, setNewsType_1.registerSetNewsTypeCommand)(exports.bot);
(0, help_1.helpCommand)(exports.bot);
(0, commandList_1.setupBotCommands)(exports.bot);
(0, dailyNewsScheduler_1.startDailyNewsScheduler)(exports.bot);
exports.bot.command("daily_news", (ctx) => (0, dailyNews_1.sendDailyNews)(exports.bot, ctx.from.id));
exports.bot.use((0, user_1.createUserFeature)());
exports.bot.command("start", async (ctx) => {
    const uid = ctx.from.id;
    const uname = ctx.from?.username ?? "";
    const firstName = ctx.from?.first_name ?? "друг";
    const user = await (0, user_service_1.findUser)(uid);
    if (user) {
        await (0, user_service_1.updateUsername)(uid, uname);
        await ctx.reply(`Рады видеть снова, ${firstName}! 👋`);
    }
    else {
        await (0, user_service_1.createUser)(uid, uname);
        await ctx.reply(`Привет, ${firstName}!\nДобро пожаловать в MW:TA! 🎉\n\n` +
            `Бот будет регулярно присылать вам важнейшие экономические события дня и недели,\n` +
            `а также предоставлять удобные инструменты для управления подписками.\n\n` +
            `${helpMessage_1.helpMessage}`);
    }
});
exports.bot.catch((err) => logger_1.log.error({ err }, `💥 update ${err.ctx.update.update_id} failed`));
exports.bot.start();
logger_1.log.info("Bot started");
