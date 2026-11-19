// Demostración: una prueba que falla a propósito para comprobar que la CI se marca como fallida.
const request = require('supertest');
const { createApp } = require('../../src/app');
const { createMemoryRepo } = require('../helpers/memoryRepo');

test('DEMO: GET /libros/:id inexistente debería responder 200 (falla a propósito, la API responde 404)', async () => {
  const res = await request(createApp({ repo: createMemoryRepo() })).get('/libros/999');
  expect(res.status).toBe(200);
});
