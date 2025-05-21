import { pool } from '@/core/db';
import { log } from '@/core/logger';
import { QueryResult } from 'pg';

export interface UserRow {
  tg_id: number;
  tg_username: string;
  tz_id: string;
  lang: 'ru' | 'en';
  importance: number;
}

export async function findUser(tgId: number): Promise<UserRow | null> {
  const { rows }: QueryResult<UserRow> = await pool.query(
    'SELECT * FROM user_settings WHERE tg_id = $1 LIMIT 1',
    [tgId],
  );

  log.debug({ tgId, user: rows[0] ?? null }, '[findUser]');
  return rows[0] ?? null;
}

export async function createUser(tgId: number, username: string): Promise<void> {
  const { rowCount } = await pool.query(
    `INSERT INTO user_settings (tg_id, tg_username)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [tgId, username],
  );
  log.debug({ tgId, rowCount }, '[createUser]');
}

export async function updateUsername(tgId: number, username = ''): Promise<void> {
  const { rowCount } = await pool.query(
    `UPDATE user_settings
       SET tg_username = $2
     WHERE tg_id = $1
       AND tg_username IS DISTINCT FROM $2`,
    [tgId, username],
  );
  log.debug({ tgId, rowCount }, '[updateUsername]');
}


export async function setTimezone(tgId: number, tzId: string): Promise<void> {
  const { rowCount } = await pool.query('UPDATE user_settings SET tz_id = $2 WHERE tg_id = $1', [
    tgId,
    tzId,
  ]);
  log.debug({ tgId, tzId, rowCount }, '[setTimezone]');
}

export async function setImportance(tgId: number, importance: 1 | 2 | 3): Promise<void> {
  const { rowCount } = await pool.query(
    'UPDATE user_settings SET importance = $2 WHERE tg_id = $1',
    [tgId, importance],
  );
  log.debug({ tgId, importance, rowCount }, '[setImportance]');
}

export async function setLang(tgId: number, lang: 'ru' | 'en'): Promise<void> {
  const { rowCount } = await pool.query('UPDATE user_settings SET lang = $2 WHERE tg_id = $1', [
    tgId,
    lang,
  ]);
  log.debug({ tgId, lang, rowCount }, '[setLang]');
}
