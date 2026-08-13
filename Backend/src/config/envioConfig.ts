// Dimensiones de caja estándar usadas para cotizar/crear envíos mientras
// los productos no tengan dimensiones propias (solo existe peso_gramos).
// Largo=27 / Ancho=21 / Alto=13cm — la medida "default" ya guardada en la
// cuenta de MiCorreo (ver micorreoScraper.ts::completarPaquete, que mapea
// altoCm/anchoCm/largoCm a los campos "Alto"/"Ancho"/"Largo" del form).
export const CAJA_ESTANDAR_CM = { height: 13, width: 21, length: 27 };

export const VALOR_DECLARADO_MINIMO = 1000;

// Default temporal más alto (antes 500g) mientras el catálogo tenga productos
// sin peso_gramos cargado — evita cotizar con pesos irreales (0-500g) que no
// reflejan lo que realmente se envía. Ajustar/bajar una vez que el catálogo
// tenga pesos reales cargados producto por producto.
export const PESO_DEFAULT_GRAMOS = 3000;
