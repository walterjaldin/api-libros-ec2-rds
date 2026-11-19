const config = require('./config');

const libroProps = {
  titulo: { type: 'string', maxLength: 200, example: 'Cien años de soledad' },
  autor: { type: 'string', maxLength: 150, example: 'Gabriel García Márquez' },
  isbn: { type: 'string', nullable: true, example: '978-0307474728', description: 'ISBN-10 o ISBN-13 (se aceptan guiones)' },
  anio_publicacion: { type: 'integer', nullable: true, minimum: 1000, example: 1967 },
  genero: { type: 'string', nullable: true, example: 'Novela' },
  editorial: { type: 'string', nullable: true, example: 'Sudamericana' },
  paginas: { type: 'integer', nullable: true, minimum: 1, example: 471 },
  disponible: { type: 'boolean', example: true },
};

const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } };
const json = (ref) => ({ 'application/json': { schema: { $ref: ref } } });
const errors = {
  400: { description: 'Datos inválidos', content: json('#/components/schemas/Error') },
  404: { description: 'No encontrado', content: json('#/components/schemas/Error') },
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'API REST de Libros',
    version: config.version,
    description: 'CRUD de libros desplegado en Amazon EC2 con persistencia en Amazon RDS (MySQL). COM610 - Segundo parcial.',
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Libros' }, { name: 'Sistema' }],
  paths: {
    '/health': {
      get: {
        tags: ['Sistema'],
        summary: 'Estado de la API y de la conexión a RDS',
        responses: { 200: { description: 'OK' }, 503: { description: 'Base de datos no disponible' } },
      },
    },
    '/libros': {
      get: {
        tags: ['Libros'],
        summary: 'Listar libros',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Busca en título o autor' },
          { name: 'autor', in: 'query', schema: { type: 'string' } },
          { name: 'genero', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: { 200: { description: 'Lista paginada', content: json('#/components/schemas/ListaLibros') } },
      },
      post: {
        tags: ['Libros'],
        summary: 'Crear un libro',
        requestBody: { required: true, content: json('#/components/schemas/LibroInput') },
        responses: {
          201: { description: 'Creado', content: json('#/components/schemas/Libro') },
          400: errors[400],
          409: { description: 'ISBN duplicado', content: json('#/components/schemas/Error') },
        },
      },
    },
    '/libros/estadisticas': {
      get: {
        tags: ['Libros'],
        summary: 'Estadísticas del catálogo (total, disponibles y libros por género)',
        responses: { 200: { description: 'OK' } },
      },
    },
    '/libros/{id}': {
      parameters: [idParam],
      get: {
        tags: ['Libros'],
        summary: 'Obtener un libro',
        responses: { 200: { description: 'OK', content: json('#/components/schemas/Libro') }, ...errors },
      },
      put: {
        tags: ['Libros'],
        summary: 'Reemplazar un libro (titulo y autor obligatorios)',
        requestBody: { required: true, content: json('#/components/schemas/LibroInput') },
        responses: { 200: { description: 'Actualizado', content: json('#/components/schemas/Libro') }, ...errors },
      },
      patch: {
        tags: ['Libros'],
        summary: 'Actualizar parcialmente un libro',
        requestBody: { required: true, content: json('#/components/schemas/LibroPatch') },
        responses: { 200: { description: 'Actualizado', content: json('#/components/schemas/Libro') }, ...errors },
      },
      delete: {
        tags: ['Libros'],
        summary: 'Eliminar un libro',
        responses: { 204: { description: 'Eliminado' }, ...errors },
      },
    },
  },
  components: {
    schemas: {
      LibroInput: { type: 'object', required: ['titulo', 'autor'], properties: libroProps, additionalProperties: false },
      LibroPatch: { type: 'object', properties: libroProps, additionalProperties: false },
      Libro: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          ...libroProps,
          created_at: { type: 'string', example: '2026-11-19 20:00:00' },
          updated_at: { type: 'string', example: '2026-11-19 20:00:00' },
        },
      },
      ListaLibros: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          data: { type: 'array', items: { $ref: '#/components/schemas/Libro' } },
        },
      },
      Error: {
        type: 'object',
        properties: { error: { type: 'string' }, detalles: { type: 'array', items: { type: 'string' } } },
      },
    },
  },
};
