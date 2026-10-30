PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS order_customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_hash TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES order_customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  delivery_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING','CONFIRMED','PROCESSING','SHIPPED','DELIVERED','CANCELLED')) DEFAULT 'PENDING',
  payment_status TEXT NOT NULL CHECK (payment_status IN ('UNPAID','PAID','FAILED','REFUNDED')) DEFAULT 'UNPAID',
  fulfilment_status TEXT NOT NULL CHECK (fulfilment_status IN ('UNFULFILLED','PROCESSING','SHIPPED','DELIVERED','CANCELLED')) DEFAULT 'UNFULFILLED',
  subtotal_pesewas INTEGER NOT NULL CHECK (subtotal_pesewas >= 0),
  total_pesewas INTEGER NOT NULL CHECK (total_pesewas >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at TEXT
);
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
  product_slug TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  variant_sku TEXT NOT NULL,
  size TEXT NOT NULL,
  colour TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_pesewas INTEGER NOT NULL CHECK (unit_price_pesewas >= 0),
  line_total_pesewas INTEGER NOT NULL CHECK (line_total_pesewas >= 0)
);
CREATE TABLE IF NOT EXISTS order_status_history (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id TEXT REFERENCES users(id),
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_internal_notes (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS inventory_reservations (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id TEXT NOT NULL UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  variant_sku TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL CHECK (status IN ('RESERVED','RELEASED','CONSUMED')) DEFAULT 'RESERVED',
  expires_at INTEGER NOT NULL,
  released_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS orders_status_created ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS inventory_reservations_active ON inventory_reservations(product_id, variant_sku, status, expires_at);
