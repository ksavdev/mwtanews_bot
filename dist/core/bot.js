"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bot = void 0;
const grammy_1 = require("grammy");
const conversations_1 = require("@grammyjs/conversations");
const config_1 = require("@/core/config");
const logger_1 = require("@/core/logger");
const news_1 = require("@/features/news"); // factory → Composer
const user_1 = require("@/features/user"); // factory → Composer
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
const utcHelpConv_1 = require("@/features/user/conversations/utcHelpConv");
/* ───────────── инициализация бота ───────────── */
exports.bot = new grammy_1.Bot(config_1.config.TG_BOT_TOKEN);
/* плагины */
exports.bot.use((0, conversations_1.conversations)()); // outer, inner
exports.bot.use((0, conversations_1.createConversation)(utcHelpConv_1.utcHelpConversation));
exports.bot.use(tzRegionMenu_1.tzRegionMenu);
// Регистрируем команды (или команды-обработчики)
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
/* feature-модули */
exports.bot.use((0, news_1.createNewsFeature)(exports.bot)); // передаём сам Bot, фича сама подключит cron
exports.bot.use((0, user_1.createUserFeature)()); // user-фича без зависимостей
/* базовые команды */
exports.bot.command('start', (ctx) => ctx.reply(`Привет, ${ctx.from?.first_name}! Напишите /help, чтобы узнать команды.`));
/* глобальный error-handler */
exports.bot.catch((err) => logger_1.log.error({ err }, `💥 update ${err.ctx.update.update_id} failed`));
/* запуск */
exports.bot.start();
logger_1.log.info('Bot started ✅');
