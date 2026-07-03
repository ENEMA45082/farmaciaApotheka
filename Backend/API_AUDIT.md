# Auditoría de API — Farmacia Apotheka Backend

> Revisión realizada el 28/06/2026. Analizados: rutas, controladores, servicios, repositorios, middlewares y tipos.

---

## Tabla de Endpoints

| # | Módulo | Método | Ruta | Auth | Descripción |
|---|--------|--------|------|------|-------------|
| 1 | Sistema | `GET` | `/health` | Ninguna | Estado del servidor |
| 2 | Productos | `GET` | `/api/productos` | Ninguna | Listar productos con filtros y paginación |
| 3 | Productos | `GET` | `/api/productos/:id` | Ninguna | Obtener producto por ID |
| 4 | Productos | `POST` | `/api/productos` | Admin | Crear producto |
| 5 | Productos | `PUT` | `/api/productos/:id` | Admin | Actualizar producto |
| 6 | Productos | `DELETE` | `/api/productos/:id` | Admin | Eliminar producto — responde 204 |
| 7 | Productos | `POST` | `/api/productos/preview-importar-precios` | Admin | Previsualizar actualización de precios desde CSV |
| 8 | Productos | `POST` | `/api/productos/confirmar-importar-precios` | Admin | Aplicar actualización de precios desde CSV |
| 9 | Categorías | `GET` | `/api/categorias` | Ninguna | Listar categorías (lista plana) |
| 10 | Categorías | `GET` | `/api/categorias/arbol` | Ninguna | Árbol jerárquico de categorías |
| 11 | Categorías | `GET` | `/api/categorias/:id` | Ninguna | Obtener categoría por ID |
| 12 | Categorías | `POST` | `/api/categorias` | Admin | Crear categoría |
| 13 | Categorías | `PUT` | `/api/categorias/:id` | Admin | Actualizar categoría |
| 14 | Categorías | `DELETE` | `/api/categorias/:id` | Admin | Eliminar categoría — responde 204 |
| 15 | Uploads | `POST` | `/api/uploads` | Admin | Subir imágenes (máx. 5 archivos, 5 MB c/u) |
| 16 | Estadísticas | `GET` | `/api/estadisticas` | Admin | Dashboard de inventario y ventas |
| 17 | Perfil | `GET` | `/api/perfil` | Usuario | Obtener perfil del usuario autenticado |
| 18 | Perfil | `PUT` | `/api/perfil` | Usuario | Actualizar perfil |
| 19 | Pedidos | `POST` | `/api/pedidos` | Usuario | Crear pedido (descuenta stock) |
| 20 | Pedidos | `GET` | `/api/pedidos` | Usuario | Listar pedidos propios |
| 21 | Pedidos | `GET` | `/api/pedidos/:id` | Usuario | Detalle de pedido (verifica dueño) |
| 22 | Pedidos | `PATCH` | `/api/pedidos/:id/cancelar` | Usuario | Cancelar pedido propio (restaura stock) |
| 23 | Pedidos | `GET` | `/api/pedidos/admin` | Admin | Listar todos los pedidos |
| 24 | Pedidos | `PATCH` | `/api/pedidos/:id/estado` | Admin | Cambiar estado del pedido |
| 25 | Direcciones | `GET` | `/api/direcciones` | Usuario | Obtener dirección del usuario |
| 26 | Direcciones | `PUT` | `/api/direcciones` | Usuario | Crear o actualizar dirección (upsert) |
| 27 | Favoritos | `GET` | `/api/favoritos` | Usuario | Listar IDs de productos favoritos |
| 28 | Favoritos | `POST` | `/api/favoritos/:productoId` | Usuario | Toggle favorito (agrega o quita) |
| 29 | Envío | `POST` | `/api/envio/cotizar` | Usuario | Cotizar envío via Andreani |
| 30 | Envío | `GET` | `/api/envio/sucursales` | Usuario | Listar sucursales Andreani por código postal |
| 31 | Pagos | `POST` | `/api/pagos/pagar` | Usuario | Pago directo con token Payway |
| 32 | Pagos | `POST` | `/api/pagos/checkout` | Usuario | Generar URL de hosted checkout Payway |
| 33 | Pagos | `POST` | `/api/pagos/notificacion` | Ninguna | Webhook de notificaciones Payway |

### Filtros disponibles en `GET /api/productos`

| Query Param | Tipo | Descripción |
|-------------|------|-------------|
| `categoria` | string | ID de categoría (incluye descendientes) |
| `busqueda` | string | Texto libre en nombre o categoría |
| `codigo_barras` | string | Búsqueda por código de barras |
| `en_oferta` | boolean | Solo productos en oferta |
| `precio_min` / `precio_max` | number | Rango de precios |
| `stock_min` / `stock_max` | number | Rango de stock |
| `vencimiento_desde` / `vencimiento_hasta` | string (ISO) | Rango de fechas de vencimiento |
| `pagina` | number | Página actual (default: 1) |
| `limite` | number | Ítems por página (default: 12, máx: 50) |
| `ordenar` | string | `nombre_asc`, `nombre_desc`, `precio_asc`, `precio_desc` |

---

## Análisis Crítico

### Resumen ejecutivo

La arquitectura general está bien pensada para el tamaño del proyecto: separación clara en capas (rutas → controladores → servicios → repositorios), manejo centralizado de errores, y autenticación basada en JWT de Supabase. Sin embargo, hay problemas que en producción real pueden generar datos inconsistentes, pérdida de dinero, o comportamientos silenciosos que son difíciles de debuggear.

---

## Problemas Críticos

### C1 — `ErrorServicio` vive en el lugar equivocado

**Archivo:** `src/services/productos.service.ts:14`

```typescript
// productos.service.ts — clase de error de infraestructura mezclada con lógica de negocio
export class ErrorServicio extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'ErrorServicio';
  }
}
```

**Archivos que la importan de productos.service.ts:**
- `src/middlewares/errorHandler.ts`
- `src/controllers/pagos.controller.ts`
- `src/services/categorias.service.ts`
- `src/services/pedidos.service.ts`
- (y todos los demás servicios)

**Problema:** `ErrorServicio` es una utilidad de infraestructura que no tiene nada que ver con productos. Que todos los módulos importen desde `productos.service.ts` crea un acoplamiento indirecto: si mañana refactorizás o eliminás ese archivo, rompés el manejo de errores de toda la app. El nombre tampoco ayuda — "ErrorServicio" no dice qué tipo de error es.

**Fix:**
```
src/errors/AppError.ts   ← mover la clase acá, renombrarla AppError o HttpError
```

---

### C2 — Pedidos se crean sin transacción de base de datos

**Archivo:** `src/repositories/pedidos.repository.ts:47-80`

```typescript
// Insert 1: crear el pedido
const { data: pedido, error: errPedido } = await supabase
  .from('pedidos')
  .insert({ ... })
  .select('*')
  .single();

if (errPedido || !pedido) throw errPedido ?? new Error('Error al crear pedido');

// Insert 2: crear los detalles — si esto falla, el pedido ya existe en DB
const { data: detData, error: errDet } = await supabase
  .from('detalles_pedido')
  .insert(detalles)
  .select('*');

if (errDet) throw errDet;
```

**Problema:** Si el segundo insert falla, queda un pedido en la base de datos sin items. El usuario verá un pedido "vacío" y el inventario ya fue descontado. El SDK de Supabase no expone transacciones directas en el cliente JS.

**Fix:** Crear una stored procedure en Supabase (función PL/pgSQL) que haga ambas inserciones atómicamente y llamarla con `supabase.rpc('crear_pedido_completo', { ... })`. PostgreSQL garantiza atomicidad dentro de una función.

---

### C3 — Webhook de Payway sin validación de firma

**Archivo:** `src/controllers/pagos.controller.ts:103`

```typescript
export async function notificacion(req: Request, res: Response) {
  console.log('[Payway Notificacion] headers:', JSON.stringify(req.headers));
  console.log('[Payway Notificacion] body:', JSON.stringify(req.body));
  res.status(200).json({ ok: true });
}
```

**Problema doble:**

1. No hay verificación criptográfica del payload. Cualquier actor externo puede hacer `POST /api/pagos/notificacion` con cualquier body. Si en el futuro se agrega lógica de actualización de estado a este webhook (que debería hacerse), esto se convierte en un vector de ataque.

2. El webhook actualmente no hace nada útil. Payway envía estas notificaciones para confirmar pagos de forma asíncrona. Si un usuario paga y el redirect falla (se va del browser, timeout), el pedido nunca se confirma porque este endpoint no procesa la notificación.

**Fix:** Verificar la firma que Payway incluye en los headers antes de procesar, y actualizar el estado del pedido cuando llega una notificación de pago aprobado.

---

### C4 — El stock se descuenta antes del pago

**Archivo:** `src/services/pedidos.service.ts` (flujo de `crear`)

```
1. crear pedido → estado: 'pendiente'
2. descontar stock de todos los items
3. usuario va a pagar (puede tardar minutos u horas)
4. si paga → estado: 'confirmado'
5. si no paga nunca → stock queda bloqueado indefinidamente
```

**Problema:** Un pedido en estado `pendiente` tiene el stock descontado pero ningún compromiso de pago. Un usuario puede llenar el carrito con todos los productos disponibles y nunca pagar, bloqueando el inventario para otros clientes. No hay ningún mecanismo de expiración.

**Fix mínimo:** Una tarea programada (cron job) que cada hora busque pedidos en estado `pendiente` con más de 24 horas de antigüedad y los cancele automáticamente (lo cual ya restaura el stock via la lógica existente de `cancelar`).

---

### C5 — `requireAdmin` y `requireAuth` duplican la lógica de validación de token

**Archivo:** `src/middlewares/auth.middleware.ts`

Ambas funciones repiten exactamente el mismo bloque:

```typescript
const authHeader = req.headers.authorization;
if (!authHeader?.startsWith('Bearer ')) {
  res.status(401).json({ error: 'No autorizado: token requerido' });
  return;
}
const token = authHeader.split(' ')[1];
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  res.status(401).json({ error: 'No autorizado: token inválido o expirado' });
  return;
}
```

**Problema:** Duplicación de lógica. Si cambia la forma de validar el token (ej. agregar rate limiting, logging, caché del JWT), hay que cambiarlo en dos lugares.

**Fix:**
```typescript
async function validarToken(req: Request, res: Response): Promise<User | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado: token requerido' });
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser(header.split(' ')[1]);
  if (error || !user) {
    res.status(401).json({ error: 'No autorizado: token inválido o expirado' });
    return null;
  }
  return user;
}

export async function requireAuth(req, res, next) {
  const user = await validarToken(req, res);
  if (!user) return;
  (req as AuthRequest).user = user;
  next();
}

export async function requireAdmin(req, res, next) {
  const user = await validarToken(req, res);
  if (!user) return;
  if (user.app_metadata?.role !== 'admin') {
    res.status(403).json({ error: 'Acceso denegado: se requiere rol de administrador' });
    return;
  }
  (req as AuthRequest).user = user;
  next();
}
```

---

### C6 — Andreani completamente mockeada en producción

**Archivo:** `src/services/andreani.service.ts`

```typescript
// Stub mode — retorna datos hardcodeados
export async function cotizarDomicilio(...): Promise<ResultadoCotizacion> {
  return { precio: 3500, diasHabiles: '3 a 5 días hábiles' };
}

export async function cotizarSucursal(...): Promise<ResultadoCotizacion> {
  return { precio: 2500, diasHabiles: '2 a 4 días hábiles' };
}

export async function listarSucursales(codigoPostal: string): Promise<SucursalAndreani[]> {
  return [
    { nombre: 'Sucursal Centro', direccion: 'Av. Corrientes 1234, CABA' },
    { nombre: 'Sucursal Norte',  direccion: 'Av. Cabildo 4567, CABA' },
    { nombre: 'Sucursal Oeste',  direccion: 'Av. Rivadavia 9999, CABA' },
  ];
}
```

**Problema:** Los usuarios están viendo precios de envío ficticios ($3500/$2500) y sucursales que no existen. Esto no es un problema de código sino de feature incompleta que está en producción como si estuviera terminada.

---

## Problemas Importantes

### I1 — Sin validación de UUID en parámetros `:id`

**Afecta:** Todos los endpoints con `/:id` (productos, pedidos, categorías)

Si un cliente envía `GET /api/productos/no-es-un-uuid`, Supabase lanza un error interno que puede filtrar información de implementación antes de llegar al `errorHandler`.

**Fix:** Un helper reutilizable o middleware de validación UUID:
```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validarUUID(id: string): void {
  if (!UUID_RE.test(id)) throw new ErrorServicio('ID inválido', 400);
}
```

---

### I2 — Lógica de autorización en el controlador de pagos

**Archivo:** `src/controllers/pagos.controller.ts:31`

```typescript
const pedido = await pedidosRepo.encontrarPorId(pedidoId);
if (!pedido) throw new ErrorServicio('Pedido no encontrado', 404);
if (pedido.user_id !== userId) throw new ErrorServicio('Acceso denegado', 403);  // ← esto es negocio, no presentación
if (pedido.estado !== 'pendiente') {
  res.status(400).json({ error: 'El pedido no está en estado pendiente' });        // ← inconsistente: no usa next()
  return;
}
```

**Dos problemas aquí:**

1. La verificación de ownership (`user_id !== userId`) es lógica de negocio que debería vivir en el servicio. Los controladores deberían solo parsear la request y delegar — la autorización a nivel de recurso es responsabilidad del servicio.

2. La validación del estado usa `res.status(400).json()` directamente en vez de `throw new ErrorServicio(...)` + `next(err)`. Patrón inconsistente con el resto del controlador.

---

### I3 — `estadisticas.service.ts` trae todo el inventario a memoria

**Archivo:** `src/services/estadisticas.service.ts`

```typescript
const { data: productos } = await supabase.from('productos').select('*');  // todos
const { data: categorias } = await supabase.from('categorias').select('*'); // todas
// luego hace todo el cálculo en JS con .reduce(), .filter(), etc.
```

**Problema:** Con 10.000 productos esto transfiere ~10MB de JSON por request de estadísticas. El cálculo debería hacerse en la base de datos con `COUNT`, `SUM`, `GROUP BY`. PostgreSQL hace esto en órdenes de magnitud más rápido.

**Fix:** Reemplazar con una función RPC de Supabase que retorne el objeto de estadísticas calculado en el servidor.

---

### I4 — `GET /api/pedidos/admin` sin paginación

**Archivo:** `src/repositories/pedidos.repository.ts:117`

```typescript
export async function encontrarTodos(): Promise<Pedido[]> {
  const { data, error } = await supabase
    .from('pedidos')
    .select('*, detalles_pedido(*)')
    .order('fecha_pedido', { ascending: false });
  // sin .range(), sin límite
  if (error) throw error;
  return (data ?? []).map(mapearPedido);
}
```

Con detalles incluidos (`detalles_pedido(*)`), una farmacia con 5.000 pedidos retorna una respuesta enorme en un solo request. Esta ruta no va a escalar.

---

### I5 — Tipo `AuthRequest` redefinido por archivo

**Archivo:** `src/controllers/pagos.controller.ts:9`

```typescript
type AuthReq = Request & { user: User };
```

Este tipo está definido localmente en `pagos.controller.ts`. Seguramente también está redefinido de distintas formas en cada controlador. Debería estar definido una sola vez en `src/types/index.ts` y ser importado donde se necesite.

---

### I6 — El SDK de Payway se instancia en cada request

**Archivo:** `src/services/pagos.service.ts`

```typescript
function crearSDK() {
  return new Payway({ ... }); // new instance every time
}

export async function procesarPago(...) {
  const sdk = crearSDK(); // llamado por cada pago
  // ...
}

export async function generarCheckoutHosted(...) {
  const sdk = crearSDK(); // llamado por cada checkout
  // ...
}
```

Instanciar el cliente por cada request es un overhead innecesario. Debería ser un singleton inicializado una vez al arrancar el servicio.

---

### I7 — Estado del pedido se acepta como `string` libre

**Endpoint:** `PATCH /api/pedidos/:id/estado`  
**Body:** `{ estado: string }` — acepta cualquier string

El servicio valida contra un array `VALIDOS`, pero el error que devuelve es genérico. La API debería comunicar explícitamente en el 400 qué valores son válidos:

```json
{
  "error": "Estado inválido: 'enviando'. Valores permitidos: pendiente, confirmado, en_preparacion, enviado, entregado, cancelado"
}
```

---

### I8 — CORS acepta requests sin origen

**Archivo:** `src/app.ts`

```typescript
origin: (origin, callback) => {
  if (!origin || origenesPermitidos.some(o => origin === o)) {  // !origin = permitido
    callback(null, true);
  }
}
```

`!origin` es verdadero para requests desde `file://`, Postman, curl, o cualquier cliente que no envíe el header `Origin`. Esto puede ser intencional para desarrollo, pero en producción es más permisivo de lo necesario. Si el backend solo debe ser consumido por el frontend, conviene restringirlo.

---

### I9 — `MetodoPago` incluye métodos sin implementación real

**Archivo:** `src/types/index.ts`

```typescript
export type MetodoPago = 'tarjeta' | 'transferencia' | 'efectivo';
```

Solo `tarjeta` tiene un flujo de pago implementado (Payway). Si un pedido se crea con `metodo_pago: 'transferencia'` o `'efectivo'`, queda en estado `pendiente` indefinidamente sin que nadie lo procese ni el sistema lo sepa.

---

### I10 — Email del usuario puede ser string vacío en Payway

**Archivo:** `src/controllers/pagos.controller.ts:14`

```typescript
const userEmail = (req as AuthReq).user.email ?? '';
```

Si el usuario se registró sin email (OAuth con teléfono, magic link por SMS), `email` es `undefined` y se envía `''` a Payway. La mayoría de los gateways de pago requieren un email válido para el anti-fraude. Esto puede causar rechazos silenciosos.

---

## Mejoras de Calidad

### Q1 — Sin librería de validación de input

Toda la validación es manual con ifs:

```typescript
if (!dto.nombre?.trim()) throw new ErrorServicio('El nombre del producto es obligatorio', 400);
if (dto.precio === undefined || dto.precio === null) throw new ErrorServicio('...', 400);
if (dto.precio < 0) throw new ErrorServicio('...', 400);
```

Esto funciona pero no escala bien. Con Zod, los schemas son declarativos, auto-documentados, y generan mensajes de error estructurados automáticamente:

```typescript
const CrearProductoSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  precio: z.number().min(0, 'El precio no puede ser negativo'),
  stock: z.number().min(0).optional().default(0),
});
```

---

### Q2 — `FraudData` definida en el servicio de pagos

**Archivo:** `src/services/pagos.service.ts`

```typescript
export interface FraudData {
  email: string;
  nombre: string;
  // ...
}
```

Los tipos de dominio deberían vivir en `src/types/index.ts`. Tener interfaces exportadas desde servicios mezcla responsabilidades.

---

### Q3 — Defaults de fraud detection hardcodeados

**Archivo:** `src/services/pagos.service.ts`

```typescript
nombre:   fraudData.nombre   || 'Cliente',
apellido: fraudData.apellido || 'Apotheka',
telefono: ...                || '1100000000',
```

Enviar a Payway/Cybersource el nombre "Cliente Apotheka" con teléfono "1100000000" como datos de anti-fraude es una bandera roja para los sistemas de detección. Si el perfil del usuario no está completo, sería preferible bloquear el pago y pedir que complete el perfil.

---

### Q4 — Validación mezclada entre controller y service

En algunos endpoints la validación está en el controller (`confirmarImportarPrecios`, `pagar`, `checkout`), en otros en el service. Debería ser consistente: los controllers validan la estructura de la request HTTP; los services validan las reglas de negocio.

---

### Q5 — Health check no verifica la base de datos

**Archivo:** `src/app.ts`

```typescript
app.get('/health', (_req, res) => res.json({ estado: 'ok' }));
```

Este endpoint devuelve `ok` aunque Supabase esté caído. Un health check útil debería hacer una query rápida (ej. `SELECT 1`) para verificar conectividad real.

---

### Q6 — Peso de productos asumido en cotización de envío

**Archivo:** `src/controllers/envio.controller.ts`

```typescript
(i.peso_gramos ?? 500) * (i.cantidad ?? 1)
```

El peso default de 500g es arbitrario. Si el producto tiene `peso_gramos` en la base de datos, debería leerse de ahí. Si no, al menos documentar que el valor es estimado.

---

### Q7 — Webhook de Payway no procesa notificaciones

**Archivo:** `src/controllers/pagos.controller.ts:103`

```typescript
export async function notificacion(req: Request, res: Response) {
  console.log('[Payway Notificacion] headers:', JSON.stringify(req.headers));
  console.log('[Payway Notificacion] body:', JSON.stringify(req.body));
  res.status(200).json({ ok: true });
}
```

Este endpoint solo loggea. Payway envía notificaciones server-to-server exactamente para los casos donde el redirect del usuario falla (browser cerrado, timeout de red). Sin procesamiento, la confirmación de un pago exitoso depende 100% de que el usuario llegue al redirect del frontend, lo cual no está garantizado.

---

## Lo que está bien

La base del proyecto está sólida. Estos puntos deben mantenerse:

- **Arquitectura en capas** bien separada: rutas → controller → service → repository. Ninguna capa salta otra.
- **`ErrorServicio` con `statusCode`** permite un manejo centralizado limpio en el middleware de error global.
- **CORS configurable** vía variable de entorno, soporta múltiples orígenes con lista separada por comas.
- **Auth con Supabase JWT** + roles en `app_metadata` es una solución robusta sin reinventar auth.
- **Middleware de error global** al final del stack de Express — patrón correcto.
- **`listar()` con filtros completos** y paginación con límites explícitos (máx 50).
- **`cancelar()` restaura stock** — el flujo inverso está contemplado.
- **`procesarPago()` restaura stock** si el pago es rechazado — evita inconsistencias.
- **Multer con límites** de tamaño (5 MB) y validación de MIME type `image/*`.
- **`strict: true`** en TypeScript — sin shortcuts de tipado.
- **`parsearCsvPrecios`** maneja decimales con coma (formato argentino) correctamente.
- **`recopilarDescendientes`** para filtrar por categoría incluye subcategorías — comportamiento correcto y no obvio.

---

## Tabla Resumen de Issues

| ID | Severidad | Área | Descripción breve |
|----|-----------|------|-------------------|
| C1 | Crítico | Arquitectura | `ErrorServicio` acoplada a `productos.service.ts` |
| C2 | Crítico | DB Integrity | Pedido + detalles sin transacción |
| C3 | Crítico | Seguridad | Webhook Payway sin firma + sin procesamiento |
| C4 | Crítico | Negocio | Stock descontado antes del pago sin expiración |
| C5 | Crítico | Código | `requireAuth`/`requireAdmin` duplican lógica |
| C6 | Crítico | Feature | Andreani completamente mockeada en producción |
| I1 | Importante | Seguridad | Sin validación de UUID en parámetros `:id` |
| I2 | Importante | Arquitectura | Autorización de ownership en controller de pagos |
| I3 | Importante | Performance | Estadísticas carga todo el inventario en memoria |
| I4 | Importante | Performance | `listarAdmin` de pedidos sin paginación |
| I5 | Importante | Código | `AuthRequest` redefinido por archivo |
| I6 | Importante | Performance | SDK de Payway instanciado por cada request |
| I7 | Importante | UX/API | Estado de pedido acepta string libre sin feedback claro |
| I8 | Importante | Seguridad | CORS permite origin null |
| I9 | Importante | Negocio | `transferencia`/`efectivo` sin flujo de pago |
| I10 | Importante | Pagos | Email vacío enviado al gateway si usuario no tiene email |
| Q1 | Calidad | Validación | Sin librería de validación (Zod recomendado) |
| Q2 | Calidad | Código | `FraudData` definida en servicio en vez de `types/` |
| Q3 | Calidad | Pagos | Defaults hardcodeados en datos anti-fraude |
| Q4 | Calidad | Arquitectura | Validación inconsistente: a veces en controller, a veces en service |
| Q5 | Calidad | Ops | Health check no verifica conectividad a DB |
| Q6 | Calidad | Negocio | Peso default de envío arbitrario (500g) |
| Q7 | Calidad | Pagos | Webhook de Payway no procesa notificaciones asíncronas |

---

## Prioridad de acción sugerida

**Inmediato (antes de seguir agregando features):**
1. C2 — Transacciones en creación de pedidos (riesgo de datos corruptos)
2. C3 — Firma en el webhook + procesamiento de notificaciones (riesgo de pagos no confirmados)
3. C4 — Expiración de pedidos pendientes (riesgo de bloqueo de inventario)

**Corto plazo:**
4. C1 — Mover `ErrorServicio` a su propio archivo
5. C5 — Refactorizar `requireAuth`/`requireAdmin`
6. I3 — Estadísticas con queries de agregación en DB
7. I4 — Paginación en `listarAdmin`

**Mediano plazo:**
8. C6 — Integración real con Andreani
9. Q1 — Agregar Zod para validación de DTOs
10. Q7 — Procesar notificaciones asíncronas de Payway
