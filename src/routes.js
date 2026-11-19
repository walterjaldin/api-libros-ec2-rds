const express = require('express');
const { validateLibro, parseId } = require('./validation');

function librosRouter(repo) {
  const router = express.Router();

  // Lista con filtros (?q=, ?autor=, ?genero=) y paginacion (?page=, ?limit=)
  router.get('/', async (req, res) => {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const { q, autor, genero } = req.query;
    const { total, data } = await repo.findAll({ q, autor, genero, limit, offset: (page - 1) * limit });
    res.json({ page, limit, total, data });
  });

  // Estadisticas del catalogo (antes de /:id para que no se interprete como id)
  router.get('/estadisticas', async (req, res) => {
    res.json(await repo.stats());
  });

  router.get('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo' });
    const libro = await repo.findById(id);
    if (!libro) return res.status(404).json({ error: `Libro ${id} no encontrado` });
    res.json(libro);
  });

  router.post('/', async (req, res) => {
    const { value, errors } = validateLibro(req.body);
    if (errors.length) return res.status(400).json({ error: 'Datos inválidos', detalles: errors });
    const libro = await repo.create(value);
    res.status(201).location(`/libros/${libro.id}`).json(libro);
  });

  // PUT reemplaza el recurso (titulo y autor obligatorios); PATCH actualiza parcialmente
  const update = (partial) => async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo' });
    const { value, errors } = validateLibro(req.body, { partial });
    if (errors.length) return res.status(400).json({ error: 'Datos inválidos', detalles: errors });
    const libro = await repo.update(id, value);
    if (!libro) return res.status(404).json({ error: `Libro ${id} no encontrado` });
    res.json(libro);
  };
  router.put('/:id', update(false));
  router.patch('/:id', update(true));

  router.delete('/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'El id debe ser un entero positivo' });
    const removed = await repo.remove(id);
    if (!removed) return res.status(404).json({ error: `Libro ${id} no encontrado` });
    res.status(204).end();
  });

  return router;
}

module.exports = { librosRouter };
