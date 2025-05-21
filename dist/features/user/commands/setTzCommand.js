"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSetTzCommand = registerSetTzCommand;
const tzRegionMenu_1 = require("@/features/user/menus/tzRegionMenu");
function registerSetTzCommand(composer) {
    composer.command('set_utc', async (ctx) => {
        await ctx.reply('Выберите регион/часовой пояс:', {
            reply_markup: tzRegionMenu_1.tzRegionMenu,
        });
    });
}
