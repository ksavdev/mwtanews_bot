import { Bot, Context } from 'grammy';
import { conversations, ConversationFlavor, createConversation } from '@grammyjs/conversations';
import { MenuFlavor } from '@grammyjs/menu';

import { config } from '@/core/config';
import { log } from '@/core/logger';

import { createNewsFeature } from '@/features/news'; // factory → Composer
import { createUserFeature } from '@/features/user'; // factory → Composer
import { tzRegionMenu } from '@/features/user/menus/tzRegionMenu';
import { utcHelpCommand } from '@/features/user/commands/utcHelp';
import { helpCommand } from '@/features/user/commands/help';
import { registerDailyNewsCommand, sendDailyNews } from '@/features/news/commands/dailyNews';
import { registerWeeklyNewsCommand } from '@/features/news/commands/weeklyNews';
import { registerSetLangCommand } from '@/features/user/commands/setLang';
import { registerSetTzCommand } from '@/features/user/commands/setTzCommand';
import { registerSetNewsTypeCommand } from '@/features/user/commands/setNewsType';
import { setupBotCommands } from '@/features/user/commands/commandList';
import { startDailyNewsScheduler } from '@/features/news/scheduler/dailyNewsScheduler';
import { utcHelpConversation } from '@/features/user/conversations/utcHelpConv';

/* ───────────── тип контекста ───────────── */
interface BotCfg {
  botDeveloper: number;
  isDeveloper: boolean;
}

export type BotCtx = Context &
  ConversationFlavor<Context> & // один дженерик-параметр
  MenuFlavor & { config: BotCfg };

/* ───────────── инициализация бота ───────────── */
export const bot = new Bot<BotCtx>(config.TG_BOT_TOKEN);

/* плагины */
bot.use(conversations<BotCtx, Context>()); // outer, inner
bot.use(createConversation(utcHelpConversation));
bot.use(tzRegionMenu)

// Регистрируем команды (или команды-обработчики)
registerWeeklyNewsCommand(bot);
registerDailyNewsCommand(bot);
registerSetLangCommand(bot);
utcHelpCommand(bot);
registerSetTzCommand(bot);
registerSetNewsTypeCommand(bot);
helpCommand(bot);

setupBotCommands(bot);
startDailyNewsScheduler(bot);

bot.command("daily_news", (ctx) => sendDailyNews(bot, ctx.from!.id));

/* feature-модули */
bot.use(createNewsFeature(bot)); // передаём сам Bot, фича сама подключит cron
bot.use(createUserFeature()); // user-фича без зависимостей

/* базовые команды */
bot.command('start', (ctx) =>
  ctx.reply(`Привет, ${ctx.from?.first_name}! Напишите /help, чтобы узнать команды.`),
);


/* глобальный error-handler */
bot.catch((err) => log.error({ err }, `💥 update ${err.ctx.update.update_id} failed`));

/* запуск */
bot.start();
log.info('Bot started ✅');
