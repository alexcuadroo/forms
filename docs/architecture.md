# Arquitectura

El proyecto mantiene un solo paquete y dos aplicaciones: React en el navegador
y Express en el servidor. `shared/` contiene el dominio puro que ambas usan.

```text
src/                         Frontend
  main.tsx                   Monta React, aplica el nombre y carga los estilos
  config.ts                  Nombre visible del producto
  App.tsx                    Selecciona panel o formulario público
  api/client.ts              Transporte HTTP y cargas binarias
  models/forms.ts            Tipos del cliente
  components/                Componentes compartidos
  hooks/                     Carga de recursos y cancelación
  features/
    dashboard/               Biblioteca, acciones y filas
    editor/                  Edición, diseño, medios y condiciones
    runner/                  Vista pública, navegación y envío
    results/                 Resultados, adjuntos y exportación CSV
  styles/                    Estilos por responsabilidad
  utils/                     Utilidades pequeñas
server/                      API
  index.ts                   Migraciones, limpieza periódica y escucha
  config.ts                  Origen público, auth y roles permitidos
  app.ts                     Compone Express sin iniciar procesos
  routes/                    Métodos, URL y middleware de cada ruta
  controllers/               Traduce HTTP a llamadas y respuestas
  middleware/                Autenticación, origen y errores
  services/                  Casos de uso y límites transaccionales
  repositories/              Consultas y persistencia de datos
  models/                    Entidades del servidor
  database/                  Pool, transacciones, locks y migración
  storage/                   Configuración de archivos y formatos
shared/forms.ts              Tipos, validación y reglas de formularios
tests/                       Dominio y regresiones HTTP
docker/                      Preparación de PostgreSQL
```

## Flujo de una petición

`ruta → middleware → controlador → servicio → repositorio → PostgreSQL`.
Los controladores manejan parámetros, estados HTTP y respuestas. Los servicios
reciben valores y contratos explícitos, sin `Request` ni `Response` de Express.
Los repositorios encapsulan SQL; las transacciones se coordinan en los servicios
para conservar bloqueos, revisión de cambios, cuotas e idempotencia.

En React se usa la separación natural del framework: componentes para la vista,
hooks para estado y acciones, y un cliente HTTP independiente. Los tipos no
ejecutan peticiones. Cada funcionalidad conserva sus componentes y utilidades
cerca del código que los usa; los elementos compartidos viven fuera de ella.

## Criterios para ampliar

- Agregar una operación de API en su ruta, controlador, servicio y repositorio
  correspondientes; no agregar lógica de negocio en `app.ts`.
- Extraer un componente o hook cuando aparece otra responsabilidad. El tamaño
  sirve como señal: revisar los archivos que se acerquen a 250–300 líneas.
- Mantener `shared/` libre de React, Express, red y base de datos.
- Importar módulos concretos para que las dependencias sean visibles.
- Conservar los estilos ordenados desde `src/styles/index.css`: el orden mantiene
  la cascada existente.
- Las migraciones y tareas periódicas pertenecen a `server/index.ts`. Importar
  `createApp()` en una prueba no abre puertos ni modifica una base de datos.

## Estado y efectos en el cliente

Los valores calculables se derivan al renderizar: preguntas visibles, filtros,
estado ocupado y progreso. Las acciones de guardar, subir, enviar y navegar
viven en los hooks de su funcionalidad y se disparan desde eventos.
Los bloqueos con refs evitan duplicar operaciones antes del siguiente render.

Hay tres efectos con una responsabilidad externa concreta: `useResource`
sincroniza la petición y cancela al cambiar de recurso; `useRunner` mueve el
foco al cambiar de paso; `DecisionDialog` abre y cierra el diálogo nativo.
No se usan efectos para copiar props ni para recalcular estado derivado.
`useResource` asocia datos y errores a su petición, para que un cambio de URL
o una recarga nunca muestre el resultado anterior.

`AnswerInput` presenta los controles nativos y su semántica; `Runner` presenta
el recorrido; `useRunner` coordina respuestas, validación, archivos y envío.
El formulario público se reinicia por slug y versión, sin copiar props a estado.

## Movimiento y ciclo de vida

Las entradas de preguntas y la confirmación usan sólo opacidad y transformaciones,
activadas con `prefers-reduced-motion: no-preference`. No hay temporizadores de
animación ni lógica de negocio esperando eventos de animación. El contenido
queda visible aunque el navegador no reproduzca las animaciones.

En el servidor, la limpieza espera a que termine una ejecución antes de programar
la siguiente. SIGTERM y SIGINT dejan de aceptar conexiones, drenan las peticiones
y cierran el pool; hay un límite de diez segundos para el cierre.

## Alcance de la verificación

`pnpm build` comprueba TypeScript y compila el frontend. `pnpm test` ejecuta las
pruebas del dominio y las regresiones HTTP. Estas últimas sustituyen PostgreSQL
y auth central por dobles locales; recorren las capas reales de la API, pero no
reemplazan una prueba de integración con PostgreSQL y el servicio de auth real.

La reorganización conserva las URL públicas y privadas, el esquema de datos,
las variables de entorno y los comandos de desarrollo y despliegue. El punto
de entrada de producción es `server/index.ts`, también actualizado en Docker.
