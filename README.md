# Consola de actas de entrega

Front de administración para consultar las actas firmadas desde los dispositivos y ver los
PDF guardados. React + Vite + TypeScript.

El API vive aparte, en el repositorio `firma-digital-api`.

## Correr en local

```bash
npm install
npm run dev
```

Queda en <http://localhost:5173>.

Vite reenvía todo lo que empiece por `/api` al servidor indicado en `VITE_API_PROXY` (archivo
`.env`). Por defecto es el API publicado en Azure, así que la consola funciona sin levantar
nada más. Para trabajar contra el API local, apunta esa variable a `http://localhost:5234`.

## Entrar

Las credenciales son usuarios de ASP.NET Identity guardados en la base del API. Si todavía no
existe ninguno, se crea el primero con la llave de administrador:

```bash
curl -X POST "$VITE_API_PROXY/api/v1/cuenta/register" \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: <llave de administrador>" \
  -d '{"email":"tu@correo.com","password":"UnaClaveLarga123!"}'
```

De ahí en adelante, cualquier usuario con sesión puede dar de alta a otros desde ese mismo
endpoint.

## Qué hace

- **Listado** con búsqueda por cédula, nombre, IMEI o device id; filtros por rango de fechas y
  por estado de sincronización; paginación.
- **Detalle** con los datos del acta, la firma manuscrita y el PDF embebido.
- **Reintento de sincronización** con MobiControl para las actas que quedaron en error.

Los archivos protegidos (PDF y firma) se descargan con el token en la cabecera y se muestran
desde memoria, para no dejar credenciales escritas en la URL.

## Compilar

```bash
npm run build
```

Deja el resultado en `dist/`. Hoy no se despliega en ningún lado: si más adelante quieres
publicarlo, el API ya sirve archivos estáticos y hace fallback a `index.html`, así que basta
con copiar el contenido de `dist/` dentro de su `wwwroot`.
