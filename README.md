# Forms

Creador de formularios autoalojado. Permite construir formularios con preguntas
condicionales, archivos adjuntos, temas visuales y resultados exportables.

El proyecto incluye el frontend React y la API Express en un solo paquete, con
tipos y validación compartidos entre ambos. La arquitectura se describe en
[docs/architecture.md](docs/architecture.md).

## Características

- Editor de preguntas con texto, opciones, archivos y reglas de visibilidad.
- Publicación versionada: cada publicación crea una versión inmutable.
- Enlaces públicos cortos para responder, con cierre y reapertura.
- Resultados por versión y exportación a CSV.
- Adjuntos con validación de tipo real, límite de 10 MB y cuotas por creador.
- Temas con color, tipografía, imagen de fondo y contraste automático.
- Interfaz accesible, con foco gestionado y soporte de movimiento reducido.
- Fichas digitales importadas desde DeCabeza, con ejercicios interactivos, entregas identificadas y corrección por versión.

## Stack

- [Node.js](https://nodejs.org/) 26.13.1 y [pnpm](https://pnpm.io/) 12.18.0
- [React](https://react.dev/) 19, [Vite](https://vite.dev/) y TypeScript
- [Express](https://expressjs.com/) 5 y PostgreSQL 17
- Pruebas con el runner nativo de Node

## Requisitos

- Node.js 26.13.1 (ver `.node-version`)
- pnpm 12.18.0
- PostgreSQL 17 accesible

## Puesta en marcha

```bash
pnpm install --frozen-lockfile
cp .env.example .env
```

En Windows, usá `Copy-Item .env.example .env` en lugar de `cp`.

Editá `.env` y ajustá como mínimo:

- `DATABASE_URL`: conexión a tu PostgreSQL local.
- `PUBLIC_ORIGIN`: origen desde el que abrís la aplicación.
- `AUTH_URL`: servicio de autenticación para el panel privado.

Iniciá la API y Vite en dos terminales:

```bash
pnpm dev:api
```

```bash
pnpm dev
```

Abrí `http://localhost:5173`. La API escucha en `http://localhost:3000` y Vite
redirige `/api` hacia ella. Las migraciones se aplican al arrancar la API.

El panel privado necesita un servicio compatible con el
[contrato de autenticación](docs/auth.md). El formulario público funciona sin
auth: se accede desde `http://localhost:5173/<slug>`.

## Scripts

| Comando | Uso |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo de Vite. |
| `pnpm dev:api` | API con recarga automática. |
| `pnpm build` | Verifica TypeScript y compila el frontend. |
| `pnpm start` | Sirve la compilación de producción con Express. |
| `pnpm test` | Ejecuta las pruebas del dominio y de la API. |

Para servir producción localmente, ejecutá `pnpm build` y luego `pnpm start`.

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `PUBLIC_ORIGIN` | Origen público exacto, sin barra final. Se usa para validar el origen de las escrituras y construir la URL de login. |
| `PORT` | Puerto de Express. Por defecto, `3000`. |
| `UPLOAD_DIR` | Directorio persistente de archivos. Por defecto, `uploads`. |
| `AUTH_URL` | Origen del servicio de autenticación, sin barra final. |
| `AUTH_APP_SLUG` | Identificador de la aplicación en el servicio de auth. Por defecto, `forms`. |
| `AUTH_ALLOWED_ROLES` | Roles con acceso al panel, separados por coma. Por defecto, `docente,admin`. |
| `FORMS_IMPORT_SECRET` | Secreto compartido con el backend de DeCabeza para habilitar la importación de fichas. |
| `DATABASE_URL` | Cadena de conexión de PostgreSQL para ejecución directa. |
| `VITE_APP_NAME` | Nombre visible del producto. Por defecto, `Forms`. Se aplica al compilar el frontend. |
| `POSTGRES_PASSWORD` | Contraseña del administrador de PostgreSQL en Compose. |
| `FORMS_DB_PASSWORD` | Contraseña del usuario de la aplicación en Compose. |

No subas archivos `.env` al repositorio: están incluidos en `.gitignore`.
Usá `.env.example` como plantilla.

## Autenticación

El panel privado revalida la sesión y el acceso contra un servicio externo en
cada petición. El contrato completo, los roles, los planes y las cuotas están en
[docs/auth.md](docs/auth.md).

## Despliegue con Docker Compose

`docker-compose.yml` levanta la aplicación, PostgreSQL y un servicio de
preparación del rol de base de datos. Antes de desplegar definí, como mínimo:

```bash
PUBLIC_ORIGIN=https://forms.example.com
AUTH_URL=https://auth.example.com
POSTGRES_PASSWORD=<contraseña aleatoria>
FORMS_DB_PASSWORD=<otra contraseña aleatoria>
```

Luego:

```bash
docker compose up -d --build
```

Publicá el puerto interno `3000` del servicio `form_app` a través de tu proxy con
HTTPS. El healthcheck consulta `GET /api/health` y verifica la conexión a
PostgreSQL. Conservá los volúmenes `postgres` y `uploads` entre despliegues y
respaldalos de forma coordinada.

Para actualizar un despliegue existente, conservá `POSTGRES_PASSWORD` y los
volúmenes. `form_db_setup` crea o actualiza el rol `forms_app` y le transfiere
las tablas existentes en una transacción. Para rotar la clave del backend,
cambiá `FORMS_DB_PASSWORD` y volvé a desplegar.

## Pruebas

```bash
pnpm test
```

Las pruebas de API sustituyen PostgreSQL y el servicio de auth por dobles
locales. Recorren las capas reales de la API, pero no reemplazan una prueba de
integración con PostgreSQL ni con un auth real.

## Estructura

```text
src/       Frontend React por funcionalidades
server/    API Express por capas
shared/    Dominio puro compartido
tests/     Pruebas de dominio y regresiones HTTP
docs/      Arquitectura y contrato de auth
docker/    Preparación de PostgreSQL
```

## Contribuir

Leé [CONTRIBUTING.md](CONTRIBUTING.md) antes de abrir un cambio. Para reportar
vulnerabilidades, seguí [SECURITY.md](SECURITY.md).

## Licencia

[MIT](LICENSE)
