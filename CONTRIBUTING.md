# Cómo contribuir

Gracias por tu interés. Este documento resume cómo preparar el entorno, qué
convenciones sigue el código y cómo proponer cambios.

## Entorno

- Node.js 26.13.1 (ver `.node-version`)
- pnpm 12.18.0
- PostgreSQL 17

```bash
pnpm install --frozen-lockfile
cp .env.example .env
```

En Windows, usá `Copy-Item .env.example .env`. Completá `DATABASE_URL`,
`PUBLIC_ORIGIN` y `AUTH_URL`. Para levantar el proyecto:

```bash
pnpm dev:api
```

```bash
pnpm dev
```

El contrato del servicio de autenticación está en
[docs/auth.md](docs/auth.md). Las pruebas no necesitan un auth real.

## Antes de abrir un pull request

```bash
pnpm build
pnpm test
```

`pnpm build` verifica TypeScript y compila el frontend. `pnpm test` ejecuta el
dominio y las regresiones HTTP.

## Convenciones

- Mantené el código y los mensajes existentes en español.
- Respetá las capas descritas en [docs/architecture.md](docs/architecture.md):
  las rutas no contienen lógica de negocio y los servicios no reciben `Request`
  ni `Response`.
- Mantené `shared/` libre de React, Express, red y base de datos.
- Preferí dependencias explícitas y módulos concretos.
- Agregá o actualizá pruebas cuando cambie comportamiento.
- Cuidá la accesibilidad: controles nativos, etiquetas, foco visible y soporte
  de movimiento reducido.
- No incluyas secretos, credenciales ni archivos `.env` en los cambios.

## Commits

Usá mensajes concisos en imperativo y, si es posible, el formato de commits
convencionales:

```text
feat: agregar exportación de resultados filtrados
fix: evitar respuestas duplicadas al reenviar
docs: documentar el contrato de autenticación
refactor: separar la limpieza de archivos en un servicio
```

## Pull requests

- Describí el problema y la solución.
- Indicá cómo probaste el cambio.
- Mantené el alcance acotado; separá refactors grandes de cambios funcionales.
- Actualizá la documentación si cambian variables, contratos o endpoints.
- Vinculá el issue relacionado cuando exista.

## Reportes

Los errores y las propuestas se pueden abrir como issues. Para vulnerabilidades,
seguí [SECURITY.md](SECURITY.md) en lugar de abrir un issue público.

Al participar, aceptás el [Código de conducta](CODE_OF_CONDUCT.md).
