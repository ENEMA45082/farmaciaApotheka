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
      },
    },
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
