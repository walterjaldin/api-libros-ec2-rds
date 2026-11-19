// Configuracion leida SOLO de variables de entorno (nunca se versionan credenciales).
const config = {
  port: Number(process.env.PORT) || 3000,
  env: process.env.NODE_ENV || 'development',
  version: process.env.APP_VERSION || require('../package.json').version,
  commit: process.env.GIT_SHA || 'local',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'db_libros',
  },
};

module.exports = config;
