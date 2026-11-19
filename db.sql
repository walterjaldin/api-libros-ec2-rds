-- db.sql — Modelo de datos de la API de libros (Amazon RDS for MySQL 8.4)
-- Uso manual:  mysql -h <ENDPOINT_RDS> -u <usuario> -p db_libros < db.sql
-- La API también ejecuta este archivo al arrancar (CREATE TABLE IF NOT EXISTS es idempotente).

CREATE TABLE IF NOT EXISTS libros (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  autor VARCHAR(150) NOT NULL,
  anio_publicacion SMALLINT NOT NULL,
  isbn VARCHAR(17) NULL UNIQUE,
  genero VARCHAR(80) NULL,
  editorial VARCHAR(120) NULL,
  paginas INT UNSIGNED NULL,
  disponible BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_libros_autor (autor),
  INDEX idx_libros_genero (genero)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Datos de ejemplo (opcional, descomentar para cargarlos):
-- INSERT IGNORE INTO libros (titulo, autor, anio_publicacion, isbn, genero, editorial, paginas) VALUES
--   ('Cien años de soledad', 'Gabriel García Márquez', 1967, '9780307474728', 'Novela', 'Sudamericana', 471),
--   ('Raza de bronce', 'Alcides Arguedas', 1919, '9788437612683', 'Novela', 'González y Medina', 320),
--   ('Clean Code', 'Robert C. Martin', 2008, '9780132350884', 'Tecnología', 'Prentice Hall', 464);
