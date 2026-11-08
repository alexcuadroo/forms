# Arquitectura

El proyecto mantiene un solo paquete y dos aplicaciones: React en el navegador
y Express en el servidor. `shared/` contiene el dominio puro que ambas usan.

```text
src/                         Frontend
  main.tsx                   Monta React y carga los estilos
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

## Verificación

`pnpm build` comprueba TypeScript y compila el frontend. `pnpm test` ejecuta las
pruebas del dominio y las regresiones HTTP. Estas últimas sustituyen PostgreSQL
y auth central por dobles locales; recorren las capas reales de la API, pero no
reemplazan una prueba de integración con PostgreSQL y el servicio de auth real.

La reorganización conserva las URL públicas y privadas, el esquema de datos,
las variables de entorno y los comandos de desarrollo y despliegue. El punto
de entrada de producción es `server/index.ts`, también actualizado en Docker.
