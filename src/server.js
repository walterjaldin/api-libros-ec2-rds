const config = require('./config');
const { getPool, closePool } = require('./db/pool');
const { migrate } = require('./db/migrate');
const { createLibrosRepository } = require('./repositories/librosRepository');
const { createApp } = require('./app');

async function start() {
  const pool = getPool();
  await migrate(pool);
  const app = createApp({ repo: createLibrosRepository(pool) });
  const server = app.listen(config.port, () => {
    console.log(`API Libros v${config.version} (${config.commit}) escuchando en :${config.port} -> DB ${config.db.host}`);
  });

  const shutdown = () => server.close(() => closePool().finally(() => process.exit(0)));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('No se pudo iniciar la API:', err.message);
  process.exit(1);
});
