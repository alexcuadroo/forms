# Política de seguridad

## Versiones soportadas

Se aplican correcciones sobre la rama principal y la última versión publicada.

## Reportar una vulnerabilidad

No abras un issue público. Usá la opción **Report a vulnerability** de la
pestaña **Security** del repositorio en GitHub para enviar un reporte privado.

Incluí, si es posible:

- Versión o commit afectado.
- Pasos para reproducir el problema.
- Impacto esperado.
- Una prueba de concepto mínima.
- Cualquier mitigación que hayas identificado.

Confirmaremos la recepción y coordinaremos la divulgación. No publiques detalles
antes de que exista una corrección o una fecha acordada.

## Alcance

Interesan especialmente:

- Evasión de autenticación o de la validación de origen.
- Acceso a formularios, respuestas o adjuntos de otro creador.
- Inyección SQL o ejecución remota de código.
- Cargas que evadan la validación de tipo o el límite de tamaño.
- Exposición de secretos o variables de entorno.

## Buenas prácticas para despliegues

- No versiones archivos `.env` ni credenciales.
- Usá contraseñas aleatorias y distintas para `POSTGRES_PASSWORD` y
  `FORMS_DB_PASSWORD`.
- Serví la aplicación detrás de HTTPS.
- Mantené actualizados Node.js, PostgreSQL y las dependencias.
- Respaldá los volúmenes `postgres` y `uploads` de forma coordinada.
- Si sospechás que una credencial se expuso, rotala y revisá los accesos.
