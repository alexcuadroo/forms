# EduAlex Forms

## Dokploy

Creá una aplicación Docker Compose desde este directorio y seleccioná `docker-compose.yml`. Configurá `POSTGRES_PASSWORD` con una contraseña aleatoria y desplegá. En Domains, asociá `forms.edualex.uy` al servicio `form_app`, puerto interno 3000, con HTTPS. Apuntá el DNS al servidor. El chequeo `GET /api/health` verifica la conexión a PostgreSQL.

En el panel central de auth registrá la aplicación con slug `form`, URL `https://forms.edualex.uy` y rol permitido `docente`. El backend revalida la sesión y el plan en cada petición privada. El rol admin central también tiene acceso. Los visitantes entran desde el enlace de cuatro caracteres.

Los volúmenes `postgres` y `uploads` deben conservarse entre despliegues. Para comprobar persistencia, publicá un formulario con archivo, enviá una respuesta, reiniciá ambos servicios y abrí el adjunto desde Resultados. Respaldá ambos volúmenes de forma coordinada.

## Desarrollo

Usá Node 26.13.0 y pnpm 12.18.0. Ejecutá `pnpm install --frozen-lockfile`, `pnpm build` y `pnpm start`. Para desarrollo con recarga, ejecutá también `pnpm dev` y usá el puerto de Vite. `pnpm test` corre las pruebas de lógica.

| Variable | Uso |
| --- | --- |
| PUBLIC_ORIGIN | Origen externo exacto, sin barra final. En desarrollo usar el origen de Vite o del servidor según corresponda. |
| AUTH_URL | Origen de auth central. Por defecto https://auth.edualex.uy. Para pruebas locales usar una instancia accesible con cookies compatibles con el host local. |
| DATABASE_URL | Cadena PostgreSQL para ejecución directa. Compose utiliza PGHOST, PGDATABASE, PGUSER y PGPASSWORD. |
| PORT | Puerto de Express, 3000 por defecto. |
| UPLOAD_DIR | Directorio persistente de archivos, por defecto uploads. |

Cada publicación crea una versión. Los envíos iniciados antes de una edición pueden completar su versión mientras el formulario siga abierto. Se aceptan imágenes JPEG, PNG, GIF, WebP y AVIF, video MP4, WebM y MOV, PDF, Office Open XML, OpenDocument y texto UTF-8. Las cuotas y el límite de 10 MB se calculan en bytes decimales. Las cargas sin asociar vencen a las 24 horas. La cuota de un creador se actualiza cuando auth central devuelve su plan al acceder al panel.
