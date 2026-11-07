# EduForms

## Dokploy

Creá una aplicación Docker Compose desde el repositorio y seleccioná `docker-compose.yml`. Configurá dos contraseñas aleatorias y distintas en Dokploy. `POSTGRES_PASSWORD` corresponde al administrador de PostgreSQL y `FORMS_DB_PASSWORD` al usuario del backend. En Domains, asociá `forms.edualex.uy` al servicio `form_app`, puerto interno 3000, con HTTPS. Apuntá el DNS al servidor. El healthcheck de la imagen consulta `GET /api/health` y verifica la conexión a PostgreSQL.

Para actualizar un despliegue existente, conservá los volúmenes y el valor actual de `POSTGRES_PASSWORD`, agregá `FORMS_DB_PASSWORD` y redesplegá. El servicio `form_db_setup` prepara el rol `forms_app` y le transfiere las tablas existentes en una transacción. El backend arranca cuando ese servicio termina correctamente. Para rotar la clave del backend, cambiá `FORMS_DB_PASSWORD` y volvé a desplegar el Compose.

En el panel central de auth registrá la aplicación con slug `forms`, URL `https://forms.edualex.uy` y rol permitido `docente`. Agregá también `https://forms.edualex.uy` a `TRUSTED_ORIGINS` del servicio central. El backend revalida la sesión y el acceso en cada petición privada: pueden entrar docentes de cualquier plan y administradores. El plan solo determina la cuota de almacenamiento; no concede ni bloquea el acceso. Los visitantes entran desde el enlace de cuatro caracteres.

Los volúmenes `postgres` y `uploads` deben conservarse entre despliegues. Para comprobar persistencia, publicá un formulario con archivo, enviá una respuesta, reiniciá ambos servicios y abrí el adjunto desde Resultados. Respaldá ambos volúmenes de forma coordinada.

## Desarrollo

Usá Node 26.13.0 y pnpm 12.18.0. Ejecutá `pnpm install --frozen-lockfile`. Para desarrollo, iniciá `pnpm dev:api` y `pnpm dev` en dos terminales y abrí el puerto de Vite. Ambos procesos recargan los cambios. Para servir la compilación de producción, ejecutá `pnpm build` y `pnpm start`. `pnpm test` corre las pruebas de lógica.

| Variable | Uso |
| --- | --- |
| PUBLIC_ORIGIN | Origen externo exacto, sin barra final. En desarrollo usar el origen de Vite o del servidor según corresponda. |
| AUTH_URL | Origen de auth central. Por defecto https://auth.edualex.uy. Para pruebas locales usar una instancia accesible con cookies compatibles con el host local. |
| DATABASE_URL | Cadena PostgreSQL para ejecución directa. Compose utiliza PGHOST, PGDATABASE, PGUSER y PGPASSWORD. |
| PORT | Puerto de Express, 3000 por defecto. |
| UPLOAD_DIR | Directorio persistente de archivos, por defecto uploads. |

Cada publicación crea una versión. Los envíos iniciados antes de una edición pueden completar su versión mientras el formulario siga abierto. Se aceptan imágenes JPEG, PNG, GIF, WebP y AVIF, video MP4, WebM y MOV, PDF, Office Open XML, OpenDocument y texto UTF-8. Las cuotas y el límite de 10 MB se calculan en bytes decimales. Las cargas sin asociar vencen a las 24 horas. La cuota de un creador se actualiza cuando auth central devuelve su plan al acceder al panel.
