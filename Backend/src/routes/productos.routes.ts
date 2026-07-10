import { Router } from 'express';
import * as productosController from '../controllers/productos.controller';
import { requireAdmin, optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @openapi
 * /api/productos/preview-importar-precios:
 *   post:
 *     summary: Preview de importación de precios por CSV
 *     description: Recibe un archivo CSV con código de barras y precio, y retorna una vista previa de los cambios sin aplicarlos.
 *     tags: [Productos]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               archivo:
 *                 type: string
 *                 format: binary
 *                 description: Archivo CSV con columnas CodBarraPrinc y Precio (separador ";")
 *     responses:
 *       200:
 *         description: Vista previa de actualizaciones y productos no encontrados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 actualizaciones:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       codigo_barras: { type: string }
 *                       nombre:        { type: string }
 *                       precio_actual: { type: number }
 *                       precio_nuevo:  { type: number }
 *                 no_encontrados:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       codigo_barras: { type: string }
 *                       precio_csv:    { type: number }
 *       400:
 *         description: Archivo no recibido o inválido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Se requiere rol administrador
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  '/preview-importar-precios',
  requireAdmin,
  productosController.csvUploadMiddleware,
  productosController.previewImportarPrecios
);

/**
 * @openapi
 * /api/productos/confirmar-importar-precios:
 *   post:
 *     summary: Confirmar importación de precios
 *     description: Aplica la actualización de precios para los items seleccionados del preview. Máximo 500 items por request.
 *     tags: [Productos]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items]
 *             properties:
 *               items:
 *                 type: array
 *                 maxItems: 500
 *                 items:
 *                   type: object
 *                   required: [codigo_barras, precio_nuevo]
 *                   properties:
 *                     codigo_barras: { type: string }
 *                     precio_nuevo:  { type: number, minimum: 0 }
 *     responses:
 *       200:
 *         description: Resultado de la importación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 actualizados: { type: integer }
 *                 fallidos:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       codigo_barras: { type: string }
 *                       razon:         { type: string }
 *       400:
 *         description: Datos inválidos o límite de 500 items excedido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Se requiere rol administrador
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post(
  '/confirmar-importar-precios',
  requireAdmin,
  productosController.confirmarImportarPrecios
);

/**
 * @openapi
 * /api/productos:
 *   get:
 *     summary: Listar productos con filtros y paginación
 *     description: >
 *       Retorna una lista paginada de productos. Endpoint público.
 *       Si se incluye un token de administrador válido, la respuesta incluye
 *       campos adicionales como stock y fecha de vencimiento.
 *     tags: [Productos]
 *     security:
 *       - {}
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: busqueda
 *         schema: { type: string }
 *         description: Texto libre para buscar en nombre o descripción
 *       - in: query
 *         name: categoria
 *         schema: { type: string, format: uuid }
 *         description: Filtrar por ID de categoría
 *       - in: query
 *         name: categorias
 *         schema: { type: string }
 *         description: Lista de IDs de categoría separados por coma (OR entre ellas, se combina con `categoria` si ambos vienen)
 *       - in: query
 *         name: codigo_barras
 *         schema: { type: string }
 *       - in: query
 *         name: en_oferta
 *         schema: { type: boolean }
 *         description: true = solo productos en oferta
 *       - in: query
 *         name: precio_min
 *         schema: { type: number, minimum: 0 }
 *         description: Precio mínimo (ignorado si no es número válido)
 *       - in: query
 *         name: precio_max
 *         schema: { type: number, minimum: 0 }
 *         description: Precio máximo (ignorado si no es número válido)
 *       - in: query
 *         name: stock_min
 *         schema: { type: integer, minimum: 0 }
 *       - in: query
 *         name: stock_max
 *         schema: { type: integer, minimum: 0 }
 *       - in: query
 *         name: vencimiento_desde
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: vencimiento_hasta
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limite
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 12 }
 *       - in: query
 *         name: ordenar
 *         schema:
 *           type: string
 *           enum: [nombre_asc, nombre_desc, precio_asc, precio_desc]
 *     responses:
 *       200:
 *         description: Lista paginada de productos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ProductosPaginados' }
 *       429:
 *         description: Rate limit alcanzado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/', optionalAuth, productosController.listar);

/**
 * @openapi
 * /api/productos/{id}:
 *   get:
 *     summary: Obtener producto por ID
 *     tags: [Productos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: UUID del producto
 *     responses:
 *       200:
 *         description: Producto encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Producto' }
 *       400:
 *         description: ID con formato UUID inválido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.get('/:id', productosController.obtenerPorId);

/**
 * @openapi
 * /api/productos:
 *   post:
 *     summary: Crear producto
 *     description: Crea un nuevo producto. Requiere rol administrador.
 *     tags: [Productos]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nombre, precio]
 *             properties:
 *               nombre:            { type: string }
 *               descripcion:       { type: string }
 *               precio:            { type: number, minimum: 0 }
 *               en_oferta:         { type: boolean }
 *               precio_oferta:     { type: number, minimum: 0, nullable: true }
 *               porcentaje_oferta: { type: number, minimum: 0, maximum: 100, nullable: true }
 *               imagen_url:        { type: string }
 *               categoria_id:      { type: string, format: uuid }
 *               stock:             { type: integer, minimum: 0 }
 *               codigo_barras:     { type: string }
 *               fecha_vencimiento: { type: string, format: date }
 *               imagenes:          { type: array, items: { type: string } }
 *               es_venta_libre:    { type: boolean }
 *               peso_gramos:       { type: number, minimum: 0 }
 *     responses:
 *       201:
 *         description: Producto creado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Producto' }
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Se requiere rol administrador
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.post('/', requireAdmin, productosController.crear);

/**
 * @openapi
 * /api/productos/{id}:
 *   put:
 *     summary: Actualizar producto
 *     description: Actualiza los campos enviados de un producto existente. Requiere rol administrador.
 *     tags: [Productos]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:            { type: string }
 *               descripcion:       { type: string }
 *               precio:            { type: number, minimum: 0 }
 *               en_oferta:         { type: boolean }
 *               precio_oferta:     { type: number, minimum: 0, nullable: true }
 *               porcentaje_oferta: { type: number, minimum: 0, maximum: 100, nullable: true }
 *               imagen_url:        { type: string }
 *               categoria_id:      { type: string, format: uuid }
 *               stock:             { type: integer, minimum: 0 }
 *               codigo_barras:     { type: string }
 *               fecha_vencimiento: { type: string, format: date }
 *               imagenes:          { type: array, items: { type: string } }
 *               es_venta_libre:    { type: boolean }
 *               peso_gramos:       { type: number, minimum: 0 }
 *     responses:
 *       200:
 *         description: Producto actualizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Producto' }
 *       400:
 *         description: ID inválido, sin campos o datos incorrectos
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Se requiere rol administrador
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.put('/:id', requireAdmin, productosController.actualizar);

/**
 * @openapi
 * /api/productos/{id}:
 *   delete:
 *     summary: Eliminar producto
 *     description: Elimina un producto por ID. Requiere rol administrador.
 *     tags: [Productos]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204:
 *         description: Producto eliminado exitosamente
 *       400:
 *         description: ID con formato UUID inválido
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: No autorizado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Se requiere rol administrador
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       404:
 *         description: Producto no encontrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
router.delete('/:id', requireAdmin, productosController.eliminar);

export default router;
