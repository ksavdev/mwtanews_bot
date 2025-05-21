"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUser = findUser;
exports.createUser = createUser;
exports.updateUsername = updateUsername;
exports.setTimezone = setTimezone;
exports.setImportance = setImportance;
exports.setLang = setLang;
const db_1 = require("@/core/db");
const logger_1 = require("@/core/logger");
/* ────────── CRUD ────────── */
async function findUser(tgId) {
    const { rows } = await db_1.pool.query('SELECT * FROM user_settings WHERE tg_id = $1 LIMIT 1', [tgId]);
    logger_1.log.debug({ tgId, user: rows[0] ?? null }, '[findUser]');
    return rows[0] ?? null;
}
async function createUser(tgId, username) {
    const { rowCount } = await db_1.pool.query(`INSERT INTO user_settings (tg_id, tg_username)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`, [tgId, username]);
    logger_1.log.debug({ tgId, rowCount }, '[createUser]');
}
async function updateUsername(tgId, username = '') {
    const { rowCount } = await db_1.pool.query(`UPDATE user_settings
       SET tg_username = $2
     WHERE tg_id = $1
       AND tg_username IS DISTINCT FROM $2`, [tgId, username]);
    logger_1.log.debug({ tgId, rowCount }, '[updateUsername]');
}
/* ────────── настройки пользователя ────────── */
async function setTimezone(tgId, tzId) {
    const { rowCount } = await db_1.pool.query('UPDATE user_settings SET tz_id = $2 WHERE tg_id = $1', [
        tgId,
        tzId,
    ]);
    logger_1.log.debug({ tgId, tzId, rowCount }, '[setTimezone]');
}
async function setImportance(tgId, importance) {
    const { rowCount } = await db_1.pool.query('UPDATE user_settings SET importance = $2 WHERE tg_id = $1', [tgId, importance]);
    logger_1.log.debug({ tgId, importance, rowCount }, '[setImportance]');
}
/** 👈 новый «каноничный» экспорт: /set_lang использует именно его */
async function setLang(tgId, lang) {
    const { rowCount } = await db_1.pool.query('UPDATE user_settings SET lang = $2 WHERE tg_id = $1', [
        tgId,
        lang,
    ]);
    logger_1.log.debug({ tgId, lang, rowCount }, '[setLang]');
}
