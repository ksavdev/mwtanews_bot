import { Composer } from 'grammy';
import { BotCtx } from '@/core/bot';
import { tzRegionMenu } from '@/features/user/menus/tzRegionMenu';

export function registerSetTzCommand(composer: Composer<BotCtx>) {
  composer.command('set_utc', async (ctx) => {
    await ctx.reply('Выберите регион/часовой пояс:', {
      reply_markup: tzRegionMenu,
    });
  });
}