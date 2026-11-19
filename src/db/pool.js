const mysql = require('mysql2/promise');
const config = require('../config');

let pool;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...config.db,
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: true,
    });
  }
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}

module.exports = { getPool, closePool };
