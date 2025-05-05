import { Pool } from "pg";
import "dotenv/config";
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});
/** найти пользователя, вернуть null если нет */
export async function findUser(tgId) {
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
export async function createUser(tgId, username = "") {
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
/** изменить часовой пояс (строка вида "UTC+3") */
export async function setTimezone(tgId, tzLabel) {
    try {
        const res = await pool.query("UPDATE user_settings SET tz_label = $2 WHERE tg_id = $1", [tgId, tzLabel]);
        console.log("[setTimezone]", tgId, "set", tzLabel, "rows:", res.rowCount);
    }
    catch (err) {
        console.error("[setTimezone] DB error:", err);
        throw err;
    }
}
/** обновить username, если он изменился */
export async function updateUsername(tgId, username = "") {
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
