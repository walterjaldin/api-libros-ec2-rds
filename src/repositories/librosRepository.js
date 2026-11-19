// Acceso a datos de libros en MySQL (Amazon RDS en produccion).
const COLUMNS = 'id, titulo, autor, isbn, anio_publicacion, genero, editorial, paginas, disponible, created_at, updated_at';

function toLibro(row) {
  return row ? { ...row, disponible: Boolean(row.disponible) } : null;
}

function createLibrosRepository(pool) {
  return {
    async ping() {
      await pool.query('SELECT 1');
    },

    async findAll({ q, autor, genero, limit = 50, offset = 0 } = {}) {
      const where = [];
      const params = [];
      if (q) {
        where.push('(titulo LIKE ? OR autor LIKE ?)');
        params.push(`%${q}%`, `%${q}%`);
      }
      if (autor) {
        where.push('autor LIKE ?');
        params.push(`%${autor}%`);
      }
      if (genero) {
        where.push('genero = ?');
        params.push(genero);
      }
      const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM libros ${clause}`, params);
      const [rows] = await pool.query(
        `SELECT ${COLUMNS} FROM libros ${clause} ORDER BY id LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      );
      return { total, data: rows.map(toLibro) };
    },

    async findById(id) {
      const [rows] = await pool.query(`SELECT ${COLUMNS} FROM libros WHERE id = ?`, [id]);
      return toLibro(rows[0]);
    },

    async create(libro) {
      const [result] = await pool.query('INSERT INTO libros SET ?', [libro]);
      return this.findById(result.insertId);
    },

    async update(id, changes) {
      const [result] = await pool.query('UPDATE libros SET ? WHERE id = ?', [changes, id]);
      if (result.affectedRows === 0) return null;
      return this.findById(id);
    },

    async remove(id) {
      const [result] = await pool.query('DELETE FROM libros WHERE id = ?', [id]);
      return result.affectedRows > 0;
    },
  };
}

module.exports = { createLibrosRepository };
