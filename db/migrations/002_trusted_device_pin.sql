PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS trusted_devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  pin_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_used_at TEXT,
  expires_at INTEGER NOT NULL,
  revoked_at TEXT,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS trusted_devices_user ON trusted_devices(user_id, revoked_at, expires_at);

ALTER TABLE sessions ADD COLUMN strong_until INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN trusted_device_id TEXT REFERENCES trusted_devices(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN pin_failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN pin_locked_until INTEGER NOT NULL DEFAULT 0;
