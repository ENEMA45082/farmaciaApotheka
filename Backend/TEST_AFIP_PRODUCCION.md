# ARCA / AFIP SDK — ambiente de PRODUCCIÓN (Apotheka SRL, CUIT 30677539743)

⚠️ **Esto conecta con ARCA real.** No es homologación (para eso ver `TEST_AFIP.md`,
que usa el CUIT de testing `20450823350` y queda completamente intacto y sin relación
con este documento). Cualquier `FECAESolicitar` hecho con estas credenciales genera un
comprobante fiscal real e irreversible — pero **esta etapa no incluye eso**: hoy solo
verificamos que el certificado de producción autentica correctamente vía `FEDummy`
(chequeo de estado, de solo lectura, no consume numeración ni emite nada).

## 1. Variables de entorno — desarrollo local

En tu `.env` local (nunca en `.env.example`):

```
ARCA_ENVIRONMENT=produccion
ARCA_PROD_CUIT=30677539743
ARCA_PROD_CERT_PATH=C:/ruta/local/a/tu-certificado-produccion.crt
ARCA_PROD_KEY_PATH=C:/ruta/local/a/tu-clave-produccion.key
```

Notas:

- **`ARCA_ENVIRONMENT=produccion` es el interruptor maestro.** Si no está puesto
  exactamente así, el cliente de producción (`src/config/afipProduccion.ts`) no se
  inicializa aunque el resto de las variables estén completas — nunca es un default
  silencioso.
- **No hace falta un `ARCA_ACCESS_TOKEN` nuevo**: se reutiliza el mismo que ya usás en
  homologación (identifica tu cuenta de afipsdk.com, no el ambiente). *Posible problema*:
  si tu cuenta de afipsdk.com es de plan gratuito, puede tener un límite de CUITs
  distintos por período — como ahora vas a usar 2 CUITs (testing y producción) con el
  mismo token, si te aparece un error de límite de CUITs, **avisame en vez de intentar
  resolverlo por tu cuenta** — hay que revisar el plan de tu cuenta en afipsdk.com.
- Para desarrollo local, `ARCA_PROD_CERT_PATH`/`ARCA_PROD_KEY_PATH` (rutas a archivo)
  llevan el PEM tal cual, sin Base64. Guardá esos archivos fuera del repo, o en
  `./secrets/` (ya ignorado por git).

## 2. Variables de entorno — Vercel (proyecto backend, deploy real)

En **Vercel → proyecto backend → Settings → Environment Variables**, agregá estas
variables con **scope "Production" únicamente** — ⚠️ **no las agregues a Preview ni a
Development**, para que una preview deployment nunca tenga acceso a credenciales
fiscales reales:

| Variable | Valor |
|---|---|
| `ARCA_ENVIRONMENT` | `produccion` |
| `ARCA_PROD_CUIT` | `30677539743` |
| `ARCA_PROD_CERT` | Base64 del contenido completo de tu `.crt` |
| `ARCA_PROD_KEY` | Base64 del contenido completo de tu `.key` |

`ARCA_ACCESS_TOKEN` no se toca — ya está cargado (compartido con homologación).
No hace falta `ARCA_PROD_CERT_PATH`/`ARCA_PROD_KEY_PATH` en Vercel (no hay filesystem
persistente ahí; solo sirven para desarrollo local).

### Cómo generar el Base64

En PowerShell:
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\ruta\a\tu-certificado-produccion.crt"))
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\ruta\a\tu-clave-produccion.key"))
```

En bash:
```bash
base64 -w0 tu-certificado-produccion.crt
base64 -w0 tu-clave-produccion.key
```

Copiá cada resultado (una sola línea larga) directo al valor de la variable en Vercel.

## 3. Cómo probar el endpoint (FEDummy, solo lectura)

`GET /api/test-afip-produccion` — requiere rol `admin` (igual que el resto de rutas
`/admin/*`) **y además** el query param `?confirmo=produccion`, a propósito, como
fricción extra dado que esto pega contra ARCA real:

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN_ADMIN>" \
  "http://localhost:3001/api/test-afip-produccion?confirmo=produccion"
```

Ver `TEST_AFIP.md` (sección 2, punto 2) para cómo conseguir el token de admin.

### Respuesta esperada (éxito)

```json
{
  "ok": true,
  "ambiente": "produccion",
  "cuit": "30677539743",
  "appServer": "OK",
  "dbServer": "OK",
  "authServer": "OK"
}
```

Los tres campos vienen directo de ARCA (`FEDummy`): estado del web service, de la base
de datos, y del servidor de autenticación (WSAA). Si los tres dicen `OK`, tu cert/key de
producción están autenticando correctamente contra ARCA real. **Esta llamada no emite
nada ni consume numeración.**

### Respuesta esperada (error)

```json
{
  "ok": false,
  "error": "mensaje del error",
  "detalleCompleto": { "...": "campos crudos devueltos por AFIP SDK" }
}
```

Si falta el query param `confirmo=produccion`, da 400 con un mensaje explicando qué
falta, antes de intentar siquiera conectarse a ARCA.

## 4. Qué NO hace este endpoint (a propósito)

No existe ningún endpoint de emisión (`FECAESolicitar`) contra producción todavía —
ni en este archivo de rutas, ni en `facturacionProduccion.service.ts`. Eso se implementa
en una sesión aparte, con más tiempo, una vez que confirmemos que `FEDummy` funciona.

## 5. Antes de dejar esto andando en producción de forma permanente

- Eliminar (o reforzar con más protecciones) `src/routes/testAfipProduccion.routes.ts`,
  la línea que lo registra en `src/app.ts`, y este archivo.
- `src/config/afipProduccion.ts` y `verificarConexionProduccion()` en
  `src/services/facturacionProduccion.service.ts` sí son permanentes — son la base para
  la futura integración de emisión real.
