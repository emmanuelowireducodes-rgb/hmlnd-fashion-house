PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS inventory_levels (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_sku TEXT NOT NULL,
  size TEXT NOT NULL,
  colour TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 3 CHECK (low_stock_threshold >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(product_id, variant_sku)
);
CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  variant_sku TEXT NOT NULL,
  delta INTEGER NOT NULL CHECK (delta != 0),
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS inventory_adjustments_variant ON inventory_adjustments(product_id, variant_sku, created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_levels_quantity ON inventory_levels(quantity, low_stock_threshold);
