// Ejecuta db.sql al arrancar. Es idempotente (CREATE TABLE IF NOT EXISTS).
const fs = require('fs');
const path = require('path');

const DB_SQL = path.join(__dirname, '..', '..', 'db.sql');

function statementsFrom(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function migrate(pool) {
  for (const sql of statementsFrom(fs.readFileSync(DB_SQL, 'utf8'))) {
    await pool.query(sql);
  }
}

module.exports = { migrate, statementsFrom };
