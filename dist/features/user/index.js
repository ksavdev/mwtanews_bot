"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserFeature = createUserFeature;
const grammy_1 = require("grammy");
const conversations_1 = require("@grammyjs/conversations");
// import { registerSetLangCommand } from './commands/setLang'; 
const setTzCommand_1 = require("./commands/setTzCommand");
const setNewsType_1 = require("./commands/setNewsType");
const tzRegionMenu_1 = require("./menus/tzRegionMenu");
const utcHelpConv_1 = require("./conversations/utcHelpConv");
function createUserFeature() {
    const composer = new grammy_1.Composer();
    // registerSetLangCommand(composer); Пока нет выбора языка
    (0, setTzCommand_1.registerSetTzCommand)(composer);
    (0, setNewsType_1.registerSetNewsTypeCommand)(composer);
    composer.use(tzRegionMenu_1.tzRegionMenu);
    composer.use((0, conversations_1.createConversation)(utcHelpConv_1.utcHelpConversation));
    return composer;
}
