"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTzCommand = void 0;
const timezoneMenu_js_1 = require("../menus/timezoneMenu.js");
const setTzCommand = (bot) => {
    /* подключаем меню и саб‑меню к боту */
    bot.use(timezoneMenu_js_1.tzRegionMenu);
    /* команда /set_utc показывает меню выбора региона */
    bot.command("set_utc", (ctx) => ctx.reply("Выберите свой регион:", { reply_markup: timezoneMenu_js_1.tzRegionMenu }));
};
exports.setTzCommand = setTzCommand;
