"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUser = findUser;
exports.createUser = createUser;
exports.setTimezone = setTimezone;
exports.setImportance = setImportance;
exports.updateUsername = updateUsername;
exports.setLanguage = setLanguage;
const pg_1 = require("pg");
require("dotenv/config");
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
/** найти пользователя, вернуть null если нет */
async function findUser(tgId) {
    try {
        const res = await pool.query("SELECT * FROM user_settings WHERE tg_id = $1 LIMIT 1", [tgId]);
        console.log("[findUser]", tgId, "→", res.rows[0] ?? null);
        return res.rows[0] ?? null;
    }
    catch (err) {
        console.error("[findUser] DB error:", err);
        throw err; // пробрасываем дальше
    }
}
/** создать пользователя с настройками по умолчанию */
async function createUser(tgId, username) {
    try {
        const res = await pool.query(`INSERT INTO user_settings (tg_id, tg_username)
             VALUES ($1, $2)
       ON CONFLICT DO NOTHING`, [tgId, username]);
        console.log("[createUser]", tgId, "inserted rows:", res.rowCount); // 1 или 0
    }
    catch (err) {
        console.error("[createUser] DB error:", err);
        throw err;
    }
}
/** изменить часовой пояс (строка вида "UTC+3" или "Europe/Minsk") */
async function setTimezone(tgId, tzId) {
    try {
        const res = await pool.query("UPDATE user_settings SET tz_id = $2 WHERE tg_id = $1", [tgId, tzId]);
        console.log("[setTimezone]", tgId, "set", tzId, "rows:", res.rowCount);
    }
    catch (err) {
        console.error("[setTimezone] DB error:", err);
        throw err;
    }
}
/** изменить важность новостей *по дефолту стоит 2 */
async function setImportance(tgId, importance) {
    if (![1, 2, 3].includes(importance)) {
        throw new Error("importance must be 1, 2, or 3");
    }
    try {
        const res = await pool.query("UPDATE user_settings SET importance = $2 WHERE tg_id = $1", [tgId, importance]);
        console.log("[setImportance]", tgId, "set", importance, "rows:", res.rowCount);
    }
    catch (err) {
        console.error("[setImportance] DB error:", err);
        throw err;
    }
}
/** обновить username, если он изменился */
async function updateUsername(tgId, username = "") {
    try {
        const res = await pool.query(`UPDATE user_settings
         SET tg_username = $2
       WHERE tg_id = $1
         AND tg_username IS DISTINCT FROM $2`, [tgId, username]);
        console.log("[updateUsername]", tgId, "rows:", res.rowCount); // 1 = обновил, 0 = без изменений
    }
    catch (err) {
        console.error("[updateUsername] DB error:", err);
        throw err;
    }
}
async function setLanguage(tgId, lang) {
    await pool.query("UPDATE user_settings SET lang = $2 WHERE tg_id = $1", [tgId, lang]);
}
