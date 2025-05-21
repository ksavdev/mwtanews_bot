"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNewsFeature = createNewsFeature;
const grammy_1 = require("grammy");
const dailyNews_1 = require("./commands/dailyNews");
const weeklyNews_1 = require("./commands/weeklyNews");
const dailyNewsScheduler_1 = require("./scheduler/dailyNewsScheduler");
const newsTypeMenu_1 = require("./menus/newsTypeMenu");
function createNewsFeature(bot) {
    const composer = new grammy_1.Composer();
    (0, dailyNews_1.registerDailyNewsCommand)(composer);
    (0, weeklyNews_1.registerWeeklyNewsCommand)(composer);
    composer.use(newsTypeMenu_1.newsTypeMenu);
    (0, dailyNewsScheduler_1.startDailyNewsScheduler)(bot);
    return composer;
}
