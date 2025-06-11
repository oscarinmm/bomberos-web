# Sistema en línea para compañía de bomberos

Este proyecto implementa un servidor HTTP básico en Node.js sin dependencias externas. Permite registrar usuarios con roles de **voluntario**, **oficial** o **admin** y actualizar el estado de disponibilidad de los voluntarios en tiempo real mediante Server‑Sent Events (SSE).

## Requisitos

- Node.js 18 o superior (por incluir `EventSource` en los navegadores).

## Uso

1. Clonar el repositorio y ubicarse en la carpeta.
2. Ejecutar el servidor:
   ```bash
   npm start
   ```
3. Abrir en un navegador `http://localhost:3000`.

## Funcionalidades

- Registro y login de usuarios por rol.
- Los voluntarios pueden indicar si están **en casa disponibles**, **en camino** o **no disponibles**.
- Los oficiales y administradores visualizan en tiempo real el listado de voluntarios y su estado.

Los datos se mantienen en memoria mientras el servidor está ejecutándose; no se persisten a disco.
