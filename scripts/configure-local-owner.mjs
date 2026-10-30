import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";

if (process.env.NODE_ENV === "production") {
  throw new Error("Local owner configuration is disabled in production.");
}

const email = process.env.STUDIO_LOCAL_OWNER_EMAIL?.trim().toLowerCase();
const password = process.env.STUDIO_LOCAL_OWNER_PASSWORD;
if (email !== "ken@hmlnd") throw new Error("Set STUDIO_LOCAL_OWNER_EMAIL to the local owner identifier.");
if (!password || password.length < 6 || password.length > 200) {
  throw new Error("The local development password must be between 6 and 200 characters.");
}

const root = path.resolve(import.meta.dirname, "..");
const dataDir = path.resolve(process.env.STUDIO_DATA_DIR || path.join(root, ".data"));
const databasePath = path.join(dataDir, "studio.sqlite");
if (!existsSync(databasePath)) throw new Error("The existing local Studio database was not found.");
const db = new DatabaseSync(databasePath);
const salt = randomBytes(16).toString("hex");
const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;

try {
  const target = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  const owner = db.prepare("SELECT * FROM users WHERE role='OWNER' ORDER BY created_at,id LIMIT 1").get();
  if (owner && target && target.id !== owner.id && target.role !== "OWNER") {
    throw new Error("The requested login already belongs to another staff account; no account was changed.");
  }

  db.exec("BEGIN IMMEDIATE");
  try {
    const account = target?.role === "OWNER" ? target : owner || target;
    let ownerId;
    if (account) {
      db.prepare("UPDATE users SET email=?,password_hash=?,role='OWNER',enabled=1 WHERE id=?").run(email, passwordHash, account.id);
      ownerId = account.id;
    } else {
      ownerId = randomUUID();
      db.prepare("INSERT INTO users (id,email,password_hash,role,enabled) VALUES (?,?,?,'OWNER',1)").run(ownerId, email, passwordHash);
    }
    db.prepare("INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,'configure_local_owner','user',?)").run(randomUUID(), ownerId, ownerId);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
} finally {
  db.close();
}

console.info("Local development owner credentials configured.");
