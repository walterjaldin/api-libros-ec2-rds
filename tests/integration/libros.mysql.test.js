// Pruebas de integracion contra MySQL real (en CI: contenedor de servicio mysql:8.4).
// Solo se ejecutan si RUN_INTEGRATION=1.
const request = require('supertest');

const run = process.env.RUN_INTEGRATION === '1' ? describe : describe.skip;

run('Integración con MySQL', () => {
  let app;
  let pool;
  let closePool;

  beforeAll(async () => {
    const db = require('../../src/db/pool');
    const { migrate } = require('../../src/db/migrate');
    const { createLibrosRepository } = require('../../src/repositories/librosRepository');
    const { createApp } = require('../../src/app');
    pool = db.getPool();
    closePool = db.closePool;
    await migrate(pool);
    await migrate(pool); // idempotente
    await pool.query('DELETE FROM libros');
    app = createApp({ repo: createLibrosRepository(pool) });
  });

  afterAll(async () => {
    await closePool();
  });

  test('health reporta la base de datos como up', async () => {
    const res = await request(app).get('/health');
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  test('CRUD persiste en MySQL', async () => {
    const libro = { titulo: 'Cien años de soledad', autor: 'Gabriel García Márquez', isbn: '978-0307474728', anio_publicacion: 1967, genero: 'Novela' };
    const creado = await request(app).post('/libros').send(libro);
    expect(creado.status).toBe(201);
    expect(creado.body).toMatchObject({ isbn: '9780307474728', disponible: true });

    const [rows] = await pool.query('SELECT titulo FROM libros WHERE id = ?', [creado.body.id]);
    expect(rows[0].titulo).toBe('Cien años de soledad');

    expect((await request(app).post('/libros').send(libro)).status).toBe(409);

    const patch = await request(app).patch(`/libros/${creado.body.id}`).send({ disponible: false, paginas: 471 });
    expect(patch.body).toMatchObject({ disponible: false, paginas: 471 });

    const lista = await request(app).get('/libros?q=Márquez');
    expect(lista.body.total).toBe(1);
    expect((await request(app).get('/libros?autor=García&genero=Novela')).body.total).toBe(1);

    const stats = await request(app).get('/libros/estadisticas');
    expect(stats.body).toEqual({ total: 1, disponibles: 0, por_genero: [{ genero: 'Novela', cantidad: 1 }] });

    expect((await request(app).delete(`/libros/${creado.body.id}`)).status).toBe(204);
    const [after] = await pool.query('SELECT COUNT(*) AS n FROM libros');
    expect(after[0].n).toBe(0);
  });
});
