// Repositorio en memoria con la misma interfaz que el de MySQL (para pruebas unitarias).
function createMemoryRepo({ failPing = false } = {}) {
  let seq = 0;
  let libros = [];
  const now = () => '2026-11-19 12:00:00';
  return {
    async ping() {
      if (failPing) throw new Error('db down');
    },
    async findAll({ q, autor, genero, limit = 50, offset = 0 } = {}) {
      let rows = libros;
      if (q) rows = rows.filter((l) => l.titulo.includes(q) || l.autor.includes(q));
      if (autor) rows = rows.filter((l) => l.autor.includes(autor));
      if (genero) rows = rows.filter((l) => l.genero === genero);
      return { total: rows.length, data: rows.slice(offset, offset + limit) };
    },
    async stats() {
      const conteo = {};
      for (const l of libros) conteo[l.genero || 'Sin género'] = (conteo[l.genero || 'Sin género'] || 0) + 1;
      return {
        total: libros.length,
        disponibles: libros.filter((l) => l.disponible).length,
        por_genero: Object.entries(conteo)
          .map(([genero, cantidad]) => ({ genero, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad || a.genero.localeCompare(b.genero)),
      };
    },
    async findById(id) {
      return libros.find((l) => l.id === id) || null;
    },
    async create(data) {
      if (data.isbn && libros.some((l) => l.isbn === data.isbn)) {
        throw Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' });
      }
      const libro = { id: ++seq, disponible: true, created_at: now(), updated_at: now(), ...data };
      libros.push(libro);
      return libro;
    },
    async update(id, changes) {
      const libro = libros.find((l) => l.id === id);
      if (!libro) return null;
      Object.assign(libro, changes, { updated_at: now() });
      return libro;
    },
    async remove(id) {
      const before = libros.length;
      libros = libros.filter((l) => l.id !== id);
      return libros.length < before;
    },
  };
}

module.exports = { createMemoryRepo };
