import { Pool, QueryResult } from "pg";
import "dotenv/config";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export interface UserRow {
    tg_id: number;
    tg_username: string;
    tz_label: string;   // "UTC+0" по умолчанию
    lang: string;
    importance: number;
}

/** найти пользователя, вернуть null если нет */
export async function findUser(tgId: number): Promise<UserRow | null> {
    try {
        const res: QueryResult<UserRow> = await pool.query(
            "SELECT * FROM user_settings WHERE tg_id = $1 LIMIT 1",
            [tgId],
        );
        console.log("[findUser]", tgId, "→", res.rows[0] ?? null);
        return res.rows[0] ?? null;
    } catch (err) {
        console.error("[findUser] DB error:", err);
        throw err;                               // пробрасываем дальше
    }
}

/** создать пользователя с настройками по умолчанию */
export async function createUser(tgId: number, username: string): Promise<void> {
    try {
        const res = await pool.query(
            `INSERT INTO user_settings (tg_id, tg_username)
             VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
            [tgId, username],
        );
        console.log("[createUser]", tgId, "inserted rows:", res.rowCount); // 1 или 0
    } catch (err) {
        console.error("[createUser] DB error:", err);
        throw err;
    }
}

/** изменить часовой пояс (строка вида "UTC+3" или "Europe/Minsk") */
export async function setTimezone(tgId: number, tzId: string): Promise<void> {
  try {
    const res = await pool.query(
      "UPDATE user_settings SET tz_id = $2 WHERE tg_id = $1",
      [tgId, tzId],
    );
    console.log("[setTimezone]", tgId, "set", tzId, "rows:", res.rowCount);
  } catch (err) {
    console.error("[setTimezone] DB error:", err);
    throw err;
  }
}


/** изменить важность новостей *по дефолту стоит 2 */
export async function setImportance(tgId: number, importance: number): Promise<void> {
  if (![1, 2, 3].includes(importance)) {
    throw new Error("importance must be 1, 2, or 3");
  }

  try {
    const res = await pool.query(
      "UPDATE user_settings SET importance = $2 WHERE tg_id = $1",
      [tgId, importance],
    );
    console.log("[setImportance]", tgId, "set", importance, "rows:", res.rowCount);
  } catch (err) {
    console.error("[setImportance] DB error:", err);
    throw err;
  }
}


/** обновить username, если он изменился */
export async function updateUsername(tgId: number, username = ""): Promise<void> {
  try {
    const res = await pool.query(
      `UPDATE user_settings
         SET tg_username = $2
       WHERE tg_id = $1
         AND tg_username IS DISTINCT FROM $2`,   
      [tgId, username],
    );
    console.log("[updateUsername]", tgId, "rows:", res.rowCount); // 1 = обновил, 0 = без изменений
  } catch (err) {
    console.error("[updateUsername] DB error:", err);
    throw err;
  }
}

export async function setLanguage(tgId: number, lang: "ru" | "en") {
  await pool.query(
    "UPDATE user_settings SET lang = $2 WHERE tg_id = $1",
    [tgId, lang],
  );
}
