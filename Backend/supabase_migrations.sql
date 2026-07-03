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
