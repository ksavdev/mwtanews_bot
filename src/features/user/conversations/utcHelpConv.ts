import { InlineKeyboard } from 'grammy';
import { Conversation }   from '@grammyjs/conversations';

import { BotCtx }       from '@/core/bot';
import { setTimezone }  from '@/features/user/services/user.service';

/* -----------------------------------------------------------
 * Тип для удобства
 * --------------------------------------------------------- */
type Conv = Conversation<BotCtx, BotCtx>;   // ← два параметра: Outer и Inner

/* -----------------------------------------------------------
 * Диалог «подсказка часового пояса»
 * --------------------------------------------------------- */
export async function utcHelpConversation(conv: Conv, ctx: BotCtx) {
  /* ① спрашиваем локальное время ---------------------------- */
  await ctx.reply(
    'Введите своё **текущее время** (HH:MM), например `14:37`:',
    { parse_mode: 'Markdown' },
  );

  const { message } = await conv
    .waitFor('message:text')
    .and((c) => /^\d{1,2}:\d{2}$/.test(c.msg.text), {
      otherwise: (c) => c.reply('⏰ Формат HH:MM, попробуйте ещё раз.'),
    });

  /* ② считаем смещение ------------------------------------- */
  const [hStr, mStr] = message.text!.split(':');   // text гарантированно есть
  const h = Number(hStr);
  const m = Number(mStr);

  const nowUtc = new Date();
  const diff   = h * 60 + m - (nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes());
  const hours  = Math.round((((diff + 720) % 1440) - 720) / 60); // −12 … +14
  const label  = hours === 0 ? 'UTC' : `UTC${hours > 0 ? '+' : ''}${hours}`;

  /* ③ предлагаем сохранить --------------------------------- */
  const kb = new InlineKeyboard()
    .text('✅ Сохранить', 'tz_save')
    .text('↩️ Другой ввод', 'tz_retry');

  await ctx.reply(`Похоже, ваш часовой пояс — **${label}**. Сохранить?`, {
    parse_mode: 'Markdown',
    reply_markup: kb,
  });

  const ans = await conv
    .waitFor('callback_query:data')
    .and((c) => ['tz_save', 'tz_retry'].includes(c.callbackQuery.data));

  if (ans.callbackQuery.data === 'tz_save') {
    await setTimezone(ans.from!.id, label);
    await ans.editMessageText(`✅ Часовой пояс установлен: *${label}*`, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: [] },
    });
  } else {
    await ans.answerCallbackQuery();
    // запускаем диалог заново
    return utcHelpConversation(conv, ans as BotCtx);
  }
}
