// src/features/user/commands/setLang.ts
import { Composer, InlineKeyboard } from 'grammy';
import { BotCtx } from '@/core/bot';
import { setLang } from '@/features/user/services/user.service';

/** Регистрирует команду `/set_lang ru|en` */
export function registerSetLangCommand(composer: Composer<BotCtx>) {
  /* ───────── клавиатура выбора ───────── */
  const langKb = new InlineKeyboard().text('Русский', 'lang_ru').text('English', 'lang_en');

  /* ───────── сама команда ───────── */
  composer.command('set_lang', async (ctx) => {
    const arg = ctx.message?.text.split(' ')[1]?.toLowerCase();

    if (arg === 'ru' || arg === 'en') {
      await setLang(ctx.from!.id, arg);
      return ctx.reply(`✅ Язык новостей установлен: ${arg === 'ru' ? 'Русский' : 'English'}`);
    }

    // если аргумент не указан — показываем кнопки
    await ctx.reply('Выберите язык:', { reply_markup: langKb });
  });

  /* ───────── обработка коллбэков ───────── */
  composer.callbackQuery(['lang_ru', 'lang_en'], async (ctx) => {
    const lang = ctx.callbackQuery.data === 'lang_ru' ? 'ru' : 'en';
    await setLang(ctx.from!.id, lang);
    await ctx.editMessageText(`✅ Язык новостей: ${lang === 'ru' ? 'Русский' : 'English'}`);
    await ctx.answerCallbackQuery();
  });
}
