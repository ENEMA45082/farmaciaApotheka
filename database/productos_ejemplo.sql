-- ============================================================
-- Apotheka -- Productos de ejemplo
-- Ejecutar en Supabase SQL Editor
-- ============================================================

INSERT INTO products (name, description, price, image_url, category_id, stock)
SELECT
  nombre, descripcion, precio, imagen, c.id, stock
FROM (VALUES
  -- Medicamentos
  ('Ibuprofeno 400mg x 20 comp.',   'Antiinflamatorio y analgésico. Alivia el dolor leve a moderado y baja la fiebre.',       850.00,  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400', 'medicamentos', 120),
  ('Paracetamol 500mg x 24 comp.',  'Analgésico y antipirético de uso frecuente. Apto para adultos y niños mayores de 12 años.', 620.00, 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400', 'medicamentos', 200),
  ('Amoxicilina 500mg x 21 cáps.',  'Antibiótico de amplio espectro. Requiere receta médica.',                                1450.00, 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=400', 'medicamentos',  60),
  ('Loratadina 10mg x 30 comp.',    'Antihistamínico de segunda generación. No produce somnolencia.',                          980.00, 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=400', 'medicamentos',  90),
  ('Omeprazol 20mg x 28 cáps.',     'Inhibidor de la bomba de protones. Trata la acidez y el reflujo gastroesofágico.',        1100.00, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400', 'medicamentos',  75),

  -- Vitaminas y Suplementos
  ('Vitamina C 1000mg x 30 comp.',  'Vitamina C de liberación sostenida. Refuerza el sistema inmunológico.',                   1200.00, 'https://images.unsplash.com/photo-1550572017-edd951aa8ca6?w=400', 'vitaminas', 150),
  ('Omega 3 x 60 cáps.',            'Ácidos grasos esenciales EPA y DHA. Contribuye a la salud cardiovascular.',               2300.00, 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400', 'vitaminas',  80),
  ('Multivitamínico Completo x 30', 'Complejo vitamínico con minerales esenciales para el bienestar diario.',                  1800.00, 'https://images.unsplash.com/photo-1550572017-edd951aa8ca6?w=400', 'vitaminas', 100),
  ('Magnesio 400mg x 60 comp.',     'Favorece el funcionamiento muscular y nervioso. Reduce el cansancio.',                    1650.00, 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400', 'vitaminas',  60),

  -- Cuidado Personal
  ('Protector Solar FPS 50+ 100ml', 'Protección UVA/UVB de amplio espectro. Textura ligera no grasa.',                        3200.00, 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400', 'cuidado-personal',  50),
  ('Crema Hidratante Corporal 400ml','Hidratación profunda con manteca de karité y vitamina E. Para todo tipo de piel.',       1900.00, 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400', 'cuidado-personal',  70),
  ('Shampoo Anticaspa 400ml',        'Fórmula con piritionato de zinc. Controla la caspa desde el primer lavado.',              1400.00, 'https://images.unsplash.com/photo-1585751119414-ef2636f8aede?w=400', 'cuidado-personal',  90),
  ('Gel Antibacterial 500ml',        'Gel de manos con 70% de alcohol. Elimina el 99.9% de las bacterias.',                     800.00, 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=400', 'cuidado-personal', 200),

  -- Bebé y Maternidad
  ('Talco para Bebé 200g',           'Talco suave libre de parabenos. Mantiene la piel del bebé fresca y seca.',                950.00, 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400', 'bebe-maternidad',  80),
  ('Termómetro Digital Infrarrojo',  'Medición en 1 segundo sin contacto. Apto para bebés desde el primer día.',              4500.00, 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400', 'bebe-maternidad',  30),
  ('Crema Pañalera 100g',            'Crea una barrera protectora con óxido de zinc. Previene y trata la dermatitis del pañal.',1100.00, 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400', 'bebe-maternidad',  60),

  -- Dispositivos Médicos
  ('Tensiómetro Digital de Brazo',   'Medición automática de presión arterial y pulso. Memoria para 60 mediciones.',           8900.00, 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=400', 'dispositivos',  25),
  ('Glucómetro + 25 tiras reactivas','Control de glucemia en sangre. Resultado en 5 segundos. Incluye lancetas.',              6500.00, 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400', 'dispositivos',  40),
  ('Nebulizador Ultrasónico',        'Tratamiento de afecciones respiratorias. Silencioso y portátil.',                        12000.00,'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400', 'dispositivos',  15)
) AS p(nombre, descripcion, precio, imagen, slug_categoria, stock)
JOIN categories c ON c.slug = p.slug_categoria;
