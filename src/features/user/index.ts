import { Composer } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import { BotCtx } from '@/core/bot';
// import { registerSetLangCommand } from './commands/setLang'; 
import { registerSetTzCommand } from './commands/setTzCommand';
import { registerSetNewsTypeCommand } from './commands/setNewsType';
import { tzRegionMenu } from './menus/tzRegionMenu';
import { utcHelpConversation } from './conversations/utcHelpConv';

export function createUserFeature(): Composer<BotCtx> {
    const composer = new Composer<BotCtx>();

    // registerSetLangCommand(composer); Пока нет выбора языка
    registerSetTzCommand(composer);
    registerSetNewsTypeCommand(composer);

    composer.use(tzRegionMenu);
    composer.use(createConversation(utcHelpConversation));

    return composer;
}