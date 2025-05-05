import { tzRegionMenu } from "../menus/timezoneMenu.js";
export const setTzCommand = (bot) => {
    /* подключаем меню и саб‑меню к боту */
    bot.use(tzRegionMenu);
    /* команда /set_utc показывает меню выбора региона */
    bot.command("set_utc", (ctx) => ctx.reply("Выберите свой регион:", { reply_markup: tzRegionMenu }));
};
