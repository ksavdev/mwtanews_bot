import { Bot, Composer } from 'grammy';
import { BotCtx } from '@/core/bot';

import { registerDailyNewsCommand } from './commands/dailyNews';
import { registerWeeklyNewsCommand } from './commands/weeklyNews';
import { startDailyNewsScheduler } from './scheduler/dailyNewsScheduler';
import { newsTypeMenu } from './menus/newsTypeMenu';

export function createNewsFeature(bot: Bot<BotCtx>): Composer<BotCtx> {
  const composer = new Composer<BotCtx>();

  registerDailyNewsCommand(composer);
  registerWeeklyNewsCommand(composer);
  composer.use(newsTypeMenu);

  startDailyNewsScheduler(bot); 

  return composer;
}
