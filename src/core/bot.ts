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
import { createUser, findUser, updateUsername } from '@/features/user/services/user.service';
import { helpMessage } from '@/shared/messages/helpMessage';

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
bot.use(createUserFeature()); // user-фича без зависимостей

/* базовые команды */
bot.command('start', async (ctx) => {
  const uid = ctx.from!.id;
  const uname = ctx.from?.username ?? '';
  const firstName = ctx.from?.first_name ?? 'друг';

  const user = await findUser(uid);

  if (user) {
    await updateUsername(uid, uname);
    await ctx.reply(`Рады видеть снова, ${firstName}! 👋`);
  } else {
    await createUser(uid, uname);
    await ctx.reply(
      `Привет, ${firstName}!\nДобро пожаловать в MW:TA! 🎉\n\n` +
      `Бот будет регулярно присылать вам важнейшие экономические события дня и недели.\n\n` +
      `Вы можете вручную вызвать события или указать свой часовой пояс — ` +
      `тогда новости будут приходить каждый день в 09:00 по вашему времени. ` +
      `По умолчанию используется UTC.\n\n${helpMessage}`
    );
  }
});


/* глобальный error-handler */
bot.catch((err) => log.error({ err }, `💥 update ${err.ctx.update.update_id} failed`));

/* запуск */
bot.start();
log.info('Bot started ✅');
