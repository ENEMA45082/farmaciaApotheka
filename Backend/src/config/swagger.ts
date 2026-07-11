import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Apotheka API',
      version: '1.0.0',
      description: 'API REST de la farmacia Apotheka',
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Desarrollo' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT de Supabase Auth',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error:      { type: 'string', example: 'Producto no encontrado' },
            statusCode: { type: 'integer', example: 404 },
            code:       { type: 'string', example: 'ITEMS_LIMIT_EXCEEDED', nullable: true },
          },
        },
        Producto: {
          type: 'object',
          properties: {
            id:                { type: 'string', format: 'uuid' },
            nombre:            { type: 'string' },
            descripcion:       { type: 'string', nullable: true },
            precio:            { type: 'number' },
            en_oferta:         { type: 'boolean' },
            precio_oferta:     { type: 'number', nullable: true },
            porcentaje_oferta: { type: 'number', nullable: true },
            imagen_url:        { type: 'string', nullable: true },
            categoria_id:      { type: 'string', format: 'uuid', nullable: true },
            stock:             { type: 'integer' },
            codigo_barras:     { type: 'string', nullable: true },
            fecha_vencimiento: { type: 'string', format: 'date', nullable: true },
            imagenes:          { type: 'array', items: { type: 'string' } },
            es_venta_libre:    { type: 'boolean' },
            peso_gramos:       { type: 'number' },
            creado_en:         { type: 'string', format: 'date-time' },
          },
        },
        ProductosPaginados: {
          type: 'object',
          properties: {
            datos:        { type: 'array', items: { $ref: '#/components/schemas/Producto' } },
            total:        { type: 'integer' },
            pagina:       { type: 'integer' },
            limite:       { type: 'integer' },
            totalPaginas: { type: 'integer' },
          },
        },
        Categoria: {
          type: 'object',
          properties: {
            id:        { type: 'string', format: 'uuid' },
            nombre:    { type: 'string' },
            id_padre:  { type: 'string', format: 'uuid', nullable: true },
            creado_en: { type: 'string', format: 'date-time' },
            hijos:     { type: 'array', items: { $ref: '#/components/schemas/Categoria' } },
          },
        },
        DetallePedido: {
          type: 'object',
          properties: {
            id:               { type: 'string', format: 'uuid' },
            pedido_id:        { type: 'string', format: 'uuid' },
            producto_id:      { type: 'string', format: 'uuid', nullable: true },
            nombre_producto:  { type: 'string' },
            cantidad:         { type: 'integer' },
            precio_unitario:  { type: 'number' },
            precio_lista:     { type: 'number' },
            subtotal:         { type: 'number' },
          },
        },
        Pedido: {
          type: 'object',
          properties: {
            id:            { type: 'string', format: 'uuid' },
            user_id:       { type: 'string', format: 'uuid' },
            estado:        { type: 'string', enum: ['PendienteDePago', 'Confirmado', 'EnPreparacion', 'Enviado', 'ListoParaRetirar', 'Entregado', 'Cancelado'] },
            total:         { type: 'number' },
            nro_pedido:    { type: 'integer' },
            metodo_envio:  { type: 'string', enum: ['retiro_farmacia', 'domicilio', 'retiro_sucursal'] },
            costo_envio:   { type: 'number' },
            metodo_pago:   { type: 'string', enum: ['tarjeta', 'transferencia', 'efectivo'], nullable: true },
            fecha_pedido:  { type: 'string', format: 'date-time' },
            motivo_cancelacion: { type: 'string', nullable: true },
            detalles:      { type: 'array', items: { $ref: '#/components/schemas/DetallePedido' } },
          },
        },
        Direccion: {
          type: 'object',
          properties: {
            calle:         { type: 'string' },
            altura:        { type: 'string' },
            ciudad:        { type: 'string' },
            provincia:     { type: 'string' },
            codigo_postal: { type: 'string' },
          },
        },
        Factura: {
          type: 'object',
          properties: {
            id:               { type: 'string', format: 'uuid' },
            pedido_id:        { type: 'string', format: 'uuid' },
            estado:           { type: 'string', enum: ['pendiente', 'emitida', 'error'] },
            tipo_comprobante: { type: 'integer', nullable: true },
            punto_venta:      { type: 'integer', nullable: true },
            nro_comprobante:  { type: 'integer', nullable: true },
            cae:              { type: 'string', nullable: true },
            cae_vencimiento:  { type: 'string', format: 'date', nullable: true },
            importe_total:    { type: 'number', nullable: true },
            respuesta_error:  { type: 'string', nullable: true },
            intentos:         { type: 'integer' },
            pdf_url:          { type: 'string', nullable: true },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
