import { BotCtx } from '@/core/bot';
import { helpMessage } from '@/shared/messages/helpMessage';
import { Bot } from 'grammy';

export const helpCommand = (bot: Bot<BotCtx>) => {
  bot.command('help', async (ctx) => {
    ctx.reply(`Помощь
${helpMessage}`);
  });
};
