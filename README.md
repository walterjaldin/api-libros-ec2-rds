# API REST de Libros — Amazon EC2 + Amazon RDS + CI/CD

**Segundo examen parcial — COM610 Trabajando en la Nube**

**Estudiante:** Walter Jaldin Gonzales

|                                         |                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **API pública (HTTP, Nginx puerto 80)** | [http://3.219.43.118](http://3.219.43.118/health)                                                                              |
| **API pública (HTTPS)**                 | [https://3-219-43-118.sslip.io](https://3-219-43-118.sslip.io)                                                                 |
| **Health check**                        | [https://3-219-43-118.sslip.io/health](https://3-219-43-118.sslip.io/health)                                                   |
| **Libros**                              | [https://3-219-43-118.sslip.io/libros](https://3-219-43-118.sslip.io/libros)                                                   |
| **Documentación Swagger**               | [https://3-219-43-118.sslip.io/docs](https://3-219-43-118.sslip.io/docs)                                                       |
| **Ejecución exitosa de CI**             | [Actions › CI › run 44631829896](https://github.com/walterjaldin/api-libros-ec2-rds/actions/runs/44631829896)                  |
| **Ejecución exitosa de CD**             | [Actions › CD › run 44631829904](https://github.com/walterjaldin/api-libros-ec2-rds/actions/runs/44631829904)                  |
| **Imagen publicada**                    | [ghcr.io/walterjaldin/api-libros-ec2-rds](https://github.com/users/walterjaldin/packages/container/package/api-libros-ec2-rds) |
| **Informe con evidencias**              | [INFORME.md](./INFORME.md) · carpeta [`evidencias/`](./evidencias)                                                             |


## Ejercicios

- **Ejercicio 1 (Tema 4):** API REST para gestionar libros en **Amazon EC2**, publicada con **Nginx como proxy inverso en el puerto 80**. Los datos persisten en **Amazon RDS for MySQL**, sin acceso público y accesible solo desde el Security Group de la EC2.
- **Ejercicio 2 (Tema 5):** pruebas automatizadas con Jest + Supertest, sin RDS real. **`ci.yml`** ejecuta `npm ci` + `npm test` en cada push y PR a `main`. **`cd.yml`** ejecuta pruebas → imagen Docker con el SHA en GHCR → deploy en la misma EC2 → verificación de `/health` y `/libros`. Si la verificación falla, se conserva la versión anterior.

## Recursos de AWS utilizados (región `us-east-1`)


| Recurso            | Nombre / ID                                                        | Configuración                                                                                            |
| ------------------ | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| VPC                | `vpc-0472baee7872fd6dc` (por defecto)                              | EC2 y RDS en la misma VPC                                                                                |
| EC2                | `ec2-api-libros-wjg` (`i-0ca831eaa85bf0cd5`)                       | Ubuntu 24.04, `t3.micro`, Docker + Nginx                                                                 |
| Elastic IP         | `eip-api-libros-wjg` — `3.219.43.118`                              | IP pública estable de la EC2                                                                             |
| Security Group EC2 | `ec2-libros-sg` (Name `ec2-libros-sg-wjg`, `sg-0b465e9ba06a34c6e`) | **22 solo desde mi IP pública** · 80 y 443 desde Internet · sin 3000 ni 3306                             |
| RDS                | `rds-libros-wjg`                                                   | MySQL 8.4, `db.t4g.micro`, **acceso público deshabilitado**, base `db_libros`                            |
| Security Group RDS | `rds-libros-sg` (Name `rds-libros-sg-wjg`, `sg-046dc4478bb0c72dc`) | **3306 solo desde `sg-0b465e9ba06a34c6e`**                                                               |
| Secrets Manager    | `rds!db-89c38d6a-…`                                                | Contraseña maestra de RDS generada por AWS                                                               |
| IAM                | `ec2-api-libros-role`                                              | La EC2 solo puede leer el secreto de RDS                                                                 |
| IAM (OIDC)         | `github-actions-deploy-wjg`                                        | GitHub Actions (entorno `production`) solo puede abrir/cerrar el 22 en el SG de la EC2 durante el deploy |


## Endpoints


| Método | Ruta                   | Descripción                                                                   | Respuestas      |
| ------ | ---------------------- | ----------------------------------------------------------------------------- | --------------- |
| GET    | `/health`              | Estado del servicio y de la conexión a RDS, versión y commit desplegado       | 200 / 503       |
| GET    | `/libros`              | Lista de libros almacenados en RDS (paginada; filtros `q`, `autor`, `genero`) | 200             |
| GET    | `/libros/:id`          | Obtiene un libro                                                              | 200 / 400 / 404 |
| POST   | `/libros`              | Crea un libro (`titulo`, `autor` y `anio_publicacion` obligatorios)           | 201 / 400 / 409 |
| PUT    | `/libros/:id`          | Actualiza un libro                                                            | 200 / 400 / 404 |
| DELETE | `/libros/:id`          | Elimina un libro                                                              | 204 / 400 / 404 |
| PATCH  | `/libros/:id`          | Actualización parcial (extra)                                                 | 200 / 400 / 404 |
| GET    | `/libros/estadisticas` | Total, disponibles y libros por género (extra)                                | 200             |
| GET    | `/docs`                | Swagger UI (OpenAPI 3) — también `/openapi.json`                              | 200             |




También se incluye una colección de Postman: [`docs/api-libros.postman_collection.json`](./docs/api-libros.postman_collection.json).

## Cómo ejecutar la aplicación

Requisitos: Node.js 22 y un servidor MySQL o MariaDB.

```bash
cp .env.example .env              # completar con los datos de tu base MySQL (valores ficticios en el ejemplo)
mysql -h <host> -u <usuario> -p <base> < db.sql   # opcional: la API también crea la tabla al arrancar
npm ci
npm start                         # http://localhost:3000/health
```

Con Docker (la configuración de la BD se pasa por variables de entorno, no está dentro de la imagen):

```bash
docker build -t api-libros:local .
docker run -d -p 3000:3000 --env-file .env api-libros:local
curl http://localhost:3000/health
```

## Cómo ejecutar las pruebas

```bash
npm ci
npm test                                   # Jest + Supertest con un doble de la capa de datos: no requiere RDS
RUN_INTEGRATION=1 npm run test:coverage    # opcional: + integración contra un MySQL real (variables DB_* del .env)
```

## Cómo verificar el despliegue

```bash
# 1. Estado del servicio, versión y commit desplegado (debe coincidir con el último commit de main)
curl -s http://3.219.43.118/health

# 2. Consulta y CRUD contra la API pública
curl -s http://3.219.43.118/libros
curl -s -X POST http://3.219.43.118/libros -H 'Content-Type: application/json' \
  -d '{"titulo":"Cien años de soledad","autor":"Gabriel García Márquez","anio_publicacion":1967}'
curl -s -X PUT http://3.219.43.118/libros/<id> -H 'Content-Type: application/json' \
  -d '{"titulo":"Cien años de soledad","autor":"Gabriel García Márquez","anio_publicacion":1967}'
curl -s -X DELETE http://3.219.43.118/libros/<id>
```

En GitHub Actions, cada ejecución de **CD** termina con el job «4. Verificar despliegue». Ese job comprueba `/health` (incluido el SHA del commit) y `/libros` desde Internet.

## CI/CD


| Workflow                                           | Disparador                       | Trabajos                                                                          |
| -------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| [`ci.yml`](./.github/workflows/ci.yml)             | `push` y `pull_request` a `main` | `npm ci` + lint + `npm test` · integración con MySQL (extra)                      |
| [`cd.yml`](./.github/workflows/cd.yml)             | `push` a `main` (no en PR)       | 1. Pruebas → 2. Build y push a GHCR (tag = SHA) → 3. Deploy en EC2 → 4. Verificar |
| [`rollback.yml`](./.github/workflows/rollback.yml) | manual                           | Restaura una imagen anterior por su tag                                           |


## Estructura del repositorio

```
├── src/                     # Código de la API (Express 5 + mysql2)
│   ├── app.js               # /health, Swagger, manejo de errores
│   ├── routes.js            # CRUD /libros
│   ├── validation.js        # Validaciones de entrada
│   ├── repositories/        # Acceso a datos (consultas parametrizadas a RDS)
│   └── db/                  # Pool de conexiones y ejecución de db.sql
├── db.sql                   # Creación de la tabla libros
├── tests/                   # Jest + Supertest (doble de prueba + integración opcional)
├── Dockerfile               # Build multi-stage
├── .github/workflows/
│   ├── ci.yml               # npm ci + npm test en push y PR
│   ├── cd.yml               # pruebas → imagen (SHA) → deploy → verificación
│   └── rollback.yml         # Rollback manual a un tag anterior
├── deploy/                  # Configuración de Nginx y script de HTTPS
├── evidencias/              # Capturas solicitadas
├── .env.example             # Variables de entorno con valores ficticios
└── INFORME.md               # Informe paso a paso
```

## Documentación del examen

- [Ver informe con capturas y evidencias](./INFORME.md)