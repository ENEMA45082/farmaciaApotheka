-- ============================================================
-- Apotheka Pharmacy -- Database Schema
-- Run this in the Supabase SQL Editor (in order)
-- ============================================================

-- 1. Categories
CREATE TABLE categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  icon_name  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Products
CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url   TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_name ON products USING GIN (to_tsvector('spanish', name));

-- 4. Seed categories
INSERT INTO categories (name, slug, icon_name) VALUES
  ('Medicamentos',            'medicamentos',    'pill'),
  ('Vitaminas y Suplementos', 'vitaminas',       'leaf'),
  ('Cuidado Personal',        'cuidado-personal','heart'),
  ('Bebé y Maternidad',       'bebe-maternidad', 'baby'),
  ('Dispositivos Médicos',    'dispositivos',    'stethoscope');
