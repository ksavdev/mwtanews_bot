import { Bot } from 'grammy'
import { OuterCtx } from '../bot';


export const setupBotCommands = (bot: Bot<OuterCtx>) => {
    bot.api.setMyCommands([
        { command: 'start', description: "Команда для запуска бота" },
        { command: 'weekly_news', description: "Отображение списка всех новостей, которые должны выйти на этой неделе." },
        { command: 'daily_news', description: "Отображение списка всех новостей, который выйдут сегодня (согласно вашему часовому поясу по умолчанию UTC-0)." },
        { command: "set_lang", description: "Выбрать язык новостей (Русский | English)" },
        { command: 'set_utc', description: "Команда для установки вашего часового пояса." },
        { command: 'utc_help', description: "Команда для помощи в определении вашего часового пояса." },
        { command: 'set_news_type', description: "Команда для выбора типа новостей, который вы хотите получать." },
        { command: 'help', description: "Список всех команд, которые доступны в боте с примерами использования." },
    ]);
};