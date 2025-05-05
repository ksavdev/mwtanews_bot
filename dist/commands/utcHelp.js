export const utcHelpCommand = (bot) => {
    bot.command("utc_help", async (ctx) => {
        await ctx.conversation.enter("utcHelpConversation");
    });
};
