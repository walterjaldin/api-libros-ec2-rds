const express = require('express');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const openapi = require('./openapi');
const { librosRouter } = require('./routes');

function createApp({ repo }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true); // detras de Nginx
  app.use(express.json({ limit: '100kb' }));

  app.get('/', (req, res) => {
    res.json({
      nombre: 'API REST de Libros',
      version: config.version,
      documentacion: '/docs',
      endpoints: ['/health', '/libros', '/libros/estadisticas', '/libros/:id'],
    });
  });

  // Health check: valida que la app y la conexion a RDS esten operativas.
  app.get('/health', async (req, res) => {
    const base = {
      version: config.version,
      commit: config.commit,
      entorno: config.env,
      uptime_s: Math.round(process.uptime()),
    };
    try {
      await repo.ping();
      res.json({ status: 'ok', database: 'up', ...base });
    } catch {
      res.status(503).json({ status: 'error', database: 'down', ...base });
    }
  });

  app.get('/openapi.json', (req, res) => res.json(openapi));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'API Libros - Docs' }));

  app.use('/libros', librosRouter(repo));

  app.use((req, res) => res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` }));

  // Manejador central de errores (Express 5 propaga errores de handlers async)
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'JSON mal formado' });
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe un libro con ese ISBN' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

module.exports = { createApp };
