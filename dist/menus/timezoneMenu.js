/* ─────────── src/menus/timezoneMenu.ts ─────────── */
import { Menu } from "@grammyjs/menu";
import { setTimezone } from "../services/user.service.js";
/* ───────── главное меню выбора региона ───────── */
export const tzRegionMenu = new Menu("tz-menu")
    .submenu("Азия", "tz-asia").row()
    .submenu("Европа", "tz-europe").row()
    .submenu("Америка", "tz-america").row()
    .text("Отмена", (ctx) => ctx.menu.close());
/* ─── submenu: Азия ─── */
const asiaMenu = new Menu("tz-asia")
    .text("UTC+5", async (ctx) => saveTz(ctx, "UTC+5"))
    .text("UTC+6", async (ctx) => saveTz(ctx, "UTC+6")).row()
    .text("UTC+7", async (ctx) => saveTz(ctx, "UTC+7"))
    .text("UTC+8", async (ctx) => saveTz(ctx, "UTC+8")).row()
    .text("UTC+9", async (ctx) => saveTz(ctx, "UTC+9"))
    .text("UTC+10", async (ctx) => saveTz(ctx, "UTC+10")).row()
    .text("UTC+11", async (ctx) => saveTz(ctx, "UTC+11"))
    .text("UTC+12", async (ctx) => saveTz(ctx, "UTC+12"))
    .text("UTC+13", async (ctx) => saveTz(ctx, "UTC+13")).row()
    .back("← Назад")
    .text("Отмена", (ctx) => ctx.menu.close());
/* ─── submenu: Европа ─── */
const europeMenu = new Menu("tz-europe")
    .text("UTC-2", async (ctx) => saveTz(ctx, "UTC-2"))
    .text("UTC-1", async (ctx) => saveTz(ctx, "UTC-1"))
    .text("UTC±0", async (ctx) => saveTz(ctx, "UTC")).row()
    .text("UTC+1", async (ctx) => saveTz(ctx, "UTC+1"))
    .text("UTC+2", async (ctx) => saveTz(ctx, "UTC+2"))
    .text("UTC+3", async (ctx) => saveTz(ctx, "UTC+3"))
    .text("UTC+4", async (ctx) => saveTz(ctx, "UTC+4")).row()
    .back("← Назад")
    .text("Отмена", (ctx) => ctx.menu.close());
/* ─── submenu: Америка ─── */
const americaMenu = new Menu("tz-america")
    .text("UTC-11", async (ctx) => saveTz(ctx, "UTC-11"))
    .text("UTC-10", async (ctx) => saveTz(ctx, "UTC-10"))
    .text("UTC-9", async (ctx) => saveTz(ctx, "UTC-9")).row()
    .text("UTC-8", async (ctx) => saveTz(ctx, "UTC-8"))
    .text("UTC-7", async (ctx) => saveTz(ctx, "UTC-7"))
    .text("UTC-6", async (ctx) => saveTz(ctx, "UTC-6")).row()
    .text("UTC-5", async (ctx) => saveTz(ctx, "UTC-5"))
    .text("UTC-4", async (ctx) => saveTz(ctx, "UTC-4"))
    .text("UTC-3", async (ctx) => saveTz(ctx, "UTC-3")).row()
    .back("← Назад")
    .text("Отмена", (ctx) => ctx.menu.close());
/* ───────── helper: сохранить и закрыть ───────── */
async function saveTz(ctx, label) {
    await setTimezone(ctx.from.id, label);
    await ctx.reply(`✅ Часовой пояс сохранён: ${label}`);
    await ctx.menu.close(); // закрываем submenu и главное меню
}
/* регистрируем дочерние меню */
tzRegionMenu.register(asiaMenu);
tzRegionMenu.register(europeMenu);
tzRegionMenu.register(americaMenu);
