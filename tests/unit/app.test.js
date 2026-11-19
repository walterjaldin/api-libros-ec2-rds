// Pruebas de la API con un doble de prueba de la capa de datos (repositorio en memoria):
// se ejecutan sin una instancia RDS real.
const request = require('supertest');
const { createApp } = require('../../src/app');
const { createMemoryRepo } = require('../helpers/memoryRepo');

const nuevo = { titulo: 'Raza de bronce', autor: 'Alcides Arguedas', anio_publicacion: 1919, isbn: '9788437612683', genero: 'Novela' };
const otro = { titulo: 'Clean Code', autor: 'Robert C. Martin', anio_publicacion: 2008, genero: 'Tecnología' };

let app;
beforeEach(() => {
  app = createApp({ repo: createMemoryRepo() });
});

describe('Requisitos mínimos del examen', () => {
  test('GET /health responde 200 e indica que el servicio está activo', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  test('POST /libros con datos válidos crea el libro y responde 201 con el registro', async () => {
    const res = await request(app).post('/libros').send(nuevo);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: expect.any(Number), titulo: 'Raza de bronce', autor: 'Alcides Arguedas', anio_publicacion: 1919 });
  });

  test.each([
    ['titulo vacío', { ...nuevo, titulo: '' }],
    ['autor vacío', { ...nuevo, autor: '   ' }],
    ['sin anio_publicacion', { titulo: 'X', autor: 'Y' }],
    ['anio_publicacion no entero', { ...nuevo, anio_publicacion: '1919' }],
    ['anio_publicacion decimal', { ...nuevo, anio_publicacion: 1919.5 }],
    ['anio_publicacion fuera de rango', { ...nuevo, anio_publicacion: 3000 }],
  ])('POST /libros rechaza datos inválidos (%s) con 400', async (_caso, body) => {
    const res = await request(app).post('/libros').send(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Datos inválidos');
  });

  test('GET /libros/:id de un libro inexistente responde 404', async () => {
    const res = await request(app).get('/libros/999');
    expect(res.status).toBe(404);
  });
});

describe('CRUD completo y casos adicionales', () => {
  test('GET / devuelve información de la API', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('API REST de Libros');
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

  test('crear, leer, reemplazar, actualizar parcialmente y eliminar un libro', async () => {
    const creado = await request(app).post('/libros').send(nuevo);
    expect(creado.headers.location).toBe(`/libros/${creado.body.id}`);
    const id = creado.body.id;

    expect((await request(app).get(`/libros/${id}`)).body.titulo).toBe('Raza de bronce');

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
    await request(app).post('/libros').send(otro);
    expect((await request(app).get('/libros')).body).toMatchObject({ page: 1, limit: 20, total: 2 });

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
    await request(app).post('/libros').send({ titulo: 'Sin género', autor: 'Anónimo', anio_publicacion: 2000, disponible: false });
    const res = await request(app).get('/libros/estadisticas');
    expect(res.body).toEqual({
      total: 2,
      disponibles: 1,
      por_genero: [{ genero: 'Novela', cantidad: 1 }, { genero: 'Sin género', cantidad: 1 }],
    });
  });

  test('POST /libros con ISBN duplicado responde 409', async () => {
    await request(app).post('/libros').send(nuevo);
    expect((await request(app).post('/libros').send(nuevo)).status).toBe(409);
  });

  test('JSON mal formado responde 400', async () => {
    const res = await request(app).post('/libros').set('Content-Type', 'application/json').send('{"titulo":');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('JSON mal formado');
  });

  test.each(['get', 'put', 'patch', 'delete'])('%s con id inválido responde 400', async (method) => {
    expect((await request(app)[method]('/libros/abc').send(nuevo)).status).toBe(400);
  });

  test.each(['put', 'patch', 'delete'])('%s de un id inexistente responde 404', async (method) => {
    expect((await request(app)[method]('/libros/999').send(nuevo)).status).toBe(404);
  });

  test('PUT exige todos los obligatorios y PATCH no permite vaciarlos', async () => {
    const { body } = await request(app).post('/libros').send(nuevo);
    expect((await request(app).put(`/libros/${body.id}`).send({ titulo: 'Solo título' })).status).toBe(400);
    expect((await request(app).patch(`/libros/${body.id}`).send({})).status).toBe(400);
    expect((await request(app).patch(`/libros/${body.id}`).send({ anio_publicacion: null })).status).toBe(400);
  });

  test('ruta inexistente responde 404', async () => {
    expect((await request(app).get('/no-existe')).status).toBe(404);
  });

  test('errores inesperados responden 500', async () => {
    const repo = createMemoryRepo();
    repo.findAll = async () => { throw new Error('boom'); };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect((await request(createApp({ repo })).get('/libros')).status).toBe(500);
    spy.mockRestore();
  });
});
