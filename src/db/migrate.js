// Crea la tabla si no existe. Es idempotente: se ejecuta en cada arranque.
const fs = require('fs');
const path = require('path');

const schema = fs.readFileSync(path.join(__dirname, '..', '..', 'sql', 'schema.sql'), 'utf8');

async function migrate(pool) {
  const statements = schema
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--'));
  for (const sql of statements) {
    await pool.query(sql);
  }
}

module.exports = { migrate };
