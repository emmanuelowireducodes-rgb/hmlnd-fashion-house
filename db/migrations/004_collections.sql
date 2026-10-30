PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  cover_image TEXT NOT NULL DEFAULT '',
  seo_title TEXT NOT NULL DEFAULT '',
  seo_description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL CHECK (status IN ('DRAFT','PUBLISHED','ARCHIVED')) DEFAULT 'DRAFT',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  archived_at TEXT
);
CREATE TABLE IF NOT EXISTS product_collections (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(product_id, collection_id)
);
CREATE INDEX IF NOT EXISTS product_collections_order ON product_collections(collection_id, position, product_id);
CREATE INDEX IF NOT EXISTS collections_status ON collections(status, updated_at DESC);
