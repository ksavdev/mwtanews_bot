import { Composer, InlineKeyboard } from 'grammy';

import { BotCtx } from '@/core/bot';
import { setImportance } from '@/features/user/services/user.service';

/**
 * importance: 1 — 🟢 низкая, 2 — 🟡 средняя, 3 — 🔴 высокая.
 */
export function registerSetNewsTypeCommand(composer: Composer<BotCtx>) {
  /* ───── инлайн-клавиатура ───── */
  const kb = new InlineKeyboard().text('🟢 1', 'nt_1').text('🟡 2', 'nt_2').text('🔴 3', 'nt_3');

  /* ───── сама команда `/set_news_type` ───── */
  composer.command('set_news_type', async (ctx) => {
    const argRaw = ctx.message?.text.split(' ')[1];
    const argNum = Number(argRaw);

    if ([1, 2, 3].includes(argNum as 1 | 2 | 3)) {
      // сузили тип
      await setImportance(ctx.from!.id, argNum as 1 | 2 | 3);
      return ctx.reply(`✅ Будут показываться события важности ≥ ${argNum}`);
    }

    // если аргумент не указан / некорректен — показываем кнопки
    await ctx.reply('Какой минимальный уровень важности новостей показывать?', {
      reply_markup: kb,
    });
  });

  /* ───── обработка нажатий кнопок ───── */
  composer.callbackQuery(/nt_(\d)/, async (ctx) => {
    const level = Number(ctx.match![1]) as 1 | 2 | 3; // сужаем тип
    await setImportance(ctx.from!.id, level);
    await ctx.editMessageText(`✅ Сохранил: важность ≥ ${level}`);
    await ctx.answerCallbackQuery();
  });
}
