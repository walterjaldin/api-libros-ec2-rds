// Validacion de payloads de libros. Devuelve { value, errors }.
const CURRENT_YEAR = new Date().getFullYear();
const ISBN_RE = /^(?:\d{9}[\dX]|\d{13})$/;

const FIELDS = {
  titulo: { type: 'string', max: 200, required: true },
  autor: { type: 'string', max: 150, required: true },
  isbn: { type: 'isbn' },
  anio_publicacion: { type: 'int', min: 1000, max: CURRENT_YEAR, required: true },
  genero: { type: 'string', max: 80 },
  editorial: { type: 'string', max: 120 },
  paginas: { type: 'int', min: 1, max: 100000 },
  disponible: { type: 'boolean' },
};

function validateLibro(body, { partial = false } = {}) {
  const errors = [];
  const value = {};

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { value, errors: ['El cuerpo debe ser un objeto JSON'] };
  }

  for (const key of Object.keys(body)) {
    if (!FIELDS[key]) errors.push(`Campo no permitido: ${key}`);
  }

  for (const [name, rule] of Object.entries(FIELDS)) {
    const raw = body[name];
    if (raw === undefined || raw === null || raw === '') {
      // En PATCH se permite omitir campos obligatorios, pero no vaciarlos
      if (rule.required && (!partial || raw !== undefined)) errors.push(`${name} es obligatorio`);
      else if (raw === null && !rule.required) value[name] = null;
      continue;
    }

    switch (rule.type) {
      case 'string': {
        if (typeof raw !== 'string' || !raw.trim()) {
          errors.push(`${name} debe ser un texto no vacío`);
        } else if (raw.trim().length > rule.max) {
          errors.push(`${name} admite como máximo ${rule.max} caracteres`);
        } else {
          value[name] = raw.trim();
        }
        break;
      }
      case 'int': {
        if (!Number.isInteger(raw) || raw < rule.min || raw > rule.max) {
          errors.push(`${name} debe ser un entero entre ${rule.min} y ${rule.max}`);
        } else {
          value[name] = raw;
        }
        break;
      }
      case 'boolean': {
        if (typeof raw !== 'boolean') errors.push(`${name} debe ser true o false`);
        else value[name] = raw;
        break;
      }
      case 'isbn': {
        const clean = typeof raw === 'string' ? raw.replace(/[-\s]/g, '').toUpperCase() : '';
        if (!ISBN_RE.test(clean)) errors.push('isbn debe tener 10 o 13 dígitos (se permiten guiones)');
        else value[name] = clean;
        break;
      }
    }
  }

  if (partial && Object.keys(value).length === 0 && errors.length === 0) {
    errors.push('Debe enviar al menos un campo para actualizar');
  }

  return { value, errors };
}

function parseId(raw) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

module.exports = { validateLibro, parseId, FIELDS };
