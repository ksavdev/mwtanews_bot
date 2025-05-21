import { Menu } from '@grammyjs/menu';

export const newsTypeMenu = new Menu('news-type')
  .text('🗓 Дневные', (ctx) => ctx.api.sendMessage(ctx.chat!.id, '/daily_news'))
  .row()
  .text('📅 Недельные', (ctx) => ctx.api.sendMessage(ctx.chat!.id, '/weekly_news'))
  .row();
