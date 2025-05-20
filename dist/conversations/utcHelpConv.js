"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utcHelpConversation = utcHelpConversation;
const grammy_1 = require("grammy");
const user_service_js_1 = require("../services/user.service.js");
/** Диалог подсказки часового пояса */
async function utcHelpConversation(conv, ctx) {
    /* ① спрашиваем локальное время ---------------------------- */
    await ctx.reply("Введите своё **текущее время** (HH:MM), например `14:37`:", { parse_mode: "Markdown" });
    const { message } = await conv.waitFor("message:text").and((c) => /^\d{1,2}:\d{2}$/.test(c.msg.text), { otherwise: (c) => c.reply("⏰ Формат HH:MM, попробуйте ещё раз.") });
    /* ② считаем смещение ------------------------------------- */
    const [h, m] = message.text.split(":").map(Number);
    const nowUtc = new Date();
    const diff = ((h % 24) * 60 + m) - (nowUtc.getUTCHours() * 60 + nowUtc.getUTCMinutes());
    let hours = Math.round((((diff + 720) % 1440) - 720) / 60); // −12 … +14
    const label = hours === 0 ? "UTC" : `UTC${hours > 0 ? "+" : ""}${hours}`;
    /* ③ предлагаем сохранить --------------------------------- */
    const kb = new grammy_1.InlineKeyboard()
        .text("✅ Сохранить", "tz_save")
        .text("↩️ Другой ввод", "tz_retry");
    await ctx.reply(`Похоже, ваш часовой пояс — **${label}**. Сохранить?`, { parse_mode: "Markdown", reply_markup: kb });
    const ans = await conv.waitFor("callback_query:data")
        .and((c) => ["tz_save", "tz_retry"].includes(c.callbackQuery.data));
    if (ans.callbackQuery.data === "tz_save") {
        await (0, user_service_js_1.setTimezone)(ans.from.id, label);
        await ans.editMessageText(`✅ Часовой пояс установлен: *${label}*`, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [] },
        });
    }
    else {
        await ans.answerCallbackQuery();
        // рекурсивно запускаем диалог заново
        return utcHelpConversation(conv, ans);
    }
}
