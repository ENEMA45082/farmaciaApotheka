# Arquitectura del backend

Este documento explica cómo viaja una petición HTTP desde el frontend hasta la base de datos y de vuelta, y qué responsabilidad tiene cada capa. El objetivo es que cualquiera que entre al código sepa dónde tiene que tocar según lo que necesite hacer.

## Resumen del flujo

```
Frontend
  │
  ▼
Middlewares globales (seguridad, logging, rate limit, CORS, parseo del body)
  │
  ▼
Enrutamiento (¿a qué recurso pertenece esta URL?)
  │
  ▼
Autenticación / autorización (¿quién es? ¿tiene permiso?)
  │
  ▼
Validación de esquema (¿el body/query tiene la forma esperada?)
  │
  ▼
Controller (traduce HTTP ↔ lógica de negocio)
  │
  ▼
Service (reglas de negocio)
  │
  ▼
Repository (acceso a la base de datos)
  │
  ▼
Base de datos (Supabase / Postgres)
```

Si algo falla en cualquier capa, la excepción no se maneja ahí mismo: "burbujea" hacia arriba con `next(err)` hasta el middleware de manejo de errores, que es el que decide qué responder al frontend.

## Punto de entrada

- **Producción (Vercel):** [api/index.ts](api/index.ts) es la función serverless. Solo re-exporta la app de Express definida en [src/app.ts](src/app.ts).
- **Local:** [src/server.ts](src/server.ts) llama `app.listen(PORT)` sobre esa misma app.

En ambos casos es la misma instancia de Express — lo único que cambia es quién la arranca.

## Capas

### 1. Middlewares globales
Se ejecutan para *toda* petición, antes de llegar a cualquier endpoint. Cada uno hace una sola cosa y le pasa la posta al siguiente. Definidos en orden en [src/app.ts](src/app.ts):

1. `helmet()` — headers de seguridad
2. `morgan('combined')` — logging de requests
3. `generalLimiter` — rate limiting general ([src/middlewares/rateLimiter.ts](src/middlewares/rateLimiter.ts))
4. `cors(...)` — valida el `Origin` contra la whitelist de `FRONTEND_URL`
5. `express.json()` — parsea el body crudo a un objeto JS

Algunas rutas sensibles (`/api/pedidos`, `/api/pagos`) llevan además un rate limiter propio más estricto, montado junto al router.

### 2. Enrutamiento
Express mira el método HTTP y la URL y decide a qué router de recurso corresponde (`/api/productos`, `/api/pedidos`, `/api/pagos`, etc.). Cada recurso tiene su propio archivo de rutas en [src/routes/](src/routes/).

### 3. Autenticación / autorización
Antes de ejecutar la acción pedida se valida *quién* hace la petición y si tiene permiso para hacerlo. Vive en [src/middlewares/auth.middleware.ts](src/middlewares/auth.middleware.ts):

- `requireAuth` — exige un header `Authorization: Bearer <token>` válido (verificado contra Supabase Auth) y cuelga el usuario en `req.user`.
- `requireAdmin` — igual que `requireAuth`, pero además exige `role === 'admin'`.
- `optionalAuth` — cuelga el usuario si hay token válido, pero no bloquea si no lo hay.

Si la validación falla, la request corta acá mismo con 401/403 y nunca llega a las capas siguientes.

### 4. Validación de esquema
[src/middlewares/validate.ts](src/middlewares/validate.ts), aplicado por ruta en cada `*.routes.ts` (ej. `validate(crearPedidoSchema)`). Los schemas viven en [src/schemas/](src/schemas/), uno por recurso, escritos con `zod`. Esta capa valida *forma* — tipos, campos requeridos, rangos, enums válidos — antes de que el `body`/`query` lleguen al controller; los DTOs de [src/types/](src/types/) son solo tipos de TypeScript (se borran en runtime), así que sin este paso un `req.body as DTO` no garantiza nada en producción. Si la validación falla, responde `400` con el detalle de qué campo está mal, vía `AppError` + `errorHandler`. Las reglas de *negocio* (ej. `puedeTransicionar` o `esMotivoCancelacionValido` en `pedidos.service.ts`) siguen viviendo en el service — el schema no las duplica, solo garantiza que lo que le llega al service tiene la forma correcta.

### 5. Controller
Vive en [src/controllers/](src/controllers/). Es el traductor entre HTTP y la lógica de la app: no toma decisiones de negocio. Su trabajo es:

- Extraer lo que vino en la request (`req.body`, `req.params`, `req.user`).
- Llamar a la función correspondiente del service.
- Con lo que devuelve el service, armar la respuesta HTTP (`res.status(...).json(...)`).
- Si el service tira una excepción, pasarla con `next(err)`.

Es intencionalmente delgado — no debería tener validaciones ni lógica de negocio.

### 6. Service
Vive en [src/services/](src/services/). Acá está el "cerebro" de la aplicación: las reglas de negocio. Por ejemplo:

- Validaciones (ej: "el pedido debe tener al menos un producto", lanzando `AppError`).
- Orquestación de varios repositorios y/o servicios que dependen entre sí (ej: crear el pedido y después descontar stock, o disparar la facturación).
- **Precios**: cualquier monto que termine cobrándose o facturándose (`pedido.total`, `detalle.precio_unitario`) se recalcula acá contra el catálogo (`productosRepo.encontrarPorId`) — nunca se confía en un precio que venga en el body de la request. Ver `pedidos.service.ts::crear`.
- **Ownership**: cuando un repository trae un recurso por ID sin filtrar por `user_id` en la query (porque esa misma función también la usan flujos admin, ej. `pedidosRepo.encontrarPorId`), el service es responsable de confirmar la pertenencia con [`asegurarPropietario`](src/utils/ownership.ts) antes de devolver el recurso. Cuando el repository puede filtrar directamente por `user_id` en la query (como ya hacen `direcciones.repository.ts`, `favoritos.repository.ts`, `perfil.repository.ts`), ese es el patrón preferido — es una capa de seguridad más, no depende de que el service se acuerde de chequear después.

### 7. Repository
Vive en [src/repositories/](src/repositories/). Es la única capa que sabe hablar con la base de datos (Supabase, ver [src/config/supabase.ts](src/config/supabase.ts)). Traduce lo que pide el service en consultas concretas, y mapea las filas crudas que devuelve la base a los tipos de dominio de la app (ver [src/types/](src/types/)).

> **Nota sobre RLS:** la app se conecta a Supabase con la `SERVICE_ROLE_KEY`, que ignora Row Level Security por diseño. Eso significa que la única barrera entre "el usuario A ve un recurso del usuario B" es el código de arriba (filtro en la query o `asegurarPropietario`) — no hay red de seguridad a nivel de base de datos. Si se agrega un endpoint nuevo que expone un recurso de usuario, hay que aplicar uno de los dos patrones explícitamente.

### 8. Manejo de errores
[src/middlewares/errorHandler.ts](src/middlewares/errorHandler.ts), montado al final de todos los middlewares en `app.ts`. Si el error es un `AppError` ([src/errors/AppError.ts](src/errors/AppError.ts)) responde con el status y mensaje que definió la capa que lo lanzó; si es cualquier otro error no controlado, lo loguea y responde 500 genérico sin filtrar detalles internos.

## Ejemplo real: `POST /api/pedidos`

Para ver las capas aplicadas de punta a punta:

1. Middlewares globales (`app.ts`) + `pedidosLimiter`.
2. Router: [src/routes/pedidos.routes.ts](src/routes/pedidos.routes.ts) → `router.post('/', requireAuth, validate(crearPedidoSchema), pedidosController.crear)`.
3. Auth: `requireAuth` valida el token contra Supabase y setea `req.user`.
4. Validación: `validate(crearPedidoSchema)` ([src/schemas/pedidos.schema.ts](src/schemas/pedidos.schema.ts)) rechaza con 400 si `items` viene vacío, `cantidad` no es un entero positivo, `metodo_envio`/`metodo_pago` no son un valor válido, etc.
5. Controller: [src/controllers/pedidos.controller.ts](src/controllers/pedidos.controller.ts) función `crear` — toma `req.user.id` y `req.body`, llama a `pedidosService.crear(...)`.
6. Service: [src/services/pedidos.service.ts](src/services/pedidos.service.ts) función `crear` — valida stock consultando `productosRepo`, y ahí mismo recalcula `precio_unitario`/`precio_lista` de cada item contra `producto.precio`/`precio_oferta` (ignorando lo que haya mandado el cliente), llama a `pedidosRepo.crear(...)` y después descuenta stock.
7. Repository: [src/repositories/pedidos.repository.ts](src/repositories/pedidos.repository.ts) — hace el insert en Supabase (vía RPC atómica `crear_pedido_completo`) y mapea la fila resultante a un objeto `Pedido`.
8. La respuesta sube repository → service → controller → `res.status(201).json(pedido)`.
9. Si algo falla (ej. stock insuficiente), el service lanza `AppError('Stock insuficiente...', 400)`, el controller lo pasa con `next(err)`, y `errorHandler` responde `{ error, statusCode: 400 }`.

## Por qué está separado así

Cada capa tiene una sola responsabilidad y no le importa cómo funcionan las demás: el controller no sabe de SQL, el repository no sabe de reglas de negocio, y el service no sabe de HTTP. Esto facilita testear cada parte por separado (ver los `*.test.ts` junto a varios services/repositories/utils) y cambiar una capa sin romper las otras — por ejemplo, si mañana cambia el motor de base de datos, en teoría solo se toca la capa de repository.
