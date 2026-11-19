const request = require('supertest');
const { createApp } = require('../../src/app');
const { createMemoryRepo } = require('../helpers/memoryRepo');

const nuevo = { titulo: 'Raza de bronce', autor: 'Alcides Arguedas', isbn: '9788437612683', anio_publicacion: 1919, genero: 'Novela' };

describe('API de libros (repositorio en memoria)', () => {
  let app;
  beforeEach(() => {
    app = createApp({ repo: createMemoryRepo() });
  });

  test('GET / devuelve información de la API', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('API REST de Libros');
  });

  test('GET /health responde ok cuando la BD está disponible', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  test('GET /health responde 503 cuando la BD no está disponible', async () => {
    const res = await request(createApp({ repo: createMemoryRepo({ failPing: true }) })).get('/health');
    expect(res.status).toBe(503);
    expect(res.body.database).toBe('down');
  });

  test('GET /openapi.json y /docs exponen la documentación', async () => {
    expect((await request(app).get('/openapi.json')).body.openapi).toBe('3.0.3');
    expect((await request(app).get('/docs/')).status).toBe(200);
  });

  test('CRUD completo de un libro', async () => {
    const creado = await request(app).post('/libros').send(nuevo);
    expect(creado.status).toBe(201);
    expect(creado.headers.location).toBe(`/libros/${creado.body.id}`);
    const id = creado.body.id;

    const leido = await request(app).get(`/libros/${id}`);
    expect(leido.status).toBe(200);
    expect(leido.body.titulo).toBe('Raza de bronce');

    const reemplazado = await request(app).put(`/libros/${id}`).send({ ...nuevo, paginas: 320 });
    expect(reemplazado.status).toBe(200);
    expect(reemplazado.body.paginas).toBe(320);

    const parcial = await request(app).patch(`/libros/${id}`).send({ disponible: false });
    expect(parcial.status).toBe(200);
    expect(parcial.body.disponible).toBe(false);

    expect((await request(app).delete(`/libros/${id}`)).status).toBe(204);
    expect((await request(app).get(`/libros/${id}`)).status).toBe(404);
  });

  test('GET /libros lista con filtros y paginación', async () => {
    await request(app).post('/libros').send(nuevo);
    await request(app).post('/libros').send({ titulo: 'Clean Code', autor: 'Robert C. Martin', genero: 'Tecnología' });
    const todos = await request(app).get('/libros');
    expect(todos.body).toMatchObject({ page: 1, limit: 20, total: 2 });

    const filtrado = await request(app).get('/libros?genero=Tecnología');
    expect(filtrado.body.total).toBe(1);
    expect(filtrado.body.data[0].titulo).toBe('Clean Code');

    expect((await request(app).get('/libros?q=Arguedas')).body.total).toBe(1);
    expect((await request(app).get('/libros?autor=Martin')).body.total).toBe(1);

    const pagina2 = await request(app).get('/libros?limit=1&page=2');
    expect(pagina2.body.data).toHaveLength(1);
    expect(pagina2.body.data[0].titulo).toBe('Clean Code');
  });

  test('GET /libros/estadisticas resume el catálogo', async () => {
    await request(app).post('/libros').send(nuevo);
    await request(app).post('/libros').send({ titulo: 'Clean Code', autor: 'Robert C. Martin', disponible: false });
    const res = await request(app).get('/libros/estadisticas');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 2,
      disponibles: 1,
      por_genero: [{ genero: 'Novela', cantidad: 1 }, { genero: 'Sin género', cantidad: 1 }],
    });
  });

  test('POST /libros con datos inválidos responde 400 con detalles', async () => {
    const res = await request(app).post('/libros').send({ titulo: '' });
    expect(res.status).toBe(400);
    expect(res.body.detalles).toContain('autor es obligatorio');
  });

  test('POST /libros con ISBN duplicado responde 409', async () => {
    await request(app).post('/libros').send(nuevo);
    const res = await request(app).post('/libros').send(nuevo);
    expect(res.status).toBe(409);
  });

  test('JSON mal formado responde 400', async () => {
    const res = await request(app).post('/libros').set('Content-Type', 'application/json').send('{"titulo":');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('JSON mal formado');
  });

  test.each(['get', 'put', 'patch', 'delete'])('%s con id inválido responde 400', async (method) => {
    const res = await request(app)[method]('/libros/abc').send({ titulo: 'X', autor: 'Y' });
    expect(res.status).toBe(400);
  });

  test.each(['put', 'patch', 'delete'])('%s de un id inexistente responde 404', async (method) => {
    const res = await request(app)[method]('/libros/999').send({ titulo: 'X', autor: 'Y' });
    expect(res.status).toBe(404);
  });

  test('PUT y PATCH validan el cuerpo', async () => {
    const { body } = await request(app).post('/libros').send(nuevo);
    expect((await request(app).put(`/libros/${body.id}`).send({ titulo: 'Solo título' })).status).toBe(400);
    expect((await request(app).patch(`/libros/${body.id}`).send({})).status).toBe(400);
  });

  test('ruta inexistente responde 404', async () => {
    expect((await request(app).get('/no-existe')).status).toBe(404);
  });

  test('errores inesperados responden 500', async () => {
    const repo = createMemoryRepo();
    repo.findAll = async () => { throw new Error('boom'); };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(createApp({ repo })).get('/libros');
    expect(res.status).toBe(500);
    spy.mockRestore();
  });
});
