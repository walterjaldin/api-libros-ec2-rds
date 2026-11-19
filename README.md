# API REST de Libros — Amazon EC2 + Amazon RDS + CI/CD

**Segundo examen parcial — COM610 Trabajando en la Nube** 


**Estudiante:** Walter Jaldin Gonzales


|                                           |                                                                              |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| **API pública (HTTPS)**                   | [https://3-219-43-118.sslip.io](https://3-219-43-118.sslip.io)               |
| **Health check**                          | [https://3-219-43-118.sslip.io/health](https://3-219-43-118.sslip.io/health) |
| **Libros**                                | [https://3-219-43-118.sslip.io/libros](https://3-219-43-118.sslip.io/libros) |
| **Documentación Swagger**                 | [https://3-219-43-118.sslip.io/docs](https://3-219-43-118.sslip.io/docs)     |
| **Acceso directo por IP elástica (HTTP)** | [http://3.219.43.118/health](http://3.219.43.118/health)                     |
| **Informe con evidencias**                | [INFORME.md](./INFORME.md)                                                   |


## Ejercicios

- **Tema 4:** API REST para gestionar libros en **Amazon EC2** con persistencia en **Amazon RDS for MySQL** (privada, solo accesible desde el Security Group de la EC2).
- **Tema 5:** pruebas automatizadas (unitarias + integración con MySQL) y un flujo **CI/CD con GitHub Actions** que construye la imagen Docker, la escanea, la publica en GHCR y la despliega en la misma EC2 con health check y smoke test.

## Endpoints


| Método | Ruta                   | Descripción                                                          | Respuestas      |
| ------ | ---------------------- | -------------------------------------------------------------------- | --------------- |
| GET    | `/`                    | Información de la API                                                | 200             |
| GET    | `/health`              | Estado de la API y de la conexión a RDS, versión y commit desplegado | 200 / 503       |
| GET    | `/docs`                | Swagger UI (OpenAPI 3) — también `/openapi.json`                     | 200             |
| GET    | `/libros`              | Lista paginada. Filtros: `q`, `autor`, `genero`, `page`, `limit`     | 200             |
| GET    | `/libros/estadisticas` | Total, disponibles y libros por género                               | 200             |
| GET    | `/libros/:id`          | Obtiene un libro                                                     | 200 / 400 / 404 |
| POST   | `/libros`              | Crea un libro (`titulo` y `autor` obligatorios)                      | 201 / 400 / 409 |
| PUT    | `/libros/:id`          | Reemplaza un libro                                                   | 200 / 400 / 404 |
| PATCH  | `/libros/:id`          | Actualización parcial                                                | 200 / 400 / 404 |
| DELETE | `/libros/:id`          | Elimina un libro                                                     | 204 / 400 / 404 |


Modelo `libro`: `titulo`, `autor`, `isbn` (ISBN‑10/13, único), `anio_publicacion`, `genero`, `editorial`, `paginas`, `disponible`, `created_at`, `updated_at`.

```bash
curl -X POST https://3-219-43-118.sslip.io/libros -H 'Content-Type: application/json' \
  -d '{"titulo":"Cien años de soledad","autor":"Gabriel García Márquez","isbn":"978-0307474728","anio_publicacion":1967}'
```

También se incluye una colección de Postman: [`docs/api-libros.postman_collection.json`](./docs/api-libros.postman_collection.json).

## Estructura del repositorio

```
├── src/                     # Código de la API (Express 5 + mysql2)
│   ├── app.js               # Rutas base, /health, Swagger, manejo de errores
│   ├── routes.js            # CRUD /libros
│   ├── validation.js        # Validaciones de entrada
│   ├── repositories/        # Acceso a datos (MySQL / RDS)
│   └── db/                  # Pool de conexiones y migración automática
├── sql/                     # schema.sql y seed.sql
├── tests/                   # Jest + Supertest (unitarias e integración)
├── Dockerfile               # Build multi-stage (lint + tests dentro del build)
├── .github/workflows/
│   ├── ci-cd.yml            # lint → test → build/scan/push → deploy → smoke test
│   └── rollback.yml         # Rollback manual a un tag anterior
├── deploy/                  # enable-https.sh y configuración de Nginx
├── docs/evidencias/         # Capturas del informe
└── INFORME.md               # Informe paso a paso
```

## Ejecución local

```bash
cp .env.example .env          # completar con datos de una base MySQL local
npm ci
npm test                      # pruebas unitarias
RUN_INTEGRATION=1 npm run test:coverage   # + integración (requiere MySQL)
npm start
```

Con Docker:

```bash
docker build -t api-libros:local .
docker run -d -p 3000:3000 --env-file .env api-libros:local
```

## Documentación del examen

- [Ver informe con capturas y evidencias](./INFORME.md)