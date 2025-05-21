import { Menu } from '@grammyjs/menu';
import { BotCtx } from '@/core/bot';
import { setTimezone } from '@/features/user/services/user.service';

async function saveTz(ctx: BotCtx, label: string) {
    await setTimezone(ctx.from!.id, label);
    await ctx.reply(`✅ Часовой пояс сохранён: ${label}`);
    await ctx.menu.close();
}

export const tzRegionMenu = new Menu<BotCtx>('tz-menu')
    .submenu('Азия', 'tz-asia')
    .row()
    .submenu('Европа', 'tz-europe')
    .row()
    .submenu('Америка', 'tz-america')
    .row()
    .text('Отмена', (ctx) => ctx.menu.close());

const asiaMenu = new Menu<BotCtx>('tz-asia')
    .text('UTC+5', (ctx) => saveTz(ctx, 'UTC+5'))
    .text('UTC+6', (ctx) => saveTz(ctx, 'UTC+6'))
    .row()
    .text('UTC+7', (ctx) => saveTz(ctx, 'UTC+7'))
    .text('UTC+8', (ctx) => saveTz(ctx, 'UTC+8'))
    .row()
    .text('UTC+9', (ctx) => saveTz(ctx, 'UTC+9'))
    .text('UTC+10', (ctx) => saveTz(ctx, 'UTC+10'))
    .row()
    .text('UTC+11', (ctx) => saveTz(ctx, 'UTC+11'))
    .text('UTC+12', (ctx) => saveTz(ctx, 'UTC+12'))
    .text('UTC+13', (ctx) => saveTz(ctx, 'UTC+13'))
    .row()
    .back('← Назад')
    .text('Отмена', (ctx) => ctx.menu.close());

const europeMenu = new Menu<BotCtx>('tz-europe')
    .text('UTC-2', (ctx) => saveTz(ctx, 'UTC-2'))
    .text('UTC-1', (ctx) => saveTz(ctx, 'UTC-1'))
    .text('UTC±0', (ctx) => saveTz(ctx, 'UTC'))
    .row()
    .text('UTC+1', (ctx) => saveTz(ctx, 'UTC+1'))
    .text('UTC+2', (ctx) => saveTz(ctx, 'UTC+2'))
    .text('UTC+3', (ctx) => saveTz(ctx, 'UTC+3'))
    .text('UTC+4', (ctx) => saveTz(ctx, 'UTC+4'))
    .row()
    .back('← Назад')
    .text('Отмена', (ctx) => ctx.menu.close());

const americaMenu = new Menu<BotCtx>('tz-america')
    .text('UTC-11', (ctx) => saveTz(ctx, 'UTC-11'))
    .text('UTC-10', (ctx) => saveTz(ctx, 'UTC-10'))
    .text('UTC-9', (ctx) => saveTz(ctx, 'UTC-9'))
    .row()
    .text('UTC-8', (ctx) => saveTz(ctx, 'UTC-8'))
    .text('UTC-7', (ctx) => saveTz(ctx, 'UTC-7'))
    .text('UTC-6', (ctx) => saveTz(ctx, 'UTC-6'))
    .row()
    .text('UTC-5', (ctx) => saveTz(ctx, 'UTC-5'))
    .text('UTC-4', (ctx) => saveTz(ctx, 'UTC-4'))
    .text('UTC-3', (ctx) => saveTz(ctx, 'UTC-3'))
    .row()
    .back('← Назад')
    .text('Отмена', (ctx) => ctx.menu.close());

tzRegionMenu.register(asiaMenu);
tzRegionMenu.register(europeMenu);
tzRegionMenu.register(americaMenu);