# Contrato de autenticación

El panel privado no implementa inicio de sesión propio: delega la identidad en un
servicio externo compatible con este contrato. El formulario público, en cambio,
no requiere autenticación.

La integración vive en `server/middleware/authenticate.ts`. Si usás otro sistema
de identidad, adaptá ese archivo o implementá un servicio compatible.

## Variables

| Variable | Uso |
| --- | --- |
| `AUTH_URL` | Origen del servicio de auth, sin barra final. |
| `AUTH_APP_SLUG` | Identificador de esta aplicación dentro del servicio de auth. Por defecto, `forms`. |
| `AUTH_ALLOWED_ROLES` | Roles con acceso al panel, separados por coma. Por defecto, `docente,admin`. |
| `PUBLIC_ORIGIN` | Origen público de esta aplicación. Se usa para construir la URL de login y validar el origen de las escrituras. |

## Verificación de acceso

En cada petición privada el backend llama a:

```http
GET {AUTH_URL}/api/access/check?app={AUTH_APP_SLUG}
Cookie: <cookies recibidas del navegador>
```

Reglas:

- Se reenvía el encabezado `Cookie` tal cual llega.
- Se acepta cualquier respuesta `2xx` con JSON.
- Los encabezados `Set-Cookie` de la respuesta se reenvían al navegador.
- Si el servicio no responde o devuelve un estado no exitoso en 10 segundos, la
  API responde `503`.
- No se siguen redirecciones.

Respuesta esperada:

```json
{
  "authenticated": true,
  "allowed": true,
  "user": {
    "id": "usuario-123",
    "role": "docente",
    "plan": "pro",
    "name": "Nombre visible"
  }
}
```

| Campo | Uso |
| --- | --- |
| `authenticated` | Si es `false`, la API responde `401` con `{ "error", "login" }`, donde `login` es `{AUTH_URL}/login?redirect={PUBLIC_ORIGIN}/`. |
| `allowed` | Si es `false`, la API responde `403`. |
| `user.id` | Identificador estable del creador. Es obligatorio. |
| `user.role` | Debe pertenecer a `AUTH_ALLOWED_ROLES`. |
| `user.plan` | Define la cuota de almacenamiento. |
| `user.name` | Se muestra en el panel. |

Cada acceso actualiza el propietario en la base local y su cuota:

| Plan | Cuota |
| --- | --- |
| `pro` | 5 GB |
| `plus` | 1 GB |
| Cualquier otro | 250 MB |

Las cuotas se calculan en bytes decimales. La cuota no habilita ni bloquea el
acceso: eso lo decide `allowed` junto con el rol.

## Pruebas locales

Las pruebas de `tests/api.test.ts` sustituyen este servicio por un doble local,
por lo que no necesitás un auth real para ejecutar `pnpm test`. Para probar el
panel en desarrollo necesitás un servicio accesible desde tu máquina cuyas
cookies funcionen en `localhost`.
