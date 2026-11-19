const { validateLibro, parseId } = require('../../src/validation');

describe('validateLibro', () => {
  test('acepta un libro válido y normaliza el ISBN', () => {
    const { value, errors } = validateLibro({ titulo: ' Clean Code ', autor: 'Robert C. Martin', isbn: '978-0-13-235088-4', anio_publicacion: 2008 });
    expect(errors).toEqual([]);
    expect(value).toEqual({ titulo: 'Clean Code', autor: 'Robert C. Martin', isbn: '9780132350884', anio_publicacion: 2008 });
  });

  test('exige titulo y autor al crear', () => {
    const { errors } = validateLibro({});
    expect(errors).toEqual(expect.arrayContaining(['titulo es obligatorio', 'autor es obligatorio']));
  });

  test('rechaza campos desconocidos y tipos incorrectos', () => {
    const { errors } = validateLibro({ titulo: 'X', autor: 'Y', precio: 10, paginas: '100', disponible: 'si' });
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

  test('modo parcial: no exige obligatorios pero sí al menos un campo', () => {
    expect(validateLibro({ paginas: 300 }, { partial: true }).errors).toEqual([]);
    expect(validateLibro({}, { partial: true }).errors).toEqual(['Debe enviar al menos un campo para actualizar']);
  });

  test('permite anular campos opcionales con null', () => {
    expect(validateLibro({ genero: null }, { partial: true }).value).toEqual({ genero: null });
  });

  test('rechaza strings vacíos o solo espacios', () => {
    expect(validateLibro({ titulo: '   ', autor: 'Y' }).errors).toEqual(['titulo debe ser un texto no vacío']);
  });
});

describe('parseId', () => {
  test.each([['1', 1], ['42', 42], ['0', null], ['-3', null], ['abc', null], ['1.5', null]])('parseId(%s) = %s', (raw, expected) => {
    expect(parseId(raw)).toBe(expected);
  });
});
