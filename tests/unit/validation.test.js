const { validateLibro, parseId } = require('../../src/validation');

describe('validateLibro', () => {
  test('acepta un libro válido y normaliza el ISBN', () => {
    const { value, errors } = validateLibro({ titulo: ' Clean Code ', autor: 'Robert C. Martin', isbn: '978-0-13-235088-4', anio_publicacion: 2008 });
    expect(errors).toEqual([]);
    expect(value).toEqual({ titulo: 'Clean Code', autor: 'Robert C. Martin', isbn: '9780132350884', anio_publicacion: 2008 });
  });

  test('exige titulo, autor y anio_publicacion al crear', () => {
    const { errors } = validateLibro({});
    expect(errors).toEqual(['titulo es obligatorio', 'autor es obligatorio', 'anio_publicacion es obligatorio']);
  });

  test('rechaza campos desconocidos y tipos incorrectos', () => {
    const { errors } = validateLibro({ titulo: 'X', autor: 'Y', anio_publicacion: 2000, precio: 10, paginas: '100', disponible: 'si' });
    expect(errors).toEqual(expect.arrayContaining([
      'Campo no permitido: precio',
      'paginas debe ser un entero entre 1 y 100000',
      'disponible debe ser true o false',
    ]));
  });

  test('rechaza año futuro, ISBN inválido y textos demasiado largos', () => {
    const { errors } = validateLibro({ titulo: 'a'.repeat(201), autor: 'Y', anio_publicacion: 3000, isbn: '123' });
    expect(errors).toHaveLength(3);
  });

  test('rechaza un cuerpo que no es objeto', () => {
    expect(validateLibro([]).errors).toEqual(['El cuerpo debe ser un objeto JSON']);
    expect(validateLibro(null).errors).toEqual(['El cuerpo debe ser un objeto JSON']);
  });

  test('rechaza anio_publicacion no entero', () => {
    expect(validateLibro({ titulo: 'X', autor: 'Y', anio_publicacion: '1990' }).errors).toEqual(['anio_publicacion debe ser un entero entre 1000 y ' + new Date().getFullYear()]);
    expect(validateLibro({ titulo: 'X', autor: 'Y', anio_publicacion: 1990.5 }).errors).toHaveLength(1);
  });

  test('modo parcial: no exige obligatorios pero sí al menos un campo', () => {
    expect(validateLibro({ paginas: 300 }, { partial: true }).errors).toEqual([]);
    expect(validateLibro({}, { partial: true }).errors).toEqual(['Debe enviar al menos un campo para actualizar']);
  });

  test('permite anular campos opcionales con null', () => {
    expect(validateLibro({ genero: null }, { partial: true }).value).toEqual({ genero: null });
  });

  test('rechaza strings vacíos o solo espacios', () => {
    expect(validateLibro({ titulo: '   ', autor: 'Y', anio_publicacion: 2000 }).errors).toEqual(['titulo debe ser un texto no vacío']);
  });
});

describe('parseId', () => {
  test.each([['1', 1], ['42', 42], ['0', null], ['-3', null], ['abc', null], ['1.5', null]])('parseId(%s) = %s', (raw, expected) => {
    expect(parseId(raw)).toBe(expected);
  });
});

describe('statementsFrom (db.sql)', () => {
  const { statementsFrom } = require('../../src/db/migrate');
  test('ignora comentarios y separa sentencias', () => {
    expect(statementsFrom('-- comentario\nCREATE TABLE a (x INT);\n-- INSERT INTO a VALUES (1);\nSELECT 1;')).toEqual(['CREATE TABLE a (x INT)', 'SELECT 1']);
  });
  test('db.sql contiene la tabla libros con los campos requeridos', () => {
    const sql = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'db.sql'), 'utf8');
    const [create] = statementsFrom(sql);
    for (const campo of ['id', 'titulo', 'autor', 'anio_publicacion']) expect(create).toMatch(new RegExp(`\\b${campo}\\b`));
    expect(statementsFrom(sql)).toHaveLength(1);
  });
});
