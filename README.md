# API REST de Libros — Amazon EC2 + Amazon RDS + CI/CD

**Segundo examen parcial — COM610 Trabajando en la Nube** · Universidad San Francisco Xavier de Chuquisaca
**Estudiante:** Walter Jaldin Gonzales

[![CI/CD - API Libros](https://github.com/walterjaldin/api-libros-ec2-rds/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/walterjaldin/api-libros-ec2-rds/actions/workflows/ci-cd.yml)

| | |
|---|---|
| **API pública (HTTPS)** | https://3-219-43-118.sslip.io |
| **Health check** | https://3-219-43-118.sslip.io/health |
| **Libros** | https://3-219-43-118.sslip.io/libros |
| **Documentación Swagger** | https://3-219-43-118.sslip.io/docs |
| **Acceso directo por IP elástica (HTTP)** | http://3.219.43.118/health |
| **Informe con evidencias** | [INFORME.md](./INFORME.md) |

## Ejercicios

- **Tema 4:** API REST para gestionar libros en **Amazon EC2** con persistencia en **Amazon RDS for MySQL** (privada, solo accesible desde el Security Group de la EC2).
- **Tema 5:** pruebas automatizadas (unitarias + integración con MySQL) y un flujo **CI/CD con GitHub Actions** que construye la imagen Docker, la escanea, la publica en GHCR y la despliega en la misma EC2 con health check y smoke test.

## Arquitectura

```
                       GitHub Actions (CI/CD)
   push main ──► lint ─┬─► build + scan + push (GHCR) ──► deploy (SSH) ──► smoke test
                 test ─┘                                     │
                                                             ▼
Internet ──443/80──► [ EC2 Ubuntu 24.04 · Elastic IP 3.219.43.118 · SG ec2-libros-sg ]
                   Nginx :443 (Let's Encrypt) / :80 ──► contenedor api-libros 127.0.0.1:3000
                                         │ 3306 (solo desde ec2-libros-sg)
                                         ▼
                 [ RDS MySQL 8.4 · privado · SG rds-libros-sg ]
                   contraseña maestra en AWS Secrets Manager
```

## Endpoints

| Método | Ruta | Descripción | Respuestas |
|---|---|---|---|
| GET | `/` | Información de la API | 200 |
| GET | `/health` | Estado de la API y de la conexión a RDS, versión y commit desplegado | 200 / 503 |
| GET | `/docs` | Swagger UI (OpenAPI 3) — también `/openapi.json` | 200 |
| GET | `/libros` | Lista paginada. Filtros: `q`, `autor`, `genero`, `page`, `limit` | 200 |
| GET | `/libros/estadisticas` | Total, disponibles y libros por género | 200 |
| GET | `/libros/:id` | Obtiene un libro | 200 / 400 / 404 |
| POST | `/libros` | Crea un libro (`titulo` y `autor` obligatorios) | 201 / 400 / 409 |
| PUT | `/libros/:id` | Reemplaza un libro | 200 / 400 / 404 |
| PATCH | `/libros/:id` | Actualización parcial | 200 / 400 / 404 |
| DELETE | `/libros/:id` | Elimina un libro | 204 / 400 / 404 |

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
├── deploy/                  # deploy.sh (health check), bootstrap-db.sh, enable-https.sh, nginx
├── infra/                   # aws-setup.sh (AWS CLI) y user-data de la EC2
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

## Seguridad

- No se versionan contraseñas, tokens, archivos `.env` ni claves privadas (`.gitignore`).
- La contraseña maestra de RDS la genera AWS y queda en **Secrets Manager**; la EC2 la lee con un rol IAM restringido a ese secreto para crear un usuario de aplicación con privilegios mínimos.
- RDS no es públicamente accesible; el puerto 3306 solo admite tráfico desde el SG de la EC2. El puerto 3000 de Node.js no está expuesto (el contenedor escucha en `127.0.0.1`).
- Las credenciales de despliegue (`SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`) son **Environment Secrets** del entorno `production` en GitHub.

## Documentación del examen

- [Ver informe con capturas y evidencias](./INFORME.md)
