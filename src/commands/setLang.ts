import { Bot, InlineKeyboard } from "grammy";
import type { OuterCtx } from "../bot.js";
import { setLanguage } from "../services/user.service.js";

export function setLangCommand(bot: Bot<OuterCtx>) {
  const kb = new InlineKeyboard()
    .text("🇷🇺 Русский", "lang_ru")
    .text("🇬🇧 English", "lang_en");
  bot.command("set_lang", (ctx) =>
    ctx.reply("Выберите язык новостей:", { reply_markup: kb }),
  );


  bot.callbackQuery(/lang_(ru|en)/, async (ctx) => {
    const lang = ctx.match![1] as "ru" | "en";
    await setLanguage(ctx.from!.id, lang);

    const label = lang === "ru" ? "Русский" : "English";
    await ctx.answerCallbackQuery({ text: `Сохранён язык: ${label}`, show_alert: true });
    await ctx.editMessageText(`✅ Вы выбрали язык: ${label}`, {
      reply_markup: { inline_keyboard: [] },
    });
  });
}
