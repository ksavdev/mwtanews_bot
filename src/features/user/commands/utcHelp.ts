import { BotCtx } from '@/core/bot';
import { Bot } from 'grammy';

export const utcHelpCommand = (bot: Bot<BotCtx>) => {
  bot.command('utc_help', async (ctx) => {
    await ctx.conversation.enter('utcHelpConversation');
  });
};
