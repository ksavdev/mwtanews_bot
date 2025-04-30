import { Pool } from "pg";
import * as dotenv from "dotenv";
dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// пример запроса
export async function getUser(tgId: number) {
  const { rows } = await pool.query(
    "SELECT * FROM users_settings WHERE tg_id = $1 LIMIT 1",
    [tgId],
  );
  return rows[0] ?? null;
}
