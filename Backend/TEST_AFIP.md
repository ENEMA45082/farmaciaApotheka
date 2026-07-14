# Prueba de conexión a ARCA (AFIP SDK) — homologación

Este documento es temporal. Está pensado para validar que el backend puede conectarse
a AFIP SDK / ARCA en el ambiente de **homologación** (testing), antes de emitir
cualquier factura real. Borralo junto con `src/routes/testAfip.routes.ts` cuando ya
no lo necesites.

## 1. Variables de entorno que tenés que completar vos

En tu `.env` local (nunca en `.env.example`, que es solo la plantilla):

```
ARCA_CUIT=20450823350
ARCA_ACCESS_TOKEN=<tu access token de https://afipsdk.com>
ARCA_PUNTO_VENTA=<el punto de venta de prueba que autorizaste en ARCA>
ARCA_CERT_PATH=C:/ruta/local/a/tu-certificado.crt
ARCA_KEY_PATH=C:/ruta/local/a/tu-clave-privada.key
ARCA_PRODUCCION=false
```

Notas importantes:

- **`ARCA_ACCESS_TOKEN` ya está completado en tu `.env` actual** (no vacío). AFIP SDK
  funciona como un proxy: todas las llamadas del SDK pasan por la API de afipsdk.com,
  autenticadas con este token — por eso hace falta además del cert/key propio de ARCA.
  Confirmá que ese token corresponda a una cuenta de afipsdk.com a la que tengas acceso;
  si no sabés de dónde salió, convendría regenerarlo desde tu propia cuenta.
- Usá **`ARCA_CERT_PATH`/`ARCA_KEY_PATH`** (rutas a los archivos) para desarrollo local:
  es más cómodo que pegar el PEM completo en el `.env`. En Vercel no hay filesystem
  persistente, así que en producción hay que usar `ARCA_CERT`/`ARCA_KEY` con el
  contenido PEM completo pegado directo en las env vars del proyecto.
- Guardá el `.crt` y el `.key` en una carpeta **fuera del repo**, o si preferís tenerlos
  dentro, en `./secrets/` (ya está agregada a `.gitignore`, junto con cualquier `*.key`,
  `*.crt` y `*.pem`). Nunca deben terminar en un commit.
- `ARCA_PRODUCCION=false` asegura que el SDK apunte a homologación
  (`wswhomo.afip.gov.ar`), no al servicio real.

## 2. Cómo probar el endpoint

Hay dos operaciones, ambas en `/api/test-afip` y ambas requieren un usuario con rol
`admin` (mismo esquema que el resto de rutas `/admin/*` del backend):

- `GET /api/test-afip`: solo lectura, no emite nada (`FECompUltimoAutorizado`).
- `POST /api/test-afip`: **emite un comprobante de PRUEBA real** en homologación
  (`FECAESolicitar`, sin validez fiscal). Es una acción real contra ARCA: cada
  llamada exitosa consume un número de comprobante que no se puede reutilizar.

1. Levantá el backend (`npm run dev` o el script que uses normalmente).
2. Conseguí un access token de un usuario admin (por ejemplo, iniciando sesión en el
   frontend con una cuenta admin y copiando el `access_token` de la sesión de Supabase
   desde las devtools, o usando `supabase.auth.getSession()`).
3. Con Postman, Insomnia o curl:

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN_ADMIN>" \
  "http://localhost:3001/api/test-afip"
```

Opcionalmente podés pasar `?puntoVenta=1&tipoComprobante=6` por query string si
querés probar con otro punto de venta o tipo de comprobante distinto al configurado
por defecto (`ARCA_PUNTO_VENTA` y Factura B).

### Respuesta esperada (éxito)

```json
{
  "ok": true,
  "ambiente": "homologacion",
  "cuit": "20450823350",
  "puntoVenta": 1,
  "tipoComprobante": 6,
  "ultimoNumero": 0
}
```

`ultimoNumero` es el último número de comprobante autorizado para ese punto de venta
y tipo (0 si todavía no emitiste ninguno de prueba). Esta llamada **no emite nada**,
solo consulta (`FECompUltimoAutorizado`).

### Respuesta esperada (error)

```json
{
  "ok": false,
  "error": "mensaje del error",
  "detalleCompleto": { "...": "campos crudos devueltos por AFIP SDK" }
}
```

Errores comunes: cert/key no autorizados para `wsfe`, punto de venta no habilitado
para el CUIT, `ARCA_ACCESS_TOKEN` inválido o de otra cuenta, o rutas de
`ARCA_CERT_PATH`/`ARCA_KEY_PATH` mal escritas.

## 2.1 Emitir un comprobante de prueba (POST)

```bash
curl -X POST \
  -H "Authorization: Bearer <ACCESS_TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{"puntoVenta": 1, "tipoComprobante": 6, "importeTotal": 121, "docTipo": 99, "docNro": 0}' \
  "http://localhost:3001/api/test-afip"
```

Todos los campos del body son opcionales; si no los mandás, se usan esos mismos
valores por defecto (Punto de Venta 1, Factura B, $121 con 21% de IVA, Consumidor
Final). Internamente el endpoint hace, en dos pasos separados:

1. `FECompUltimoAutorizado` para saber cuál es el próximo número disponible.
2. `FECAESolicitar` pidiendo el CAE para ese número (último + 1).

### Respuesta esperada (éxito)

```json
{
  "ok": true,
  "ambiente": "homologacion",
  "cuit": "20450823350",
  "puntoVenta": 1,
  "tipoComprobante": 6,
  "ultimoNumeroAnterior": 0,
  "numeroComprobante": 1,
  "importeTotal": 121,
  "cae": "...",
  "caeVencimiento": "yyyy-mm-dd"
}
```

### Errores esperados y qué significan

- **10016** — el número de comprobante enviado no es el siguiente al último
  autorizado (por ejemplo, si emitiste dos veces casi al mismo tiempo, o alguien
  más usó ese número). El endpoint agrega un campo `pista` explicando que hay que
  volver a consultar `GET /api/test-afip` y reintentar con el número correcto.
- **10242** — falta o es inválida la condición de IVA del receptor
  (`CondicionIVAReceptorId`). El endpoint ya lo manda en 5 (Consumidor Final) por
  default, así que si ves este error revisá que no lo hayas sobreescrito con un
  valor inválido en el body.
- Cualquier otro error de ARCA se devuelve completo, sin transformar, en
  `error` + `detalleCompleto`.

## 3. Antes de ir a producción

- Eliminar `src/routes/testAfip.routes.ts`, la línea que lo registra en `src/app.ts`
  y este archivo.
- Las funciones `obtenerUltimoComprobanteAutorizado` y `solicitarComprobantePrueba`
  en `src/services/facturacion.service.ts` sí son permanentes — quedaron ahí porque
  son reutilizables para el flujo real de facturación, no hace falta borrarlas.
