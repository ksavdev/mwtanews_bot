"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tzRegionMenu = void 0;
// src/features/user/menus/tzRegionMenu.ts
const menu_1 = require("@grammyjs/menu");
const user_service_1 = require("@/features/user/services/user.service");
async function saveTz(ctx, label) {
    await (0, user_service_1.setTimezone)(ctx.from.id, label);
    await ctx.reply(`✅ Часовой пояс сохранён: ${label}`);
    await ctx.menu.close();
}
exports.tzRegionMenu = new menu_1.Menu('tz-menu')
    .submenu('Азия', 'tz-asia')
    .row()
    .submenu('Европа', 'tz-europe')
    .row()
    .submenu('Америка', 'tz-america')
    .row()
    .text('Отмена', (ctx) => ctx.menu.close());
/* ───── Asia submenu ───── */
const asia = new menu_1.Menu('tz-asia')
    .text('UTC+5', (c) => saveTz(c, 'UTC+5'))
    .text('UTC+6', (c) => saveTz(c, 'UTC+6'))
    .row()
    .text('UTC+7', (c) => saveTz(c, 'UTC+7'))
    .text('UTC+8', (c) => saveTz(c, 'UTC+8'))
    .row()
    .text('UTC+9', (c) => saveTz(c, 'UTC+9'))
    .text('UTC+10', (c) => saveTz(c, 'UTC+10'))
    .row()
    .text('UTC+11', (c) => saveTz(c, 'UTC+11'))
    .text('UTC+12', (c) => saveTz(c, 'UTC+12'))
    .text('UTC+13', (c) => saveTz(c, 'UTC+13'))
    .row()
    .back('← Назад')
    .text('Отмена', (c) => c.menu.close());
/* ───── Europe submenu ───── */
const europe = new menu_1.Menu('tz-europe')
    .text('UTC-2', (c) => saveTz(c, 'UTC-2'))
    .text('UTC-1', (c) => saveTz(c, 'UTC-1'))
    .text('UTC', (c) => saveTz(c, 'UTC'))
    .row()
    .text('UTC+1', (c) => saveTz(c, 'UTC+1'))
    .text('UTC+2', (c) => saveTz(c, 'UTC+2'))
    .text('UTC+3', (c) => saveTz(c, 'UTC+3'))
    .text('UTC+4', (c) => saveTz(c, 'UTC+4'))
    .row()
    .back('← Назад')
    .text('Отмена', (c) => c.menu.close());
/* ───── America submenu ───── */
const america = new menu_1.Menu('tz-america')
    .text('UTC-11', (c) => saveTz(c, 'UTC-11'))
    .text('UTC-10', (c) => saveTz(c, 'UTC-10'))
    .text('UTC-9', (c) => saveTz(c, 'UTC-9'))
    .row()
    .text('UTC-8', (c) => saveTz(c, 'UTC-8'))
    .text('UTC-7', (c) => saveTz(c, 'UTC-7'))
    .text('UTC-6', (c) => saveTz(c, 'UTC-6'))
    .row()
    .text('UTC-5', (c) => saveTz(c, 'UTC-5'))
    .text('UTC-4', (c) => saveTz(c, 'UTC-4'))
    .text('UTC-3', (c) => saveTz(c, 'UTC-3'))
    .row()
    .back('← Назад')
    .text('Отмена', (c) => c.menu.close());
exports.tzRegionMenu.register(asia);
exports.tzRegionMenu.register(europe);
exports.tzRegionMenu.register(america);
