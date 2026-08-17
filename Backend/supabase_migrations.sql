-- ============================================================
-- MIGRATIONS — Farmacia Apotheka
-- Ejecutar en Supabase → SQL Editor (en orden)
-- ============================================================


-- --------------------------------------------------------
-- 1. Agregar columna motivo_cancelacion a pedidos
-- --------------------------------------------------------
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS motivo_cancelacion text;


-- --------------------------------------------------------
-- 2. RPC: crear_pedido_completo (inserción atómica)
--    Reemplaza los dos inserts separados del backend.
--    Si falla la inserción de detalles, el pedido se revierte.
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION crear_pedido_completo(
  p_user_id            uuid,
  p_total              numeric,
  p_subtotal_lista     numeric,
  p_notas              text,
  p_metodo_envio       text,
  p_costo_envio        numeric,
  p_sucursal_andreani  text,
  p_codigo_postal_envio text,
  p_metodo_pago        text,
  p_items              jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  nuevo_pedido pedidos%ROWTYPE;
BEGIN
  INSERT INTO pedidos (
    user_id, total, subtotal_lista, notas,
    metodo_envio, costo_envio, sucursal_andreani,
    codigo_postal_envio, metodo_pago
  ) VALUES (
    p_user_id, p_total, p_subtotal_lista, p_notas,
    p_metodo_envio, p_costo_envio, p_sucursal_andreani,
    p_codigo_postal_envio, p_metodo_pago
  )
  RETURNING * INTO nuevo_pedido;

  INSERT INTO detalles_pedido (
    pedido_id, producto_id, nombre_producto,
    cantidad, precio_unitario, precio_lista, subtotal
  )
  SELECT
    nuevo_pedido.id,
    (item->>'producto_id')::uuid,
    item->>'nombre_producto',
    (item->>'cantidad')::int,
    (item->>'precio_unitario')::numeric,
    (item->>'precio_lista')::numeric,
    (item->>'subtotal')::numeric
  FROM jsonb_array_elements(p_items) AS item;

  RETURN row_to_json(nuevo_pedido)::jsonb;
END;
$$;


-- --------------------------------------------------------
-- 3. Expiración automática de pedidos con pg_cron
--    Cancela pedidos en estado 'pendiente' con más de 48hs.
--    Restaura stock via la stored procedure restaurar_stock().
-- --------------------------------------------------------

-- 3a. Habilitar extensión pg_cron (requiere plan Pro en Supabase)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3b. Función que cancela pedidos expirados y restaura stock
CREATE OR REPLACE FUNCTION cancelar_pedidos_expirados()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  pedido_row  RECORD;
  detalle_row RECORD;
BEGIN
  FOR pedido_row IN
    SELECT id FROM pedidos
    WHERE estado = 'pendiente'
      AND fecha_pedido < NOW() - INTERVAL '48 hours'
  LOOP
    -- Restaurar stock de cada ítem antes de cancelar
    FOR detalle_row IN
      SELECT producto_id, cantidad
      FROM detalles_pedido
      WHERE pedido_id = pedido_row.id
        AND producto_id IS NOT NULL
    LOOP
      PERFORM restaurar_stock(detalle_row.producto_id, detalle_row.cantidad);
    END LOOP;

    -- Cancelar el pedido con motivo descriptivo
    UPDATE pedidos SET
      estado              = 'cancelado',
      fecha_cancelacion   = NOW(),
      motivo_cancelacion  = 'Cancelado automáticamente por falta de pago (48 horas)'
    WHERE id = pedido_row.id;
  END LOOP;
END;
$$;

-- 3c. Programar ejecución cada hora (descomentar cuando pg_cron esté habilitado)
-- SELECT cron.schedule(
--   'cancelar-pedidos-expirados',
--   '0 * * * *',
--   'SELECT cancelar_pedidos_expirados()'
-- );

-- Para probar la función manualmente:
-- SELECT cancelar_pedidos_expirados();


-- --------------------------------------------------------
-- 4. RPC: obtener_estadisticas_inventario
--    Reemplaza la carga de todos los productos en memoria.
--    Calcula todo en la DB con SQL aggregation.
--    porCategoria usa CTE recursiva para resolver categoría raíz.
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION obtener_estadisticas_inventario()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  resultado jsonb;
BEGIN
  WITH RECURSIVE cat_raiz AS (
    -- Categorías raíz (sin padre)
    SELECT id, nombre, id AS raiz_id, nombre AS raiz_nombre
    FROM categorias
    WHERE id_padre IS NULL

    UNION ALL

    -- Hijos apuntan a su raíz
    SELECT c.id, c.nombre, cr.raiz_id, cr.raiz_nombre
    FROM categorias c
    JOIN cat_raiz cr ON c.id_padre = cr.id
  )
  SELECT jsonb_build_object(
    'resumen', (
      SELECT jsonb_build_object(
        'totalProductos',    COUNT(*),
        'totalStock',        COALESCE(SUM(stock), 0),
        'valorInventario',   COALESCE(SUM(precio * stock), 0),
        'productosEnOferta', COUNT(*) FILTER (WHERE en_oferta = true),
        'productosSinStock', COUNT(*) FILTER (WHERE stock = 0),
        'proximosAVencer',   COUNT(*) FILTER (
                               WHERE fecha_vencimiento IS NOT NULL
                                 AND fecha_vencimiento::date BETWEEN CURRENT_DATE
                                 AND CURRENT_DATE + INTERVAL '30 days'
                             ),
        'ahorroOferta', COALESCE(
          SUM((precio - COALESCE(precio_oferta, precio)) * stock)
            FILTER (WHERE en_oferta = true AND precio_oferta IS NOT NULL),
          0
        ),
        'totalCategorias', (SELECT COUNT(*) FROM categorias)
      )
      FROM productos
    ),
    'porCategoria', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'nombre',          COALESCE(cr.raiz_nombre, 'Sin categoría'),
          'totalProductos',  COUNT(p.id),
          'totalStock',      COALESCE(SUM(p.stock), 0),
          'valorInventario', COALESCE(SUM(p.precio * p.stock), 0)
        ) ORDER BY COUNT(p.id) DESC
      ), '[]'::jsonb)
      FROM productos p
      LEFT JOIN cat_raiz cr ON p.categoria_id = cr.id
      GROUP BY cr.raiz_nombre
    ),
    'distribucionPrecios', (
      SELECT jsonb_agg(fila ORDER BY orden)
      FROM (
        SELECT 1 AS orden, '< $500'           AS rango, COUNT(*) AS cantidad FROM productos WHERE precio < 500
        UNION ALL
        SELECT 2, '$500 - $1.000',    COUNT(*) FROM productos WHERE precio BETWEEN 500   AND 999.99
        UNION ALL
        SELECT 3, '$1.000 - $2.500',  COUNT(*) FROM productos WHERE precio BETWEEN 1000  AND 2499.99
        UNION ALL
        SELECT 4, '$2.500 - $5.000',  COUNT(*) FROM productos WHERE precio BETWEEN 2500  AND 4999.99
        UNION ALL
        SELECT 5, '$5.000 - $10.000', COUNT(*) FROM productos WHERE precio BETWEEN 5000  AND 9999.99
        UNION ALL
        SELECT 6, '> $10.000',        COUNT(*) FROM productos WHERE precio >= 10000
      ) sub
      CROSS JOIN LATERAL jsonb_build_object('rango', rango, 'cantidad', cantidad) AS fila
    ),
    'ofertaVsNormal', (
      SELECT jsonb_build_object(
        'enOferta', COUNT(*) FILTER (WHERE en_oferta = true),
        'normal',   COUNT(*) FILTER (WHERE en_oferta = false)
      )
      FROM productos
    ),
    'descuentoPromedio', (
      SELECT COALESCE(ROUND(AVG(porcentaje_oferta)::numeric, 1), 0)
      FROM productos
      WHERE en_oferta = true AND porcentaje_oferta IS NOT NULL
    ),
    -- mes en formato YYYY-MM para que el servicio lo formatee a es-AR
    'vencimientosPorMes', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('mes', mes_iso, 'cantidad', cantidad)
        ORDER BY mes_iso
      ), '[]'::jsonb)
      FROM (
        SELECT
          TO_CHAR(DATE_TRUNC('month', fecha_vencimiento::date), 'YYYY-MM') AS mes_iso,
          COUNT(*) AS cantidad
        FROM productos
        WHERE fecha_vencimiento IS NOT NULL
          AND fecha_vencimiento::date BETWEEN CURRENT_DATE
          AND CURRENT_DATE + INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', fecha_vencimiento::date)
      ) sub
    )
  ) INTO resultado;

  RETURN resultado;
END;
$$;


-- --------------------------------------------------------
-- 5. Rebranding Andreani → Correo Argentino + campos de tracking
--    y direcciones estructuradas con código de provincia
-- --------------------------------------------------------

-- 5a. Rename de columna en pedidos (Andreani -> Correo Argentino)
--     Pasa a guardar el CÓDIGO de sucursal (ej. 'B0107'), no el nombre.
ALTER TABLE pedidos RENAME COLUMN sucursal_andreani TO sucursal_correo_argentino;

-- 5b. Nuevas columnas de tracking y destinatario en pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS shipping_tracking_number  text;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS shipping_fecha_envio      timestamptz;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS shipping_creado_en_correo timestamptz; -- createdAt devuelto por /shipping/import
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS shipping_error            text;        -- último error de negocio (402) si falló el envío real
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS destinatario_nombre       text;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS destinatario_dni          text;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS destinatario_cod_area     text;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS destinatario_telefono     text;

-- 5c. Nuevas columnas estructuradas en direcciones
ALTER TABLE direcciones ADD COLUMN IF NOT EXISTS calle             text;
ALTER TABLE direcciones ADD COLUMN IF NOT EXISTS altura            text;
ALTER TABLE direcciones ADD COLUMN IF NOT EXISTS piso              text;
ALTER TABLE direcciones ADD COLUMN IF NOT EXISTS depto             text;
ALTER TABLE direcciones ADD COLUMN IF NOT EXISTS provincia_codigo  char(1);

-- 5d. Backfill best-effort de calle/altura desde calle_numero existente
--     (separa el último grupo de dígitos como altura; heurística simple,
--      revisar manualmente filas que no matcheen el patrón)
UPDATE direcciones
SET
  calle  = trim(regexp_replace(calle_numero, '\s*\d+\s*$', '')),
  altura = trim(substring(calle_numero FROM '(\d+)\s*$'))
WHERE calle IS NULL;

-- 5e. Backfill best-effort de provincia_codigo desde el texto libre `provincia`
--     Cubre variantes comunes devueltas por Mapbox. Revisar manualmente las filas
--     que queden con provincia_codigo NULL después de correr esto.
UPDATE direcciones SET provincia_codigo = CASE
  WHEN provincia ILIKE '%buenos aires%' AND provincia ILIKE '%ciudad%' THEN 'C'
  WHEN provincia ILIKE '%caba%' OR provincia ILIKE '%capital federal%' THEN 'C'
  WHEN provincia ILIKE '%buenos aires%' THEN 'B'
  WHEN provincia ILIKE '%catamarca%' THEN 'K'
  WHEN provincia ILIKE '%chaco%' THEN 'H'
  WHEN provincia ILIKE '%chubut%' THEN 'U'
  WHEN provincia ILIKE '%córdoba%' OR provincia ILIKE '%cordoba%' THEN 'X'
  WHEN provincia ILIKE '%corrientes%' THEN 'W'
  WHEN provincia ILIKE '%entre r%' THEN 'E'
  WHEN provincia ILIKE '%formosa%' THEN 'P'
  WHEN provincia ILIKE '%jujuy%' THEN 'Y'
  WHEN provincia ILIKE '%la pampa%' THEN 'L'
  WHEN provincia ILIKE '%la rioja%' THEN 'F'
  WHEN provincia ILIKE '%mendoza%' THEN 'M'
  WHEN provincia ILIKE '%misiones%' THEN 'N'
  WHEN provincia ILIKE '%neuqu%' THEN 'Q'
  WHEN provincia ILIKE '%r%o negro%' THEN 'R'
  WHEN provincia ILIKE '%salta%' THEN 'A'
  WHEN provincia ILIKE '%san juan%' THEN 'J'
  WHEN provincia ILIKE '%san luis%' THEN 'D'
  WHEN provincia ILIKE '%santa cruz%' THEN 'Z'
  WHEN provincia ILIKE '%santa fe%' THEN 'S'
  WHEN provincia ILIKE '%santiago del estero%' THEN 'G'
  WHEN provincia ILIKE '%tierra del fuego%' THEN 'V'
  WHEN provincia ILIKE '%tucum%' THEN 'T'
  ELSE NULL
END
WHERE provincia_codigo IS NULL;

-- 5f. Actualizar crear_pedido_completo: nuevo nombre de columna
--     + nuevos parámetros de destinatario (todos opcionales para no
--     romper llamadas existentes durante el deploy)
CREATE OR REPLACE FUNCTION crear_pedido_completo(
  p_user_id                    uuid,
  p_total                      numeric,
  p_subtotal_lista             numeric,
  p_notas                      text,
  p_metodo_envio               text,
  p_costo_envio                numeric,
  p_sucursal_correo_argentino  text,
  p_codigo_postal_envio        text,
  p_metodo_pago                text,
  p_items                      jsonb,
  p_destinatario_nombre        text DEFAULT NULL,
  p_destinatario_dni           text DEFAULT NULL,
  p_destinatario_cod_area      text DEFAULT NULL,
  p_destinatario_telefono      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  nuevo_pedido pedidos%ROWTYPE;
BEGIN
  INSERT INTO pedidos (
    user_id, total, subtotal_lista, notas,
    metodo_envio, costo_envio, sucursal_correo_argentino,
    codigo_postal_envio, metodo_pago,
    destinatario_nombre, destinatario_dni, destinatario_cod_area, destinatario_telefono
  ) VALUES (
    p_user_id, p_total, p_subtotal_lista, p_notas,
    p_metodo_envio, p_costo_envio, p_sucursal_correo_argentino,
    p_codigo_postal_envio, p_metodo_pago,
    p_destinatario_nombre, p_destinatario_dni, p_destinatario_cod_area, p_destinatario_telefono
  )
  RETURNING * INTO nuevo_pedido;

  INSERT INTO detalles_pedido (
    pedido_id, producto_id, nombre_producto,
    cantidad, precio_unitario, precio_lista, subtotal
  )
  SELECT
    nuevo_pedido.id,
    (item->>'producto_id')::uuid,
    item->>'nombre_producto',
    (item->>'cantidad')::int,
    (item->>'precio_unitario')::numeric,
    (item->>'precio_lista')::numeric,
    (item->>'subtotal')::numeric
  FROM jsonb_array_elements(p_items) AS item;

  RETURN row_to_json(nuevo_pedido)::jsonb;
END;
$$;


-- --------------------------------------------------------
-- 6. Estados de pedido: renombrar a PascalCase + ListoParaRetirar
--    + historial de cambios de estado
--    - 'anulado' se fusiona en 'Cancelado'
--    - motivo_cancelacion ya existía (sección 1); acá se estandariza
--      el motivo del cron de expiración a un código fijo
-- --------------------------------------------------------

-- 6a. La columna estado tiene un CHECK constraint creado directamente en
--     Supabase (no capturado en ninguna migración anterior de este archivo)
--     que solo permite los valores viejos. Hay que soltarlo antes de migrar
--     los datos, y se vuelve a crear más abajo (6a-bis) con los 7 valores nuevos.
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;

-- Migrar datos existentes al nuevo esquema de nombres
UPDATE pedidos SET estado = 'PendienteDePago' WHERE estado = 'pendiente';
UPDATE pedidos SET estado = 'Confirmado'      WHERE estado = 'confirmado';
UPDATE pedidos SET estado = 'EnPreparacion'   WHERE estado = 'en_preparacion';
UPDATE pedidos SET estado = 'Enviado'         WHERE estado = 'enviado';
UPDATE pedidos SET estado = 'Entregado'       WHERE estado = 'entregado';
UPDATE pedidos SET estado = 'Cancelado'       WHERE estado IN ('cancelado', 'anulado');

-- Motivo por defecto para pedidos cancelados/anulados que no tenían motivo cargado
UPDATE pedidos SET motivo_cancelacion = 'otro'
WHERE estado = 'Cancelado' AND motivo_cancelacion IS NULL;

-- 6a-bis. Recrear el constraint con los 7 valores nuevos (mantiene la
--         validación a nivel de DB que ya existía, solo actualiza la lista)
ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_check
  CHECK (estado IN (
    'PendienteDePago', 'Confirmado', 'EnPreparacion',
    'Enviado', 'ListoParaRetirar', 'Entregado', 'Cancelado'
  ));

-- 6b. Nuevo default de columna: crear_pedido_completo no setea `estado`
--     explícitamente en el INSERT, depende del DEFAULT de la columna
ALTER TABLE pedidos ALTER COLUMN estado SET DEFAULT 'PendienteDePago';

-- 6c. Estandarizar el motivo de cancelación automática por falta de pago
--     para que use el mismo vocabulario fijo que el resto de la app
CREATE OR REPLACE FUNCTION cancelar_pedidos_expirados()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  pedido_row  RECORD;
  detalle_row RECORD;
BEGIN
  FOR pedido_row IN
    SELECT id FROM pedidos
    WHERE estado = 'PendienteDePago'
      AND fecha_pedido < NOW() - INTERVAL '48 hours'
  LOOP
    -- Restaurar stock de cada ítem antes de cancelar
    FOR detalle_row IN
      SELECT producto_id, cantidad
      FROM detalles_pedido
      WHERE pedido_id = pedido_row.id
        AND producto_id IS NOT NULL
    LOOP
      PERFORM restaurar_stock(detalle_row.producto_id, detalle_row.cantidad);
    END LOOP;

    -- Cancelar el pedido con motivo fijo (mismo vocabulario que MOTIVOS_CANCELACION)
    UPDATE pedidos SET
      estado              = 'Cancelado',
      fecha_cancelacion   = NOW(),
      motivo_cancelacion  = 'pago_no_recibido'
    WHERE id = pedido_row.id;
  END LOOP;
END;
$$;

-- 6d. Tabla de auditoría de cambios de estado hechos por un admin
CREATE TABLE IF NOT EXISTS pedido_historial_estados (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id       uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  estado_anterior text NOT NULL,
  estado_nuevo    text NOT NULL,
  motivo          text,
  changed_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pedido_historial_estados_pedido_id
  ON pedido_historial_estados(pedido_id);


-- --------------------------------------------------------
-- 7. Fix: obtener_estadisticas_inventario() consultaba tablas
--    'productos'/'categorias' (español), pero las tablas reales
--    son 'products'/'categories' (inglés, ver database/schema.sql
--    y productos.repository.ts) — la función nunca funcionó, tiraba
--    "relation does not exist" (500 en GET /api/estadisticas).
--    Los nombres de columna sí son correctos (español), solo se
--    corrigen los nombres de tabla.
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION obtener_estadisticas_inventario()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  resultado jsonb;
BEGIN
  WITH RECURSIVE cat_raiz AS (
    -- Categorías raíz (sin padre)
    SELECT id, nombre, id AS raiz_id, nombre AS raiz_nombre
    FROM categories
    WHERE id_padre IS NULL

    UNION ALL

    -- Hijos apuntan a su raíz
    SELECT c.id, c.nombre, cr.raiz_id, cr.raiz_nombre
    FROM categories c
    JOIN cat_raiz cr ON c.id_padre = cr.id
  )
  SELECT jsonb_build_object(
    'resumen', (
      SELECT jsonb_build_object(
        'totalProductos',    COUNT(*),
        'totalStock',        COALESCE(SUM(stock), 0),
        'valorInventario',   COALESCE(SUM(precio * stock), 0),
        'productosEnOferta', COUNT(*) FILTER (WHERE en_oferta = true),
        'productosSinStock', COUNT(*) FILTER (WHERE stock = 0),
        'proximosAVencer',   COUNT(*) FILTER (
                               WHERE fecha_vencimiento IS NOT NULL
                                 AND fecha_vencimiento::date BETWEEN CURRENT_DATE
                                 AND CURRENT_DATE + INTERVAL '30 days'
                             ),
        'ahorroOferta', COALESCE(
          SUM((precio - COALESCE(precio_oferta, precio)) * stock)
            FILTER (WHERE en_oferta = true AND precio_oferta IS NOT NULL),
          0
        ),
        'totalCategorias', (SELECT COUNT(*) FROM categories)
      )
      FROM products
    ),
    'porCategoria', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'nombre',          agg.nombre,
          'totalProductos',  agg.total_productos,
          'totalStock',      agg.total_stock,
          'valorInventario', agg.valor_inventario
        ) ORDER BY agg.total_productos DESC
      ), '[]'::jsonb)
      FROM (
        SELECT
          COALESCE(cr.raiz_nombre, 'Sin categoría') AS nombre,
          COUNT(p.id)                               AS total_productos,
          COALESCE(SUM(p.stock), 0)                 AS total_stock,
          COALESCE(SUM(p.precio * p.stock), 0)       AS valor_inventario
        FROM products p
        LEFT JOIN cat_raiz cr ON p.categoria_id = cr.id
        GROUP BY cr.raiz_nombre
      ) agg
    ),
    'distribucionPrecios', (
      SELECT jsonb_agg(fila ORDER BY orden)
      FROM (
        SELECT 1 AS orden, '< $500'           AS rango, COUNT(*) AS cantidad FROM products WHERE precio < 500
        UNION ALL
        SELECT 2, '$500 - $1.000',    COUNT(*) FROM products WHERE precio BETWEEN 500   AND 999.99
        UNION ALL
        SELECT 3, '$1.000 - $2.500',  COUNT(*) FROM products WHERE precio BETWEEN 1000  AND 2499.99
        UNION ALL
        SELECT 4, '$2.500 - $5.000',  COUNT(*) FROM products WHERE precio BETWEEN 2500  AND 4999.99
        UNION ALL
        SELECT 5, '$5.000 - $10.000', COUNT(*) FROM products WHERE precio BETWEEN 5000  AND 9999.99
        UNION ALL
        SELECT 6, '> $10.000',        COUNT(*) FROM products WHERE precio >= 10000
      ) sub
      CROSS JOIN LATERAL jsonb_build_object('rango', rango, 'cantidad', cantidad) AS fila
    ),
    'ofertaVsNormal', (
      SELECT jsonb_build_object(
        'enOferta', COUNT(*) FILTER (WHERE en_oferta = true),
        'normal',   COUNT(*) FILTER (WHERE en_oferta = false)
      )
      FROM products
    ),
    'descuentoPromedio', (
      SELECT COALESCE(ROUND(AVG(porcentaje_oferta)::numeric, 1), 0)
      FROM products
      WHERE en_oferta = true AND porcentaje_oferta IS NOT NULL
    ),
    -- mes en formato YYYY-MM para que el servicio lo formatee a es-AR
    'vencimientosPorMes', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('mes', mes_iso, 'cantidad', cantidad)
        ORDER BY mes_iso
      ), '[]'::jsonb)
      FROM (
        SELECT
          TO_CHAR(DATE_TRUNC('month', fecha_vencimiento::date), 'YYYY-MM') AS mes_iso,
          COUNT(*) AS cantidad
        FROM products
        WHERE fecha_vencimiento IS NOT NULL
          AND fecha_vencimiento::date BETWEEN CURRENT_DATE
          AND CURRENT_DATE + INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', fecha_vencimiento::date)
      ) sub
    )
  ) INTO resultado;

  RETURN resultado;
END;
$$;


-- --------------------------------------------------------
-- 8. Facturación electrónica ARCA (AfipSDK)
--    - alicuota_iva en products: metadata puertas adentro para
--      discriminar neto/IVA al armar el pedido de CAE (no cambia
--      el precio de venta, que ya lo incluye).
--    - Tabla facturas: 1:N con pedidos (mismo criterio que
--      pedido_historial_estados), permite reintentos sin perder
--      el historial de intentos fallidos.
-- --------------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS alicuota_iva numeric NOT NULL DEFAULT 21;

CREATE TABLE IF NOT EXISTS facturas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id        uuid NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  estado           text NOT NULL DEFAULT 'pendiente', -- pendiente | emitida | error
  tipo_comprobante integer,
  punto_venta      integer,
  nro_comprobante  integer,
  cae              text,
  cae_vencimiento  date,
  importe_total    numeric,
  respuesta_error  text,
  intentos         integer NOT NULL DEFAULT 0,
  creado_en        timestamptz NOT NULL DEFAULT now(),
  actualizado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facturas_pedido_id
  ON facturas(pedido_id);


-- --------------------------------------------------------
-- 9. PDF de la factura: URL permanente en nuestro propio
--    storage (los links que devuelve AfipSDK expiran a las 24hs).
-- --------------------------------------------------------
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS pdf_url text;


-- --------------------------------------------------------
-- 10. Banners para el carrusel de la home ("Cartelería").
--     Permite al cliente subir/ordenar/activar las fotos del
--     carrusel desde el panel admin, sin depender del
--     desarrollador para cada cambio.
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS banners (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imagen_url text NOT NULL,
  link_url   text,
  alt_texto  text NOT NULL DEFAULT '',
  orden      integer NOT NULL DEFAULT 0,
  activo     boolean NOT NULL DEFAULT true,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banners_orden
  ON banners(orden);


-- --------------------------------------------------------
-- 11. Documento del comprador para facturación electrónica
--     - perfiles.documento_tipo: 'DNI' | 'CUIT'. Reutiliza la columna `dni`
--       ya existente como el número (no se renombra: se usa en otros lados).
--       Default 'DNI' para no romper perfiles existentes.
--     - facturas.receptor_doc_tipo/receptor_doc_nro: snapshot de lo que
--       efectivamente se mandó a ARCA (DocTipo/DocNro) al emitir cada
--       comprobante, para trazabilidad aunque el perfil cambie después.
-- --------------------------------------------------------
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS documento_tipo text NOT NULL DEFAULT 'DNI';

ALTER TABLE perfiles DROP CONSTRAINT IF EXISTS perfiles_documento_tipo_check;
ALTER TABLE perfiles ADD CONSTRAINT perfiles_documento_tipo_check
  CHECK (documento_tipo IN ('DNI', 'CUIT'));

ALTER TABLE facturas ADD COLUMN IF NOT EXISTS receptor_doc_tipo integer;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS receptor_doc_nro  bigint;  -- CUIT (11 dígitos) no entra en integer


-- --------------------------------------------------------
-- 12. Normalizar pedidos.estado (text + CHECK) a tabla catálogo
--     `estados` referenciada por FK. Corte en UNA sola migración:
--     se agrega estado_id, se migran los datos, y se dropea la
--     columna/constraint viejos en el mismo script.
--
--     ⚠️ RIESGO OPERACIONAL: esta migración y el deploy del backend
--     nuevo deben aplicarse en la misma ventana, lo más juntos posible.
--     El backend viejo lee/escribe `estado` (text) y rompe apenas se
--     dropea esa columna; el backend nuevo lee/escribe `estado_id` y
--     rompe si corre contra el schema viejo (no existe la columna).
--     No hay forma de tener ambos backends funcionando a la vez contra
--     el mismo schema durante esta migración. Ejecutar envuelto en
--     BEGIN;/COMMIT; en el SQL Editor de Supabase.
--
--     `pedido_historial_estados` NO se toca: queda congelada como
--     snapshot de texto plano de cada cambio histórico, a propósito
--     (columnas estado_anterior/estado_nuevo siguen siendo text).
-- --------------------------------------------------------

-- 12a. Catálogo de estados. PK entero simple explícito (no uuid, no
--      serial/identity): son ~7 filas fijas y curadas a mano, los ids
--      se documentan acá mismo en vez de depender del autoincrement.
CREATE TABLE IF NOT EXISTS estados (
  id          smallint PRIMARY KEY,
  nombre      text NOT NULL UNIQUE,
  descripcion text,
  es_final    boolean NOT NULL DEFAULT false,
  orden       smallint NOT NULL,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

-- Metadata para mostrar (descripción/orden/es_final) — la MÁQUINA DE
-- ESTADOS real sigue viviendo en src/config/estadosPedido.ts
-- (TRANSICIONES_VALIDAS), esta tabla NO se usa para decidir transiciones.
INSERT INTO estados (id, nombre, descripcion, es_final, orden) VALUES
  (1, 'PendienteDePago',  'Pedido creado, esperando confirmación de pago.',     false, 1),
  (2, 'Confirmado',       'Pago confirmado, pendiente de preparación.',         false, 2),
  (3, 'EnPreparacion',    'El pedido se está preparando en la farmacia.',       false, 3),
  (4, 'Enviado',          'El pedido fue despachado para entrega a domicilio.', false, 4),
  (5, 'ListoParaRetirar', 'El pedido está listo para retirar en la farmacia.',  false, 5),
  (6, 'Entregado',        'El pedido fue entregado/retirado. Estado final.',    true,  6),
  (7, 'Cancelado',        'El pedido fue cancelado. Estado final.',             true,  7)
ON CONFLICT (id) DO UPDATE SET
  nombre      = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  es_final    = EXCLUDED.es_final,
  orden       = EXCLUDED.orden;

-- 12b. Agregar estado_id como NULLABLE primero, backfillear, verificar,
--      y recién ahí poner NOT NULL/DEFAULT — evita que exista una
--      ventana con datos incorrectos si el backfill tarda o falla.
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estado_id smallint REFERENCES estados(id);

UPDATE pedidos p
SET estado_id = e.id
FROM estados e
WHERE p.estado = e.nombre
  AND p.estado_id IS NULL;

-- Verificación defensiva: si algún pedido quedó sin mapear (no debería
-- pasar, dado que el CHECK constraint viejo solo permitía estos 7
-- valores), la migración aborta acá en vez de dropear la columna vieja
-- y perder el dato en silencio.
DO $$
DECLARE
  huerfanos integer;
BEGIN
  SELECT COUNT(*) INTO huerfanos FROM pedidos WHERE estado_id IS NULL;
  IF huerfanos > 0 THEN
    RAISE EXCEPTION 'Migración de estados abortada: % pedido(s) con estado sin mapear a la tabla estados', huerfanos;
  END IF;
END $$;

ALTER TABLE pedidos ALTER COLUMN estado_id SET NOT NULL;
-- 1 = 'PendienteDePago' (ver INSERT de estados arriba). Postgres no
-- permite subqueries en un DEFAULT de columna, así que el id va literal.
ALTER TABLE pedidos ALTER COLUMN estado_id SET DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_pedidos_estado_id ON pedidos(estado_id);

-- 12c. Dropear la columna vieja y su CHECK (el CHECK cae solo al
--      dropear la columna; se lo nombra igual por documentación).
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;
ALTER TABLE pedidos DROP COLUMN IF EXISTS estado;

-- 12d. cancelar_pedidos_expirados() ahora opera sobre estado_id.
--      Resuelve los ids por nombre dentro de la función (no un magic
--      number pelado) para que quede legible aunque los ids ya sean
--      estables. Se mantiene el mismo motivo fijo del cron
--      ('pago_no_recibido') introducido en la sección 6c.
CREATE OR REPLACE FUNCTION cancelar_pedidos_expirados()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  pedido_row   RECORD;
  detalle_row  RECORD;
  id_pendiente smallint;
  id_cancelado smallint;
BEGIN
  SELECT id INTO id_pendiente FROM estados WHERE nombre = 'PendienteDePago';
  SELECT id INTO id_cancelado FROM estados WHERE nombre = 'Cancelado';

  FOR pedido_row IN
    SELECT id FROM pedidos
    WHERE estado_id = id_pendiente
      AND fecha_pedido < NOW() - INTERVAL '48 hours'
  LOOP
    FOR detalle_row IN
      SELECT producto_id, cantidad
      FROM detalles_pedido
      WHERE pedido_id = pedido_row.id
        AND producto_id IS NOT NULL
    LOOP
      PERFORM restaurar_stock(detalle_row.producto_id, detalle_row.cantidad);
    END LOOP;

    UPDATE pedidos SET
      estado_id          = id_cancelado,
      fecha_cancelacion  = NOW(),
      motivo_cancelacion = 'pago_no_recibido'
    WHERE id = pedido_row.id;
  END LOOP;
END;
$$;


-- --------------------------------------------------------
-- 13. pw_site_transaction_id: referencia "humana" que Payway muestra en
--     su propio portal (ej. "CH210720261701"), distinta del pw_payment_id
--     (id numérico interno de la API, usado para paymentInfo/getAllPayments).
--     Se guarda además del pw_payment_id para poder comparar un pedido
--     contra el panel de Payway a simple vista.
-- --------------------------------------------------------
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS pw_site_transaction_id text;


-- --------------------------------------------------------
  -- 14. Atomicidad real de stock en creación/cancelación de pedidos.
  --
  --     Hasta ahora, crear un pedido era: 1) crear_pedido_completo (atómica,
  --     inserta pedido + detalles) y 2) DESPUÉS, desde Node, un loop que
  --     descuenta stock item por item con descontar_stock() — cada llamada
  --     es su propia transacción, separada del insert. Si el loop fallaba a
  --     mitad de camino (stock consumido por otro pedido en el medio, error
  --     transitorio), el pedido ya había quedado creado con el stock de
  --     algunos items descontado y el de otros no. Mismo patrón, al revés,
  --     en la cancelación (restaurar stock) — tanto la de pedidos.service.ts
  --     como la de pagos.service.ts cuando Payway rechaza un pago.
  --
  --     Acá se mueve el ajuste de stock ADENTRO de la misma transacción que
  --     el insert/update del pedido, así todo pasa o nada pasa.
  --
  --     descontar_stock()/restaurar_stock() NO se tocan — ya tienen el patrón
  --     correcto (UPDATE ... WHERE stock >= cantidad + RAISE EXCEPTION si no
  --     matchea ninguna fila) y llamarlas desde otra función plpgsql las deja
  --     corriendo dentro de la misma transacción del caller, sin duplicar esa
  --     lógica acá.
  -- --------------------------------------------------------

  -- 14a. crear_pedido_completo: mismo contrato de siempre (mismos parámetros,
  --      mismo valor de retorno), pero ahora también descuenta stock de cada
  --      item antes de devolver. Si algún item no tiene stock suficiente,
  --      descontar_stock() lanza 'stock_insuficiente' y Postgres deshace TODO
  --      (el insert del pedido, el de sus detalles, y los descuentos de stock
  --      de los items anteriores del mismo loop) — no solo ese item.
  CREATE OR REPLACE FUNCTION crear_pedido_completo(
    p_user_id                    uuid,
    p_total                      numeric,
    p_subtotal_lista             numeric,
    p_notas                      text,
    p_metodo_envio               text,
    p_costo_envio                numeric,
    p_sucursal_correo_argentino  text,
    p_codigo_postal_envio        text,
    p_metodo_pago                text,
    p_items                      jsonb,
    p_destinatario_nombre        text DEFAULT NULL,
    p_destinatario_dni           text DEFAULT NULL,
    p_destinatario_cod_area      text DEFAULT NULL,
    p_destinatario_telefono      text DEFAULT NULL
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  AS $$
  DECLARE
    nuevo_pedido pedidos%ROWTYPE;
    v_item jsonb;
  BEGIN
    INSERT INTO pedidos (
      user_id, total, subtotal_lista, notas,
      metodo_envio, costo_envio, sucursal_correo_argentino,
      codigo_postal_envio, metodo_pago,
      destinatario_nombre, destinatario_dni, destinatario_cod_area, destinatario_telefono
    ) VALUES (
      p_user_id, p_total, p_subtotal_lista, p_notas,
      p_metodo_envio, p_costo_envio, p_sucursal_correo_argentino,
      p_codigo_postal_envio, p_metodo_pago,
      p_destinatario_nombre, p_destinatario_dni, p_destinatario_cod_area, p_destinatario_telefono
    )
    RETURNING * INTO nuevo_pedido;

    INSERT INTO detalles_pedido (
      pedido_id, producto_id, nombre_producto,
      cantidad, precio_unitario, precio_lista, subtotal
    )
    SELECT
      nuevo_pedido.id,
      (item->>'producto_id')::uuid,
      item->>'nombre_producto',
      (item->>'cantidad')::int,
      (item->>'precio_unitario')::numeric,
      (item->>'precio_lista')::numeric,
      (item->>'subtotal')::numeric
    FROM jsonb_array_elements(p_items) AS item;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
      PERFORM descontar_stock((v_item->>'producto_id')::uuid, (v_item->>'cantidad')::int);
    END LOOP;

    RETURN row_to_json(nuevo_pedido)::jsonb;
  END;
  $$;

  -- 14b. cancelar_pedido_completo: cambia el estado a Cancelado y restaura el
  --      stock de todos los detalles del pedido, atómico. Un solo punto para
  --      los tres lugares que cancelaban a mano (cancelación del cliente,
  --      cancelación de admin, y pago rechazado/cancelado por Payway):
  --
  --      - p_user_id: si se pasa, exige que el pedido sea de ese usuario
  --        (caso: el cliente cancela su propio pedido).
  --      - p_estado_id_requerido: si se pasa, exige que el pedido esté
  --        exactamente en ese estado (caso: el cliente solo puede cancelar
  --        en PendienteDePago).
  --      Ambos NULL = sin esas restricciones (caso: admin, o el webhook de
  --      Payway) — la app ya valida las reglas de negocio correspondientes
  --      antes de llamar a esta función.
  --
  --      Devuelve NULL si el UPDATE no matcheó ninguna fila (no existe el
  --      pedido, no es el dueño, o no estaba en el estado requerido) — la app
  --      lo distingue de un error real.
  CREATE OR REPLACE FUNCTION cancelar_pedido_completo(
    p_pedido_id           uuid,
    p_motivo              text,
    p_user_id             uuid DEFAULT NULL,
    p_estado_id_requerido smallint DEFAULT NULL
  )
  RETURNS jsonb
  LANGUAGE plpgsql
  AS $$
  DECLARE
    id_cancelado       smallint;
    pedido_actualizado pedidos%ROWTYPE;
    detalle            RECORD;
  BEGIN
    SELECT id INTO id_cancelado FROM estados WHERE nombre = 'Cancelado';

    UPDATE pedidos SET
      estado_id          = id_cancelado,
      fecha_cancelacion  = now(),
      motivo_cancelacion = p_motivo
    WHERE id = p_pedido_id
      AND (p_user_id IS NULL OR user_id = p_user_id)
      AND (p_estado_id_requerido IS NULL OR estado_id = p_estado_id_requerido)
    RETURNING * INTO pedido_actualizado;

    IF NOT FOUND THEN
      RETURN NULL;
    END IF;

    FOR detalle IN
      SELECT producto_id, cantidad FROM detalles_pedido
      WHERE pedido_id = p_pedido_id AND producto_id IS NOT NULL
    LOOP
      PERFORM restaurar_stock(detalle.producto_id, detalle.cantidad);
    END LOOP;

    RETURN row_to_json(pedido_actualizado)::jsonb;
  END;
  $$;


-- --------------------------------------------------------
-- 15. Promoción 2x1: nuevo flag es_2x1 en products, y columna descuento en
--     detalles_pedido para guardar el monto descontado por la promo en cada
--     línea del pedido. precio_unitario se mantiene igual al de catálogo (no
--     se "promedia" con el descuento) — el descuento se resta aparte al
--     calcular subtotal, así el detalle siempre muestra el precio real de
--     lista más una línea de descuento explícita.
--
--     Regla de la promo: por cada PAR de unidades del mismo producto, 1 sale
--     gratis. cantidad=1 → 0 pares → sin descuento. cantidad=2 → 1 par →
--     descuento = 1 x precio. cantidad=3 → 1 par (la 3ra queda suelta, a
--     precio completo). Se calcula en pedidos.service.ts::crear, nunca acá.
--
--     Mutuamente excluyente con la oferta por %: si es_2x1=true, precio_oferta
--     y porcentaje_oferta se guardan en NULL (ver AdminProductosPage.tsx).
-- --------------------------------------------------------
ALTER TABLE products        ADD COLUMN IF NOT EXISTS es_2x1    boolean NOT NULL DEFAULT false;
ALTER TABLE detalles_pedido ADD COLUMN IF NOT EXISTS descuento numeric NOT NULL DEFAULT 0;

-- 15a. crear_pedido_completo: mismo contrato de siempre, con un campo nuevo
--      "descuento" por item (ya viene calculado desde pedidos.service.ts,
--      acá solo se persiste tal cual, igual que el resto de los campos).
CREATE OR REPLACE FUNCTION crear_pedido_completo(
  p_user_id                    uuid,
  p_total                      numeric,
  p_subtotal_lista             numeric,
  p_notas                      text,
  p_metodo_envio               text,
  p_costo_envio                numeric,
  p_sucursal_correo_argentino  text,
  p_codigo_postal_envio        text,
  p_metodo_pago                text,
  p_items                      jsonb,
  p_destinatario_nombre        text DEFAULT NULL,
  p_destinatario_dni           text DEFAULT NULL,
  p_destinatario_cod_area      text DEFAULT NULL,
  p_destinatario_telefono      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  nuevo_pedido pedidos%ROWTYPE;
  v_item jsonb;
BEGIN
  INSERT INTO pedidos (
    user_id, total, subtotal_lista, notas,
    metodo_envio, costo_envio, sucursal_correo_argentino,
    codigo_postal_envio, metodo_pago,
    destinatario_nombre, destinatario_dni, destinatario_cod_area, destinatario_telefono
  ) VALUES (
    p_user_id, p_total, p_subtotal_lista, p_notas,
    p_metodo_envio, p_costo_envio, p_sucursal_correo_argentino,
    p_codigo_postal_envio, p_metodo_pago,
    p_destinatario_nombre, p_destinatario_dni, p_destinatario_cod_area, p_destinatario_telefono
  )
  RETURNING * INTO nuevo_pedido;

  INSERT INTO detalles_pedido (
    pedido_id, producto_id, nombre_producto,
    cantidad, precio_unitario, precio_lista, descuento, subtotal
  )
  SELECT
    nuevo_pedido.id,
    (item->>'producto_id')::uuid,
    item->>'nombre_producto',
    (item->>'cantidad')::int,
    (item->>'precio_unitario')::numeric,
    (item->>'precio_lista')::numeric,
    COALESCE((item->>'descuento')::numeric, 0),
    (item->>'subtotal')::numeric
  FROM jsonb_array_elements(p_items) AS item;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    PERFORM descontar_stock((v_item->>'producto_id')::uuid, (v_item->>'cantidad')::int);
  END LOOP;

  RETURN row_to_json(nuevo_pedido)::jsonb;
END;
$$;

-- --------------------------------------------------------
-- 16. Eliminar columna legacy calle_numero de direcciones
--     Reemplazada por calle + altura desde la migracion 5c/5d.
--     Quedo NOT NULL sin que el backend la siga escribiendo,
--     rompiendo cualquier INSERT/UPDATE nuevo (ver PUT /api/direcciones).
--     No hay referencias a calle_numero fuera de este archivo.
-- --------------------------------------------------------
ALTER TABLE direcciones DROP COLUMN IF EXISTS calle_numero;

-- --------------------------------------------------------
-- 17. Cotización de envío vía MiCorreo (scraping) en vez de Andreani:
--     el cliente ahora elige entre 3 niveles de servicio (PAQ.AR Hoy /
--     Expreso / Clásico) en el checkout. Se guarda cuál eligió para
--     cuando se cree el envío real más adelante (todavía manual, ver
--     micorreoCotizacion.service.ts / correoArgentino.service.ts).
-- --------------------------------------------------------
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tipo_servicio_envio text;

-- 17a. crear_pedido_completo: mismo contrato de siempre, con el parámetro
--      nuevo al final con DEFAULT NULL (no rompe llamadas existentes).
CREATE OR REPLACE FUNCTION crear_pedido_completo(
  p_user_id                    uuid,
  p_total                      numeric,
  p_subtotal_lista             numeric,
  p_notas                      text,
  p_metodo_envio               text,
  p_costo_envio                numeric,
  p_sucursal_correo_argentino  text,
  p_codigo_postal_envio        text,
  p_metodo_pago                text,
  p_items                      jsonb,
  p_destinatario_nombre        text DEFAULT NULL,
  p_destinatario_dni           text DEFAULT NULL,
  p_destinatario_cod_area      text DEFAULT NULL,
  p_destinatario_telefono      text DEFAULT NULL,
  p_tipo_servicio_envio        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  nuevo_pedido pedidos%ROWTYPE;
  v_item jsonb;
BEGIN
  INSERT INTO pedidos (
    user_id, total, subtotal_lista, notas,
    metodo_envio, costo_envio, sucursal_correo_argentino,
    codigo_postal_envio, metodo_pago,
    destinatario_nombre, destinatario_dni, destinatario_cod_area, destinatario_telefono,
    tipo_servicio_envio
  ) VALUES (
    p_user_id, p_total, p_subtotal_lista, p_notas,
    p_metodo_envio, p_costo_envio, p_sucursal_correo_argentino,
    p_codigo_postal_envio, p_metodo_pago,
    p_destinatario_nombre, p_destinatario_dni, p_destinatario_cod_area, p_destinatario_telefono,
    p_tipo_servicio_envio
  )
  RETURNING * INTO nuevo_pedido;

  INSERT INTO detalles_pedido (
    pedido_id, producto_id, nombre_producto,
    cantidad, precio_unitario, precio_lista, descuento, subtotal
  )
  SELECT
    nuevo_pedido.id,
    (item->>'producto_id')::uuid,
    item->>'nombre_producto',
    (item->>'cantidad')::int,
    (item->>'precio_unitario')::numeric,
    (item->>'precio_lista')::numeric,
    COALESCE((item->>'descuento')::numeric, 0),
    (item->>'subtotal')::numeric
  FROM jsonb_array_elements(p_items) AS item;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    PERFORM descontar_stock((v_item->>'producto_id')::uuid, (v_item->>'cantidad')::int);
  END LOOP;

  RETURN row_to_json(nuevo_pedido)::jsonb;
END;
$$;

-- --------------------------------------------------------
-- 18. Sistema de cupones de descuento (fase 1): porcentaje o
--     fijo, con tope de descuento, compra mínima, vigencia por
--     fechas y límites de uso (total y por cliente). Un solo
--     cupón por pedido. El registro del canje se hace adentro
--     de crear_pedido_completo (18c) para que quede atómico con
--     la creación del pedido: lockea la fila del cupón con
--     FOR UPDATE y re-chequea los límites de uso ahí mismo, así
--     dos pedidos concurrentes con el mismo cupón cerca del
--     límite no pueden pasar los dos (mismo problema que ya
--     resuelve descontar_stock() para el stock).
-- --------------------------------------------------------

-- 18a. Tablas
CREATE TABLE IF NOT EXISTS cupones (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo                  text NOT NULL UNIQUE,
  tipo                    text NOT NULL CHECK (tipo IN ('porcentaje', 'fijo')),
  valor                   numeric NOT NULL CHECK (valor > 0),
  compra_minima           numeric NOT NULL DEFAULT 0,
  descuento_maximo        numeric,
  limite_usos_total       integer,
  limite_usos_por_cliente integer,
  valido_desde            timestamptz,
  valido_hasta            timestamptz,
  activo                  boolean NOT NULL DEFAULT true,
  creado_en               timestamptz NOT NULL DEFAULT now(),
  actualizado_en          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cupones_codigo_mayusculas CHECK (codigo = upper(codigo))
);
-- UNIQUE(codigo) ya crea el índice de búsqueda por código.

CREATE TABLE IF NOT EXISTS canjes_cupon (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cupon_id           uuid NOT NULL REFERENCES cupones(id),
  cliente_id         uuid NOT NULL REFERENCES auth.users(id),
  pedido_id          uuid NOT NULL REFERENCES pedidos(id),
  descuento_aplicado numeric NOT NULL,
  canjeado_en        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canjes_cupon_cupon_id      ON canjes_cupon(cupon_id);
CREATE INDEX IF NOT EXISTS idx_canjes_cupon_cupon_cliente ON canjes_cupon(cupon_id, cliente_id);

-- 18b. cupón aplicado a un pedido, para mostrarlo en el detalle
--      (cliente/admin) sin joinear canjes_cupon cada vez.
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cupon_id        uuid REFERENCES cupones(id);
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS descuento_cupon numeric NOT NULL DEFAULT 0;

-- 18c. crear_pedido_completo: mismo contrato de siempre, con los
--      parámetros de cupón nuevos al final con DEFAULT NULL (no
--      rompe llamadas existentes). p_descuento_cupon ya viene
--      calculado por cupones.service.ts::validarCupon del lado
--      Node (misma lógica que ya se revalidó en el preview);
--      acá solo se re-chequea que el cupón siga vigente/activo y
--      dentro de sus límites de uso, bajo lock, justo antes de
--      persistir — es la revalidación final que exige el negocio.
CREATE OR REPLACE FUNCTION crear_pedido_completo(
  p_user_id                    uuid,
  p_total                      numeric,
  p_subtotal_lista             numeric,
  p_notas                      text,
  p_metodo_envio               text,
  p_costo_envio                numeric,
  p_sucursal_correo_argentino  text,
  p_codigo_postal_envio        text,
  p_metodo_pago                text,
  p_items                      jsonb,
  p_destinatario_nombre        text DEFAULT NULL,
  p_destinatario_dni           text DEFAULT NULL,
  p_destinatario_cod_area      text DEFAULT NULL,
  p_destinatario_telefono      text DEFAULT NULL,
  p_tipo_servicio_envio        text DEFAULT NULL,
  p_cupon_id                   uuid DEFAULT NULL,
  p_descuento_cupon            numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  nuevo_pedido     pedidos%ROWTYPE;
  v_item           jsonb;
  v_cupon_activo   boolean;
  v_limite_total   integer;
  v_limite_cliente integer;
  v_usos_totales   integer;
  v_usos_cliente   integer;
BEGIN
  IF p_cupon_id IS NOT NULL THEN
    -- Lockea la fila del cupón: serializa canjes concurrentes del
    -- mismo cupón para que el chequeo de límites de abajo sea
    -- confiable (si no, dos requests simultáneos podrían leer el
    -- mismo conteo "viejo" y los dos pasar el límite).
    SELECT activo, limite_usos_total, limite_usos_por_cliente
      INTO v_cupon_activo, v_limite_total, v_limite_cliente
      FROM cupones WHERE id = p_cupon_id FOR UPDATE;

    IF NOT FOUND OR NOT v_cupon_activo THEN
      RAISE EXCEPTION 'cupon_invalido';
    END IF;

    IF v_limite_total IS NOT NULL THEN
      SELECT count(*) INTO v_usos_totales FROM canjes_cupon WHERE cupon_id = p_cupon_id;
      IF v_usos_totales >= v_limite_total THEN
        RAISE EXCEPTION 'cupon_limite_usos_alcanzado';
      END IF;
    END IF;

    IF v_limite_cliente IS NOT NULL THEN
      SELECT count(*) INTO v_usos_cliente FROM canjes_cupon WHERE cupon_id = p_cupon_id AND cliente_id = p_user_id;
      IF v_usos_cliente >= v_limite_cliente THEN
        RAISE EXCEPTION 'cupon_limite_cliente_alcanzado';
      END IF;
    END IF;
  END IF;

  INSERT INTO pedidos (
    user_id, total, subtotal_lista, notas,
    metodo_envio, costo_envio, sucursal_correo_argentino,
    codigo_postal_envio, metodo_pago,
    destinatario_nombre, destinatario_dni, destinatario_cod_area, destinatario_telefono,
    tipo_servicio_envio, cupon_id, descuento_cupon
  ) VALUES (
    p_user_id, p_total, p_subtotal_lista, p_notas,
    p_metodo_envio, p_costo_envio, p_sucursal_correo_argentino,
    p_codigo_postal_envio, p_metodo_pago,
    p_destinatario_nombre, p_destinatario_dni, p_destinatario_cod_area, p_destinatario_telefono,
    p_tipo_servicio_envio, p_cupon_id, p_descuento_cupon
  )
  RETURNING * INTO nuevo_pedido;

  INSERT INTO detalles_pedido (
    pedido_id, producto_id, nombre_producto,
    cantidad, precio_unitario, precio_lista, descuento, subtotal
  )
  SELECT
    nuevo_pedido.id,
    (item->>'producto_id')::uuid,
    item->>'nombre_producto',
    (item->>'cantidad')::int,
    (item->>'precio_unitario')::numeric,
    (item->>'precio_lista')::numeric,
    COALESCE((item->>'descuento')::numeric, 0),
    (item->>'subtotal')::numeric
  FROM jsonb_array_elements(p_items) AS item;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    PERFORM descontar_stock((v_item->>'producto_id')::uuid, (v_item->>'cantidad')::int);
  END LOOP;

  IF p_cupon_id IS NOT NULL THEN
    INSERT INTO canjes_cupon (cupon_id, cliente_id, pedido_id, descuento_aplicado)
    VALUES (p_cupon_id, p_user_id, nuevo_pedido.id, p_descuento_cupon);
  END IF;

  RETURN row_to_json(nuevo_pedido)::jsonb;
END;
$$;

-- --------------------------------------------------------
-- 19. Sistema de puntos de fidelización (fase 2): el cliente gana
--     puntos al entregarse un pedido (1 punto cada $100 de
--     pedido.total, ver puntosConfig.ts) y los puede canjear por
--     premios de un catálogo. Se acredita recién en 'Entregado'
--     (mismo criterio que la facturación AFIP, ver sección 8 y
--     pedidos.service.ts::cambiarEstado) porque es estado terminal
--     sin cancelación posible: los puntos acreditados ahí nunca
--     necesitan revertirse. El canje usa el mismo patrón FOR UPDATE
--     que crear_pedido_completo/cupones para evitar condiciones de
--     carrera (dos canjes simultáneos del mismo cliente, o dos
--     acreditaciones del mismo pedido).
-- --------------------------------------------------------

-- 19a. Saldo cacheado en perfiles: puntos_movimientos es la fuente de
--      verdad/auditoría, esta columna evita sumar el historial completo
--      en cada lectura. Se actualiza EXCLUSIVAMENTE desde las funciones
--      plpgsql de abajo — nunca vía PUT /api/perfil.
ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS puntos_saldo integer NOT NULL DEFAULT 0;

-- Cuántos puntos generó cada pedido puntualmente (0 hasta que se entrega).
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS puntos_ganados integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS premios (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre         text NOT NULL,
  descripcion    text,
  imagen_url     text,
  costo_puntos   integer NOT NULL CHECK (costo_puntos > 0),
  stock          integer,  -- null = ilimitado (mismo criterio que cupones.limite_usos_total)
  activo         boolean NOT NULL DEFAULT true,
  creado_en      timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS canjes_premio (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid NOT NULL REFERENCES auth.users(id),
  premio_id       uuid NOT NULL REFERENCES premios(id),
  puntos_gastados integer NOT NULL,
  canjeado_en     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_canjes_premio_cliente ON canjes_premio(cliente_id);

-- Ledger de auditoría: una fila por movimiento (acreditación o canje).
CREATE TABLE IF NOT EXISTS puntos_movimientos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES auth.users(id),
  tipo       text NOT NULL CHECK (tipo IN ('acreditacion', 'canje')),
  puntos     integer NOT NULL,  -- positivo = acreditación, negativo = canje
  pedido_id  uuid REFERENCES pedidos(id),
  canje_id   uuid REFERENCES canjes_premio(id),
  creado_en  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_puntos_movimientos_cliente ON puntos_movimientos(cliente_id);

-- Garantía a nivel DB (no solo en Node) de que un mismo pedido nunca
-- acredita puntos dos veces, aunque cambiarEstado se llegue a invocar más
-- de una vez por una carrera de requests admin (además de que la máquina
-- de estados ya impide re-entrar a 'Entregado' en el mismo pedido).
CREATE UNIQUE INDEX IF NOT EXISTS idx_puntos_movimientos_pedido_acreditacion
  ON puntos_movimientos(pedido_id) WHERE tipo = 'acreditacion';

-- 19b. acreditar_puntos_pedido: se llama al marcar un pedido 'Entregado'.
--      p_puntos ya viene calculado desde Node (calcularPuntosPorPedido).
--      Si p_puntos <= 0 no hace nada (pedido de monto muy bajo).
CREATE OR REPLACE FUNCTION acreditar_puntos_pedido(
  p_pedido_id  uuid,
  p_cliente_id uuid,
  p_puntos     integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_puntos <= 0 THEN
    RETURN;
  END IF;

  -- El índice único parcial idx_puntos_movimientos_pedido_acreditacion
  -- rechaza este INSERT si el pedido ya había acreditado puntos antes.
  INSERT INTO puntos_movimientos (cliente_id, tipo, puntos, pedido_id)
  VALUES (p_cliente_id, 'acreditacion', p_puntos, p_pedido_id);

  INSERT INTO perfiles (user_id, puntos_saldo)
  VALUES (p_cliente_id, p_puntos)
  ON CONFLICT (user_id) DO UPDATE SET puntos_saldo = perfiles.puntos_saldo + p_puntos;

  UPDATE pedidos SET puntos_ganados = p_puntos WHERE id = p_pedido_id;
END;
$$;

-- 19c. canjear_premio: lockea saldo del cliente y stock del premio antes
--      de descontar, para que dos canjes concurrentes del mismo cliente
--      (o del mismo premio con stock limitado) no puedan pasar los dos.
CREATE OR REPLACE FUNCTION canjear_premio(
  p_cliente_id uuid,
  p_premio_id  uuid
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_saldo  integer;
  v_premio premios%ROWTYPE;
  v_canje  canjes_premio%ROWTYPE;
BEGIN
  SELECT puntos_saldo INTO v_saldo FROM perfiles WHERE user_id = p_cliente_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'perfil_no_encontrado';
  END IF;

  SELECT * INTO v_premio FROM premios WHERE id = p_premio_id FOR UPDATE;
  IF NOT FOUND OR NOT v_premio.activo THEN
    RAISE EXCEPTION 'premio_invalido';
  END IF;
  IF v_premio.stock IS NOT NULL AND v_premio.stock < 1 THEN
    RAISE EXCEPTION 'premio_sin_stock';
  END IF;
  IF v_saldo < v_premio.costo_puntos THEN
    RAISE EXCEPTION 'saldo_insuficiente';
  END IF;

  UPDATE perfiles SET puntos_saldo = puntos_saldo - v_premio.costo_puntos WHERE user_id = p_cliente_id;

  IF v_premio.stock IS NOT NULL THEN
    UPDATE premios SET stock = stock - 1 WHERE id = p_premio_id;
  END IF;

  INSERT INTO canjes_premio (cliente_id, premio_id, puntos_gastados)
  VALUES (p_cliente_id, p_premio_id, v_premio.costo_puntos)
  RETURNING * INTO v_canje;

  INSERT INTO puntos_movimientos (cliente_id, tipo, puntos, canje_id)
  VALUES (p_cliente_id, 'canje', -v_premio.costo_puntos, v_canje.id);

  RETURN row_to_json(v_canje)::jsonb;
END;
$$;

-- --------------------------------------------------------
-- 20. codigo_barras único en products: el chequeo real está en
--     productos.service.ts::crear (mensaje con el nombre del
--     producto existente), este índice es la garantía a nivel DB
--     para que dos altas concurrentes con el mismo código no
--     pasen las dos. Parcial (WHERE codigo_barras IS NOT NULL)
--     porque el campo es opcional y varios productos sin código
--     cargado todavía no deben chocar entre sí.
-- --------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_codigo_barras_unico
  ON products(codigo_barras) WHERE codigo_barras IS NOT NULL;
