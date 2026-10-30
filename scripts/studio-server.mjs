import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.resolve(process.env.STUDIO_DATA_DIR || path.join(root, ".data"));
await mkdir(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, "studio.sqlite"));
db.exec(await readFile(path.join(root, "db/migrations/001_studio.sql"), "utf8"));
db.exec(
  "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)",
);
db.prepare("INSERT OR IGNORE INTO schema_migrations (version) VALUES (1)").run();
if (!db.prepare("SELECT 1 FROM schema_migrations WHERE version=2").get()) {
  db.exec(await readFile(path.join(root, "db/migrations/002_trusted_device_pin.sql"), "utf8"));
  db.prepare("INSERT INTO schema_migrations (version) VALUES (2)").run();
}
if (!db.prepare("SELECT 1 FROM schema_migrations WHERE version=3").get()) {
  db.exec(await readFile(path.join(root, "db/migrations/003_products.sql"), "utf8"));
  db.prepare("INSERT INTO schema_migrations (version) VALUES (3)").run();
}
if (!db.prepare("SELECT 1 FROM schema_migrations WHERE version=4").get()) {
  db.exec(await readFile(path.join(root, "db/migrations/004_collections.sql"), "utf8"));
  db.prepare("INSERT INTO schema_migrations (version) VALUES (4)").run();
}
if (!db.prepare("SELECT 1 FROM schema_migrations WHERE version=5").get()) {
  db.exec(await readFile(path.join(root, "db/migrations/005_inventory.sql"), "utf8"));
  db.prepare("INSERT INTO schema_migrations (version) VALUES (5)").run();
}
if (!db.prepare("SELECT 1 FROM schema_migrations WHERE version=6").get()) {
  db.exec(await readFile(path.join(root, "db/migrations/006_orders.sql"), "utf8"));
  db.prepare("INSERT INTO schema_migrations (version) VALUES (6)").run();
}
const now = () => Date.now();
const hash = (value) => createHash("sha256").update(value).digest("hex");
const sessionTtlMs = Number(process.env.STUDIO_SESSION_TTL_MS) || 8 * 60 * 60_000;
const pinMaxAttempts = Math.max(3, Math.min(10, Number(process.env.STUDIO_PIN_MAX_ATTEMPTS) || 5));
const pinLockMs = Math.max(200, Number(process.env.STUDIO_PIN_LOCK_MS) || 15 * 60_000);
const pinPepper = process.env.STUDIO_PIN_PEPPER || "";
const devOrigins = new Set(
  (process.env.STUDIO_DEV_ORIGINS || "http://localhost:5173,http://127.0.0.1:5173")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
if (process.env.NODE_ENV === "production" && pinPepper.length < 32) {
  throw new Error("Production PIN unlock requires STUDIO_PIN_PEPPER with at least 32 characters.");
}
const passwordHash = (password) => {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
};
const passwordMatches = (password, stored) => {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const actual = scryptSync(password, salt, 64);
  const expected = Buffer.from(digest, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};
const pinHash = (pin) => passwordHash(`${pin}:${pinPepper}`);
const pinMatches = (pin, stored) => passwordMatches(`${pin}:${pinPepper}`, stored);
const cookieFlags = process.env.NODE_ENV === "production" ? "; Secure" : "";
const sessionCookie = (token, maxAge = Math.floor(sessionTtlMs / 1000)) =>
  `hmlnd_studio=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${cookieFlags}`;
const trustedCookie = (token, maxAge = 30 * 24 * 60 * 60) =>
  `hmlnd_trusted=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${cookieFlags}`;
function createSession(user, { strong = false, trustedDeviceId = null } = {}) {
  const rawToken = randomBytes(32).toString("base64url");
  db.prepare(
    "INSERT INTO sessions (token_hash,user_id,expires_at,strong_until,trusted_device_id) VALUES (?,?,?,?,?)",
  ).run(
    hash(rawToken),
    user.id,
    now() + sessionTtlMs,
    strong ? now() + 5 * 60_000 : 0,
    trustedDeviceId,
  );
  return rawToken;
}

const safeContentUrl = (value) =>
  (value.startsWith("/") && !value.startsWith("//")) || /^https:\/\//i.test(value);
const bootstrapEmail = process.env.STUDIO_BOOTSTRAP_EMAIL?.trim();
const bootstrapPassword = process.env.STUDIO_BOOTSTRAP_PASSWORD;
if (
  bootstrapEmail &&
  bootstrapPassword &&
  !db.prepare("SELECT 1 FROM users WHERE role='OWNER'").get()
) {
  if (bootstrapPassword.length < 14)
    throw new Error("STUDIO_BOOTSTRAP_PASSWORD must be at least 14 characters.");
  db.prepare("INSERT INTO users (id,email,password_hash,role) VALUES (?,?,?,'OWNER')").run(
    randomUUID(),
    bootstrapEmail,
    passwordHash(bootstrapPassword),
  );
  console.info(
    `Created local Studio owner ${bootstrapEmail}. Remove bootstrap credentials from the environment now.`,
  );
}

const defaultDocument = {
  schemaVersion: 1,
  designSystem: {
    colors: { background: "#FFFFFF", text: "#000000", accent: "#E99801" },
    typography: { headingFont: "Belleza", bodyFont: "Roboto Condensed", size: "standard" },
    buttonStyle: "square",
    spacing: "compact",
    sectionDefaults: { heroOverlay: "standard" },
  },
  sections: [
    {
      id: "mainline",
      type: "hero",
      title: "Mainline",
      eyebrow: "Discover our essentials",
      cta: "Shop Now",
      href: "/collections/mainline",
      image: "/images/hero-mainline.jpg",
      alt: "Model wearing HMLND streetwear in a sunlit concrete space",
      focalX: 50,
      focalY: 50,
      visible: true,
      order: 0,
      desktop: { x: 50, y: 68, align: "center" },
      tablet: { x: 20, y: 70, align: "left" },
      mobile: { x: 50, y: 76, align: "center" },
    },
    {
      id: "summer",
      type: "hero",
      title: "Summer Christian Shirts",
      eyebrow: "HMLND Summer Christian Shirts",
      cta: "Shop Now",
      href: "/collections/summer-christian-shirts",
      image: "/images/hero-summer.jpg",
      alt: "Two models in white linen shirts on a rocky coastline at sunset",
      focalX: 50,
      focalY: 50,
      visible: true,
      order: 1,
      desktop: { x: 82, y: 68, align: "right" },
      tablet: { x: 50, y: 72, align: "center" },
      mobile: { x: 50, y: 76, align: "center" },
    },
    {
      id: "customised",
      type: "hero",
      title: "Customised",
      eyebrow: "Create your idea with us",
      cta: "Start Creating",
      href: "/customised",
      image: "/images/hero-customised.jpg",
      alt: "A tailor's hands finishing a black garment on a wooden table",
      focalX: 50,
      focalY: 50,
      visible: true,
      order: 2,
      desktop: { x: 50, y: 68, align: "center" },
      tablet: { x: 50, y: 72, align: "center" },
      mobile: { x: 50, y: 76, align: "center" },
    },
    { id: "projects", type: "projects", title: "Projects", visible: true, order: 3 },
    { id: "newsletter", type: "newsletter", title: "Newsletter", visible: true, order: 4 },
  ],
};
const designSystemSchema = z
  .object({
    colors: z
      .object({
        background: z.string().regex(/^#[0-9a-f]{6}$/i),
        text: z.string().regex(/^#[0-9a-f]{6}$/i),
        accent: z.string().regex(/^#[0-9a-f]{6}$/i),
      })
      .strict(),
    typography: z
      .object({
        headingFont: z.enum(["Belleza", "Roboto Condensed", "Cormorant Garamond", "Futura PT"]),
        bodyFont: z.enum(["Belleza", "Roboto Condensed", "Cormorant Garamond", "Futura PT"]),
        size: z.enum(["small", "standard", "large"]),
      })
      .strict(),
    buttonStyle: z.enum(["square", "soft", "pill"]),
    spacing: z.enum(["compact", "standard", "spacious"]),
    sectionDefaults: z.object({ heroOverlay: z.enum(["soft", "standard", "strong"]) }).strict(),
  })
  .strict();
const documentSchema = z
  .object({
    schemaVersion: z.literal(1),
    designSystem: designSystemSchema.optional(),
    sections: z
      .array(
        z.object({
          id: z.string().min(1).max(80),
          type: z.enum(["hero", "projects", "newsletter"]),
          title: z.string().max(180).optional(),
          eyebrow: z.string().max(180).optional(),
          cta: z.string().max(80).optional(),
          href: z
            .string()
            .max(300)
            .refine(safeContentUrl, "Use a relative path or HTTPS URL.")
            .optional(),
          image: z
            .string()
            .max(500)
            .refine(safeContentUrl, "Use a local path or HTTPS image URL.")
            .optional(),
          alt: z.string().max(300).optional(),
          focalX: z.number().min(0).max(100).optional(),
          focalY: z.number().min(0).max(100).optional(),
          visible: z.boolean(),
          order: z.number().int().min(0).max(100),
          desktop: z
            .object({
              x: z.number().min(5).max(95),
              y: z.number().min(5).max(95),
              align: z.enum(["left", "center", "right"]),
              ctaX: z.number().min(5).max(95).optional(),
              ctaY: z.number().min(5).max(95).optional(),
            })
            .optional(),
          tablet: z
            .object({
              x: z.number().min(5).max(95),
              y: z.number().min(5).max(95),
              align: z.enum(["left", "center", "right"]),
              ctaX: z.number().min(5).max(95).optional(),
              ctaY: z.number().min(5).max(95).optional(),
            })
            .optional(),
          mobile: z
            .object({
              x: z.number().min(5).max(95),
              y: z.number().min(5).max(95),
              align: z.enum(["left", "center", "right"]),
              ctaX: z.number().min(5).max(95).optional(),
              ctaY: z.number().min(5).max(95).optional(),
            })
            .optional(),
        }),
      )
      .max(30),
  })
  .strict();

function ensurePage(user) {
  let page = db.prepare("SELECT * FROM pages WHERE slug='/'").get();
  if (!page) {
    const pageId = randomUUID();
    db.prepare("INSERT INTO pages (id,slug,title) VALUES (?, '/', 'Home')").run(pageId);
    const revisionId = randomUUID();
    db.prepare(
      "INSERT INTO page_revisions (id,page_id,revision,status,document_json,editor_id) VALUES (?,?,1,'PUBLISHED',?,?)",
    ).run(revisionId, pageId, JSON.stringify(defaultDocument), user.id);
    db.prepare("UPDATE pages SET published_revision_id=? WHERE id=?").run(revisionId, pageId);
    page = db.prepare("SELECT * FROM pages WHERE id=?").get(pageId);
  }
  return page;
}
const roleCan = (role, permission) =>
  role === "OWNER" ||
  role === "ADMIN" ||
  (permission === "design" && role === "DESIGN_EDITOR") ||
  (permission === "content" && role === "CONTENT_EDITOR");
const cookieValue = (request, name) =>
  (request.headers.cookie || "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${name}=`))
    ?.slice(name.length + 1);
const stronglyAuthenticated = (session) => Boolean(session && session.strong_until > now());
function send(response, status, value, headers = {}) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...headers,
  });
  response.end(JSON.stringify(value));
}
const productJson = (row, publicOnly = false) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  description: row.description,
  sku: row.sku,
  pricePesewas: row.price_pesewas,
  category: row.category,
  status: row.status,
  images: JSON.parse(row.images_json),
  sizes: JSON.parse(row.sizes_json),
  colours: JSON.parse(row.colours_json),
  variants: JSON.parse(row.variants_json).map((variant) => {
    const stock = db
      .prepare("SELECT quantity FROM inventory_levels WHERE product_id=? AND variant_sku=?")
      .get(row.id, variant.sku);
    const reserved = publicOnly
      ? db
          .prepare(
            "SELECT COALESCE(SUM(quantity),0) AS quantity FROM inventory_reservations WHERE product_id=? AND variant_sku=? AND status='RESERVED' AND expires_at>?",
          )
          .get(row.id, variant.sku, now()).quantity
      : 0;
    return {
      ...variant,
      ...(publicOnly ? { available: (stock?.quantity || 0) - reserved > 0 } : {}),
    };
  }),
  seoTitle: row.seo_title,
  seoDescription: row.seo_description,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  archivedAt: row.archived_at,
  collectionIds: db
    .prepare(
      publicOnly
        ? "SELECT pc.collection_id FROM product_collections pc JOIN collections c ON c.id=pc.collection_id WHERE pc.product_id=? AND c.status='PUBLISHED' ORDER BY pc.position"
        : "SELECT collection_id FROM product_collections WHERE product_id=? ORDER BY position",
    )
    .all(row.id)
    .map((item) => item.collection_id),
});
function auditProduct(actorId, action, productId) {
  db.prepare(
    "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,?,'product',?)",
  ).run(randomUUID(), actorId, action, productId);
}
function releaseExpiredReservations() {
  const expired = db
    .prepare(
      "SELECT DISTINCT r.order_id FROM inventory_reservations r JOIN orders o ON o.id=r.order_id WHERE r.status='RESERVED' AND r.expires_at<=? AND o.status IN ('PENDING','CONFIRMED','PROCESSING') AND o.payment_status='UNPAID'",
    )
    .all(now());
  for (const { order_id: orderId } of expired) {
    db.exec("BEGIN IMMEDIATE");
    try {
      db.prepare(
        "UPDATE inventory_reservations SET status='RELEASED',released_at=CURRENT_TIMESTAMP WHERE order_id=? AND status='RESERVED' AND expires_at<=?",
      ).run(orderId, now());
      const order = db.prepare("SELECT status,payment_status FROM orders WHERE id=?").get(orderId);
      if (
        order &&
        ["PENDING", "CONFIRMED", "PROCESSING"].includes(order.status) &&
        order.payment_status === "UNPAID"
      ) {
        db.prepare(
          "UPDATE orders SET status='CANCELLED',fulfilment_status='CANCELLED',cancelled_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
        ).run(orderId);
        db.prepare(
          "INSERT INTO order_status_history (id,order_id,from_status,to_status,note) VALUES (?,?,?,'CANCELLED','Inventory reservation expired')",
        ).run(randomUUID(), orderId, order.status);
        db.prepare(
          "INSERT INTO audit_events (id,action,entity_type,entity_id,details_json) VALUES (?,?,'order',?,?)",
        ).run(
          randomUUID(),
          "order_reservation_expired",
          orderId,
          JSON.stringify({ release: true }),
        );
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}
function orderDetails(orderId) {
  const order = db
    .prepare(
      "SELECT o.*,c.email AS account_email FROM orders o JOIN order_customers c ON c.id=o.customer_id WHERE o.id=?",
    )
    .get(orderId);
  if (!order) return null;
  return {
    id: order.id,
    reference: order.reference,
    status: order.status,
    paymentStatus: order.payment_status,
    fulfilmentStatus: order.fulfilment_status,
    customer: {
      name: order.customer_name,
      email: order.customer_email,
      phone: order.customer_phone,
    },
    delivery: JSON.parse(order.delivery_json),
    subtotalPesewas: order.subtotal_pesewas,
    totalPesewas: order.total_pesewas,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    cancelledAt: order.cancelled_at,
    items: db
      .prepare(
        "SELECT product_name AS name,product_slug AS slug,product_sku AS productSku,variant_sku AS variantSku,size,colour,quantity,unit_price_pesewas AS unitPricePesewas,line_total_pesewas AS lineTotalPesewas FROM order_items WHERE order_id=?",
      )
      .all(orderId),
    reservations: db
      .prepare(
        "SELECT variant_sku AS variantSku,quantity,status,expires_at AS expiresAt FROM inventory_reservations WHERE order_id=?",
      )
      .all(orderId),
    history: db
      .prepare(
        "SELECT h.from_status AS fromStatus,h.to_status AS toStatus,h.note,h.created_at AS createdAt,u.email AS actor FROM order_status_history h LEFT JOIN users u ON u.id=h.actor_id WHERE h.order_id=? ORDER BY h.created_at,h.id",
      )
      .all(orderId),
    notes: db
      .prepare(
        "SELECT n.note,n.created_at AS createdAt,u.email AS actor FROM order_internal_notes n JOIN users u ON u.id=n.actor_id WHERE n.order_id=? ORDER BY n.created_at DESC",
      )
      .all(orderId),
  };
}
async function body(request, limit = 1_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
let loginAttempts = new Map();
let orderCreationAttempts = new Map();
let pinIpAttempts = new Map();
let reauthAttempts = new Map();
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
    if (!url.pathname.startsWith("/api/studio/") && !url.pathname.startsWith("/api/site/"))
      return send(response, 404, { error: "Not found" });
    if (request.method !== "GET" && request.headers.origin) {
      const requestOrigin = request.headers.origin;
      const sameHostOrigin =
        requestOrigin === `http://${request.headers.host}` ||
        requestOrigin === `https://${request.headers.host}`;
      const localProxyOrigin =
        devOrigins.has(requestOrigin) && request.headers.host === "127.0.0.1:4310";
      if (!sameHostOrigin && !localProxyOrigin)
        return send(response, 403, { error: "Cross-origin request denied" });
    }
    if (request.method === "GET" && url.pathname === "/api/site/home") {
      const page = db.prepare("SELECT published_revision_id FROM pages WHERE slug='/'").get();
      if (!page?.published_revision_id)
        return send(response, 200, defaultDocument, { "cache-control": "public, max-age=15" });
      const revision = db
        .prepare("SELECT document_json FROM page_revisions WHERE id=? AND status='PUBLISHED'")
        .get(page.published_revision_id);
      return send(response, 200, revision ? JSON.parse(revision.document_json) : defaultDocument, {
        "cache-control": "public, max-age=15",
      });
    }
    const token = cookieValue(request, "hmlnd_studio");
    const trustedToken = cookieValue(request, "hmlnd_trusted");
    const session =
      token &&
      db
        .prepare(
          "SELECT users.id,users.email,users.role,users.enabled,sessions.expires_at,sessions.strong_until,sessions.trusted_device_id FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=?",
        )
        .get(hash(decodeURIComponent(token)));
    const user = session && session.enabled && session.expires_at > now() ? session : null;
    if (url.pathname === "/api/site/orders" && request.method === "POST") {
      const orderIp = request.socket.remoteAddress || "unknown";
      const orderWindow = orderCreationAttempts.get(orderIp) || { count: 0, since: now() };
      if (now() - orderWindow.since > 10 * 60_000) {
        orderWindow.count = 0;
        orderWindow.since = now();
      }
      if (orderWindow.count >= 12)
        return send(response, 429, { error: "Too many order attempts. Try again later." });
      orderWindow.count++;
      orderCreationAttempts.set(orderIp, orderWindow);
      const idempotencyKey = request.headers["idempotency-key"];
      if (
        typeof idempotencyKey !== "string" ||
        !z.string().uuid().safeParse(idempotencyKey).success
      )
        return send(response, 400, { error: "A valid Idempotency-Key header is required." });
      const schema = z.object({
        customer: z.object({
          name: z.string().trim().min(2).max(160),
          email: z.string().trim().email().max(254),
          phone: z.string().trim().min(7).max(32),
        }),
        delivery: z.object({
          address: z.string().trim().min(4).max(300),
          city: z.string().trim().min(2).max(100),
          region: z.string().trim().min(2).max(100),
          instructions: z.string().max(500).default(""),
        }),
        items: z
          .array(
            z.object({
              productId: z.string().uuid(),
              variantSku: z.string().trim().min(1).max(80),
              quantity: z.number().int().min(1).max(20),
            }),
          )
          .min(1)
          .max(25),
      });
      const parsed = schema.safeParse(await body(request, 20_000));
      if (!parsed.success)
        return send(response, 400, { error: "Invalid order or delivery details." });
      if (
        new Set(parsed.data.items.map((item) => `${item.productId}:${item.variantSku}`)).size !==
        parsed.data.items.length
      )
        return send(response, 400, { error: "Combine repeated variants into one order line." });
      const requestHash = hash(JSON.stringify(parsed.data));
      releaseExpiredReservations();
      db.exec("BEGIN IMMEDIATE");
      try {
        const previous = db
          .prepare("SELECT id,request_hash FROM orders WHERE idempotency_key=?")
          .get(idempotencyKey);
        if (previous) {
          db.exec("ROLLBACK");
          if (previous.request_hash !== requestHash)
            return send(response, 409, {
              error: "Idempotency key was already used for a different order.",
            });
          return send(response, 200, { ...orderDetails(previous.id), idempotentReplay: true });
        }
        const lines = [];
        let subtotal = 0;
        for (const item of parsed.data.items) {
          const product = db
            .prepare("SELECT * FROM products WHERE id=? AND status='PUBLISHED'")
            .get(item.productId);
          if (!product) {
            db.exec("ROLLBACK");
            return send(response, 400, { error: "An item is not currently available." });
          }
          const variant = JSON.parse(product.variants_json).find(
            (row) => row.sku === item.variantSku,
          );
          if (!variant) {
            db.exec("ROLLBACK");
            return send(response, 400, { error: "A selected product variant is not available." });
          }
          const inventory = db
            .prepare("SELECT quantity FROM inventory_levels WHERE product_id=? AND variant_sku=?")
            .get(product.id, variant.sku);
          const reserved = db
            .prepare(
              "SELECT COALESCE(SUM(quantity),0) AS quantity FROM inventory_reservations WHERE product_id=? AND variant_sku=? AND status='RESERVED' AND expires_at>?",
            )
            .get(product.id, variant.sku, now()).quantity;
          if (!inventory || inventory.quantity - reserved < item.quantity) {
            db.exec("ROLLBACK");
            return send(response, 409, {
              error: `Insufficient available stock for ${product.name} (${variant.size} / ${variant.colour}).`,
            });
          }
          const lineTotal = product.price_pesewas * item.quantity;
          subtotal += lineTotal;
          lines.push({ ...item, product, variant, unitPrice: product.price_pesewas, lineTotal });
        }
        const customerId = randomUUID();
        db.prepare(
          "INSERT INTO order_customers (id,email,full_name,phone) VALUES (?,?,?,?) ON CONFLICT(email) DO UPDATE SET full_name=excluded.full_name,phone=excluded.phone,updated_at=CURRENT_TIMESTAMP",
        ).run(
          customerId,
          parsed.data.customer.email,
          parsed.data.customer.name,
          parsed.data.customer.phone,
        );
        const customer = db
          .prepare("SELECT id FROM order_customers WHERE email=?")
          .get(parsed.data.customer.email);
        const orderId = randomUUID();
        const reference = `HML-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(3).toString("hex").toUpperCase()}`;
        db.prepare(
          "INSERT INTO orders (id,reference,idempotency_key,request_hash,customer_id,customer_name,customer_email,customer_phone,delivery_json,status,payment_status,fulfilment_status,subtotal_pesewas,total_pesewas) VALUES (?,?,?,?,?,?,?,?,?,'PENDING','UNPAID','UNFULFILLED',?,?)",
        ).run(
          orderId,
          reference,
          idempotencyKey,
          requestHash,
          customer.id,
          parsed.data.customer.name,
          parsed.data.customer.email,
          parsed.data.customer.phone,
          JSON.stringify(parsed.data.delivery),
          subtotal,
          subtotal,
        );
        const expiresAt = now() + 30 * 60_000;
        for (const line of lines) {
          const itemId = randomUUID();
          db.prepare(
            "INSERT INTO order_items (id,order_id,product_id,product_slug,product_name,product_sku,variant_sku,size,colour,quantity,unit_price_pesewas,line_total_pesewas) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
          ).run(
            itemId,
            orderId,
            line.product.id,
            line.product.slug,
            line.product.name,
            line.product.sku,
            line.variant.sku,
            line.variant.size,
            line.variant.colour,
            line.quantity,
            line.unitPrice,
            line.lineTotal,
          );
          db.prepare(
            "INSERT INTO inventory_reservations (id,order_id,order_item_id,product_id,variant_sku,quantity,expires_at) VALUES (?,?,?,?,?,?,?)",
          ).run(
            randomUUID(),
            orderId,
            itemId,
            line.product.id,
            line.variant.sku,
            line.quantity,
            expiresAt,
          );
        }
        db.prepare(
          "INSERT INTO order_status_history (id,order_id,to_status,note) VALUES (?,?,?,'Order created; payment not configured')",
        ).run(randomUUID(), orderId, "PENDING");
        db.prepare(
          "INSERT INTO audit_events (id,action,entity_type,entity_id,details_json) VALUES (?,?,'order',?,?)",
        ).run(
          randomUUID(),
          "order_created",
          orderId,
          JSON.stringify({ subtotalPesewas: subtotal, reservationExpiresAt: expiresAt }),
        );
        db.exec("COMMIT");
        return send(response, 201, { ...orderDetails(orderId), paymentIntegration: "UNAVAILABLE" });
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
    const orderStaff = user && ["OWNER", "ADMIN", "ORDER_MANAGER"].includes(user.role);
    if (url.pathname === "/api/studio/orders" && request.method === "GET") {
      if (!user) return send(response, 401, { error: "Authentication required" });
      if (!orderStaff) return send(response, 403, { error: "Your role cannot view orders." });
      releaseExpiredReservations();
      const q = (url.searchParams.get("q") || "").trim().slice(0, 100);
      const status = url.searchParams.get("status");
      const allowedStatuses = [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ];
      if (status && status !== "ALL" && !allowedStatuses.includes(status))
        return send(response, 400, { error: "Invalid order status filter." });
      const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit")) || 50));
      const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
      const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
      const rows = db
        .prepare(
          `SELECT id,reference,customer_name AS customerName,customer_email AS customerEmail,status,payment_status AS paymentStatus,fulfilment_status AS fulfilmentStatus,total_pesewas AS totalPesewas,created_at AS createdAt FROM orders WHERE (?='' OR status=?) AND (?='' OR reference LIKE ? ESCAPE '\\' OR customer_name LIKE ? ESCAPE '\\' OR customer_email LIKE ? ESCAPE '\\') ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        )
        .all(
          status && status !== "ALL" ? status : "",
          status && status !== "ALL" ? status : "",
          q,
          pattern,
          pattern,
          pattern,
          limit,
          offset,
        );
      return send(response, 200, { orders: rows, limit, offset });
    }
    const orderStaffPath = url.pathname.match(
      /^\/api\/studio\/orders\/([^/]+)(?:\/(status|notes))?$/i,
    );
    if (orderStaffPath) {
      if (!user) return send(response, 401, { error: "Authentication required" });
      if (!orderStaff) return send(response, 403, { error: "Your role cannot manage orders." });
      const key = decodeURIComponent(orderStaffPath[1]);
      const order = db.prepare("SELECT id FROM orders WHERE id=? OR reference=?").get(key, key);
      if (!order) return send(response, 404, { error: "Order not found." });
      const suffix = orderStaffPath[2];
      if (!suffix && request.method === "GET")
        return send(response, 200, {
          ...orderDetails(order.id),
          paymentIntegration: "UNAVAILABLE",
        });
      if (suffix === "notes" && request.method === "POST") {
        const parsed = z
          .object({ note: z.string().trim().min(2).max(4000) })
          .safeParse(await body(request, 5000));
        if (!parsed.success)
          return send(response, 400, { error: "Internal note must contain 2 to 4000 characters." });
        db.prepare(
          "INSERT INTO order_internal_notes (id,order_id,note,actor_id) VALUES (?,?,?,?)",
        ).run(randomUUID(), order.id, parsed.data.note, user.id);
        db.prepare(
          "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,?,'order',?)",
        ).run(randomUUID(), user.id, "order_note_added", order.id);
        return send(response, 201, { ok: true });
      }
      if (suffix === "status" && request.method === "POST") {
        const parsed = z
          .object({
            status: z.enum([
              "PENDING",
              "CONFIRMED",
              "PROCESSING",
              "SHIPPED",
              "DELIVERED",
              "CANCELLED",
            ]),
            note: z.string().max(500).default(""),
          })
          .safeParse(await body(request, 2048));
        if (!parsed.success) return send(response, 400, { error: "Invalid order status." });
        db.exec("BEGIN IMMEDIATE");
        try {
          const current = db
            .prepare("SELECT status,payment_status FROM orders WHERE id=?")
            .get(order.id);
          const transitions = {
            PENDING: ["CONFIRMED", "CANCELLED"],
            CONFIRMED: ["PROCESSING", "CANCELLED"],
            PROCESSING: ["SHIPPED", "CANCELLED"],
            SHIPPED: ["DELIVERED"],
            DELIVERED: [],
            CANCELLED: [],
          };
          if (!transitions[current.status].includes(parsed.data.status)) {
            db.exec("ROLLBACK");
            return send(response, 409, { error: "Invalid order status transition." });
          }
          if (
            ["SHIPPED", "DELIVERED"].includes(parsed.data.status) &&
            current.payment_status !== "PAID"
          ) {
            db.exec("ROLLBACK");
            return send(response, 409, {
              error: "Order cannot be fulfilled before payment is verified.",
            });
          }
          if (parsed.data.status === "CANCELLED" && parsed.data.note.trim().length < 3) {
            db.exec("ROLLBACK");
            return send(response, 400, { error: "A cancellation reason is required." });
          }
          const fulfilment =
            parsed.data.status === "CANCELLED"
              ? "CANCELLED"
              : parsed.data.status === "SHIPPED" || parsed.data.status === "DELIVERED"
                ? parsed.data.status
                : parsed.data.status === "PROCESSING"
                  ? "PROCESSING"
                  : "UNFULFILLED";
          db.prepare(
            "UPDATE orders SET status=?,fulfilment_status=?,cancelled_at=CASE WHEN ?='CANCELLED' THEN CURRENT_TIMESTAMP ELSE cancelled_at END,updated_at=CURRENT_TIMESTAMP WHERE id=?",
          ).run(parsed.data.status, fulfilment, parsed.data.status, order.id);
          if (parsed.data.status === "CANCELLED")
            db.prepare(
              "UPDATE inventory_reservations SET status='RELEASED',released_at=CURRENT_TIMESTAMP WHERE order_id=? AND status='RESERVED'",
            ).run(order.id);
          db.prepare(
            "INSERT INTO order_status_history (id,order_id,from_status,to_status,actor_id,note) VALUES (?,?,?,?,?,?)",
          ).run(
            randomUUID(),
            order.id,
            current.status,
            parsed.data.status,
            user.id,
            parsed.data.note,
          );
          db.prepare(
            "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id,details_json) VALUES (?,?,?,'order',?,?)",
          ).run(
            randomUUID(),
            user.id,
            "order_status_changed",
            order.id,
            JSON.stringify({
              from: current.status,
              to: parsed.data.status,
              note: parsed.data.note,
            }),
          );
          db.exec("COMMIT");
          return send(response, 200, orderDetails(order.id));
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      }
      return send(response, 405, { error: "Method not allowed" });
    }
    if (url.pathname === "/api/studio/inventory" && request.method === "GET") {
      if (!user) return send(response, 401, { error: "Authentication required" });
      if (!["OWNER", "ADMIN", "PRODUCT_MANAGER", "ORDER_MANAGER"].includes(user.role))
        return send(response, 403, { error: "Your role cannot view inventory." });
      const products = db
        .prepare(
          "SELECT id,name,sku,status,variants_json FROM products ORDER BY name COLLATE NOCASE",
        )
        .all();
      const rows = products.flatMap((product) =>
        JSON.parse(product.variants_json).map((variant) => {
          const level = db
            .prepare(
              "SELECT quantity,low_stock_threshold,updated_at FROM inventory_levels WHERE product_id=? AND variant_sku=?",
            )
            .get(product.id, variant.sku);
          const quantity = level?.quantity || 0;
          return {
            productId: product.id,
            productName: product.name,
            productSku: product.sku,
            productStatus: product.status,
            variantSku: variant.sku,
            size: variant.size,
            colour: variant.colour,
            quantity,
            lowStockThreshold: level?.low_stock_threshold ?? 3,
            updatedAt: level?.updated_at || null,
            stockStatus:
              quantity === 0
                ? "OUT_OF_STOCK"
                : quantity <= (level?.low_stock_threshold ?? 3)
                  ? "LOW_STOCK"
                  : "IN_STOCK",
          };
        }),
      );
      return send(response, 200, rows);
    }
    const inventoryHistoryMatch = url.pathname.match(
      /^\/api\/studio\/inventory\/history\/([0-9a-f-]+)\/([^/]+)$/i,
    );
    if (inventoryHistoryMatch && request.method === "GET") {
      if (!user) return send(response, 401, { error: "Authentication required" });
      if (!["OWNER", "ADMIN", "PRODUCT_MANAGER", "ORDER_MANAGER"].includes(user.role))
        return send(response, 403, { error: "Your role cannot view inventory." });
      const history = db
        .prepare(
          "SELECT ia.id,ia.delta,ia.quantity_before,ia.quantity_after,ia.reason,ia.created_at,u.email AS actor FROM inventory_adjustments ia JOIN users u ON u.id=ia.actor_id WHERE ia.product_id=? AND ia.variant_sku=? ORDER BY ia.created_at DESC LIMIT 100",
        )
        .all(inventoryHistoryMatch[1], decodeURIComponent(inventoryHistoryMatch[2]));
      return send(response, 200, history);
    }
    if (url.pathname === "/api/studio/inventory/adjust" && request.method === "POST") {
      if (!user) return send(response, 401, { error: "Authentication required" });
      if (!["OWNER", "ADMIN", "PRODUCT_MANAGER"].includes(user.role))
        return send(response, 403, { error: "Your role cannot adjust inventory." });
      const parsed = z
        .object({
          productId: z.string().uuid(),
          variantSku: z.string().trim().min(1).max(80),
          delta: z
            .number()
            .int()
            .min(-1000000)
            .max(1000000)
            .refine((value) => value !== 0),
          reason: z.string().trim().min(3).max(500),
        })
        .safeParse(await body(request, 4096));
      if (!parsed.success)
        return send(response, 400, {
          error: "Provide a valid variant, nonzero integer adjustment and reason.",
        });
      const { productId, variantSku, delta, reason } = parsed.data;
      db.exec("BEGIN IMMEDIATE");
      try {
        const product = db.prepare("SELECT variants_json FROM products WHERE id=?").get(productId);
        const variant =
          product && JSON.parse(product.variants_json).find((item) => item.sku === variantSku);
        if (!variant) {
          db.exec("ROLLBACK");
          return send(response, 404, { error: "Product variant not found." });
        }
        const existing = db
          .prepare(
            "SELECT quantity,low_stock_threshold FROM inventory_levels WHERE product_id=? AND variant_sku=?",
          )
          .get(productId, variantSku);
        const before = existing?.quantity || 0;
        const after = before + delta;
        const reserved = db
          .prepare(
            "SELECT COALESCE(SUM(quantity),0) AS quantity FROM inventory_reservations WHERE product_id=? AND variant_sku=? AND status='RESERVED' AND expires_at>?",
          )
          .get(productId, variantSku, now()).quantity;
        if (after < 0) {
          db.exec("ROLLBACK");
          return send(response, 400, { error: "Stock cannot be reduced below zero." });
        }
        if (after < reserved) {
          db.exec("ROLLBACK");
          return send(response, 409, {
            error: "Stock cannot be adjusted below quantities reserved for open orders.",
          });
        }
        db.prepare(
          "INSERT INTO inventory_levels (product_id,variant_sku,size,colour,quantity,low_stock_threshold) VALUES (?,?,?,?,?,?) ON CONFLICT(product_id,variant_sku) DO UPDATE SET quantity=excluded.quantity,size=excluded.size,colour=excluded.colour,updated_at=CURRENT_TIMESTAMP",
        ).run(
          productId,
          variantSku,
          variant.size,
          variant.colour,
          after,
          existing?.low_stock_threshold ?? 3,
        );
        db.prepare(
          "INSERT INTO inventory_adjustments (id,product_id,variant_sku,delta,quantity_before,quantity_after,reason,actor_id) VALUES (?,?,?,?,?,?,?,?)",
        ).run(randomUUID(), productId, variantSku, delta, before, after, reason, user.id);
        db.prepare(
          "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id,details_json) VALUES (?,?,?,'inventory',?,?)",
        ).run(
          randomUUID(),
          user.id,
          "stock_adjustment",
          productId,
          JSON.stringify({ variantSku, delta, before, after, reason }),
        );
        db.exec("COMMIT");
        return send(response, 200, {
          productId,
          variantSku,
          quantity: after,
          quantityBefore: before,
          delta,
          stockStatus:
            after === 0
              ? "OUT_OF_STOCK"
              : after <= (existing?.low_stock_threshold ?? 3)
                ? "LOW_STOCK"
                : "IN_STOCK",
        });
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }
    if (url.pathname === "/api/studio/inventory/threshold" && request.method === "POST") {
      if (!user) return send(response, 401, { error: "Authentication required" });
      if (!["OWNER", "ADMIN", "PRODUCT_MANAGER"].includes(user.role))
        return send(response, 403, { error: "Your role cannot manage inventory thresholds." });
      const parsed = z
        .object({
          productId: z.string().uuid(),
          variantSku: z.string().trim().min(1).max(80),
          threshold: z.number().int().min(0).max(1000000),
        })
        .safeParse(await body(request, 4096));
      if (!parsed.success) return send(response, 400, { error: "Invalid low-stock threshold." });
      const product = db
        .prepare("SELECT variants_json FROM products WHERE id=?")
        .get(parsed.data.productId);
      const variant =
        product &&
        JSON.parse(product.variants_json).find((item) => item.sku === parsed.data.variantSku);
      if (!variant) return send(response, 404, { error: "Product variant not found." });
      db.prepare(
        "INSERT INTO inventory_levels (product_id,variant_sku,size,colour,quantity,low_stock_threshold) VALUES (?,?,?,?,0,?) ON CONFLICT(product_id,variant_sku) DO UPDATE SET low_stock_threshold=excluded.low_stock_threshold,updated_at=CURRENT_TIMESTAMP",
      ).run(
        parsed.data.productId,
        parsed.data.variantSku,
        variant.size,
        variant.colour,
        parsed.data.threshold,
      );
      db.prepare(
        "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id,details_json) VALUES (?,?,?,'inventory',?,?)",
      ).run(
        randomUUID(),
        user.id,
        "stock_threshold_update",
        parsed.data.productId,
        JSON.stringify({ variantSku: parsed.data.variantSku, threshold: parsed.data.threshold }),
      );
      return send(response, 200, { ok: true, threshold: parsed.data.threshold });
    }
    const publicCollectionMatch = url.pathname.match(/^\/api\/site\/collections\/([a-z0-9-]+)$/i);
    if (publicCollectionMatch && request.method === "GET") {
      const collection = db
        .prepare("SELECT * FROM collections WHERE slug=? AND status='PUBLISHED'")
        .get(publicCollectionMatch[1]);
      if (!collection) return send(response, 404, { error: "Collection not found" });
      const products = db
        .prepare(
          "SELECT p.* FROM products p JOIN product_collections pc ON pc.product_id=p.id WHERE pc.collection_id=? AND p.status='PUBLISHED' ORDER BY pc.position,p.created_at DESC",
        )
        .all(collection.id);
      return send(response, 200, {
        id: collection.id,
        name: collection.name,
        slug: collection.slug,
        description: collection.description,
        coverImage: collection.cover_image,
        seoTitle: collection.seo_title,
        seoDescription: collection.seo_description,
        status: collection.status,
        products: products.map((product) => productJson(product, true)),
      });
    }
    const collectionPath = url.pathname.match(
      /^\/api\/studio\/collections(?:\/([0-9a-f-]+)(\/(archive|publish))?)?$/i,
    );
    if (collectionPath) {
      if (!user) return send(response, 401, { error: "Authentication required" });
      if (!["OWNER", "ADMIN", "PRODUCT_MANAGER"].includes(user.role))
        return send(response, 403, { error: "Your role cannot manage collections." });
      const id = collectionPath[1];
      const action = collectionPath[3];
      const readCollection = (collectionId) =>
        db.prepare("SELECT * FROM collections WHERE id=?").get(collectionId);
      const formatCollection = (row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        coverImage: row.cover_image,
        seoTitle: row.seo_title,
        seoDescription: row.seo_description,
        status: row.status,
        productIds: db
          .prepare(
            "SELECT product_id FROM product_collections WHERE collection_id=? ORDER BY position",
          )
          .all(row.id)
          .map((entry) => entry.product_id),
        products: db
          .prepare(
            "SELECT p.id,p.name,p.sku,p.status FROM products p JOIN product_collections pc ON pc.product_id=p.id WHERE pc.collection_id=? ORDER BY pc.position",
          )
          .all(row.id),
      });
      if (request.method === "GET") {
        if (id) {
          const row = readCollection(id);
          return row
            ? send(response, 200, formatCollection(row))
            : send(response, 404, { error: "Collection not found" });
        }
        return send(
          response,
          200,
          db
            .prepare("SELECT * FROM collections ORDER BY updated_at DESC")
            .all()
            .map(formatCollection),
        );
      }
      if (action === "archive" && request.method === "POST") {
        if (!readCollection(id)) return send(response, 404, { error: "Collection not found" });
        db.prepare(
          "UPDATE collections SET status='ARCHIVED',archived_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
        ).run(id);
        db.prepare(
          "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,?,'collection',?)",
        ).run(randomUUID(), user.id, "archive_collection", id);
        return send(response, 200, formatCollection(readCollection(id)));
      }
      if (action === "publish" && request.method === "POST") {
        const parsed = z.object({ published: z.boolean() }).safeParse(await body(request, 1024));
        if (!parsed.success) return send(response, 400, { error: "Invalid publication state" });
        if (!readCollection(id)) return send(response, 404, { error: "Collection not found" });
        db.prepare(
          "UPDATE collections SET status=?,archived_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?",
        ).run(parsed.data.published ? "PUBLISHED" : "DRAFT", id);
        db.prepare(
          "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,?,'collection',?)",
        ).run(
          randomUUID(),
          user.id,
          parsed.data.published ? "publish_collection" : "unpublish_collection",
          id,
        );
        return send(response, 200, formatCollection(readCollection(id)));
      }
      const schema = z.object({
        name: z.string().trim().min(1).max(160),
        slug: z
          .string()
          .trim()
          .min(1)
          .max(180)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
        description: z.string().max(10000).default(""),
        coverImage: z.string().max(1000).default(""),
        seoTitle: z.string().max(180).default(""),
        seoDescription: z.string().max(320).default(""),
        status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
        productIds: z.array(z.string().uuid()).max(100).default([]),
      });
      if (request.method === "POST" || request.method === "PUT") {
        if (request.method === "PUT" && !id)
          return send(response, 404, { error: "Collection not found" });
        const parsed = schema.safeParse(await body(request, 100_000));
        if (!parsed.success)
          return send(response, 400, {
            error: "Invalid collection data",
            issues: parsed.error.issues,
          });
        const d = parsed.data;
        const eligible = d.productIds.length
          ? db
              .prepare(
                `SELECT COUNT(*) AS count FROM products WHERE id IN (${d.productIds.map(() => "?").join(",")})`,
              )
              .get(...d.productIds).count
          : 0;
        if (eligible !== new Set(d.productIds).size)
          return send(response, 400, { error: "One or more products do not exist." });
        try {
          db.exec("BEGIN IMMEDIATE");
          let collectionId = id;
          if (request.method === "POST") {
            collectionId = randomUUID();
            db.prepare(
              "INSERT INTO collections (id,name,slug,description,cover_image,seo_title,seo_description,status,created_by) VALUES (?,?,?,?,?,?,?,?,?)",
            ).run(
              collectionId,
              d.name,
              d.slug,
              d.description,
              d.coverImage,
              d.seoTitle,
              d.seoDescription,
              d.status,
              user.id,
            );
          } else {
            if (!readCollection(id)) {
              db.exec("ROLLBACK");
              return send(response, 404, { error: "Collection not found" });
            }
            db.prepare(
              "UPDATE collections SET name=?,slug=?,description=?,cover_image=?,seo_title=?,seo_description=?,status=?,archived_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?",
            ).run(
              d.name,
              d.slug,
              d.description,
              d.coverImage,
              d.seoTitle,
              d.seoDescription,
              d.status,
              id,
            );
          }
          db.prepare("DELETE FROM product_collections WHERE collection_id=?").run(collectionId);
          const insert = db.prepare(
            "INSERT INTO product_collections (product_id,collection_id,position) VALUES (?,?,?)",
          );
          d.productIds.forEach((productId, position) =>
            insert.run(productId, collectionId, position),
          );
          db.prepare(
            "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,?,?,?)",
          ).run(
            randomUUID(),
            user.id,
            request.method === "POST" ? "create_collection" : "update_collection",
            "collection",
            collectionId,
          );
          db.exec("COMMIT");
          return send(
            response,
            request.method === "POST" ? 201 : 200,
            formatCollection(readCollection(collectionId)),
          );
        } catch (error) {
          db.exec("ROLLBACK");
          if (
            error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
            /UNIQUE constraint failed/.test(error.message)
          )
            return send(response, 409, { error: "Collection URL already exists." });
          throw error;
        }
      }
      return send(response, 405, { error: "Method not allowed" });
    }
    if (url.pathname === "/api/site/products" && request.method === "GET") {
      const products = db
        .prepare("SELECT * FROM products WHERE status='PUBLISHED' ORDER BY created_at DESC")
        .all();
      return send(
        response,
        200,
        products.map((product) => productJson(product, true)),
      );
    }
    const productPath = url.pathname.match(
      /^\/api\/studio\/products(?:\/([0-9a-f-]+)(\/(duplicate|archive|publish))?)?$/i,
    );
    if (productPath) {
      if (!user) return send(response, 401, { error: "Authentication required" });
      if (!["OWNER", "ADMIN", "PRODUCT_MANAGER"].includes(user.role))
        return send(response, 403, { error: "Your role cannot manage products." });
      const productId = productPath[1];
      const action = productPath[3];
      const productSchema = z.object({
        name: z.string().trim().min(1).max(160),
        slug: z
          .string()
          .trim()
          .min(1)
          .max(180)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
          .optional(),
        description: z.string().max(10000).default(""),
        sku: z.string().trim().min(1).max(80),
        pricePesewas: z.number().int().nonnegative().max(100000000),
        category: z.string().trim().min(1).max(80),
        status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
        images: z
          .array(
            z.object({ src: z.string().min(1).max(1000), alt: z.string().max(300).default("") }),
          )
          .max(12)
          .default([]),
        sizes: z.array(z.string().trim().min(1).max(20)).max(30).default([]),
        colours: z.array(z.string().trim().min(1).max(50)).max(30).default([]),
        collectionIds: z.array(z.string().uuid()).max(100).default([]),
        variants: z
          .array(
            z.object({
              sku: z.string().trim().min(1).max(80),
              size: z.string().max(20),
              colour: z.string().max(50),
            }),
          )
          .max(200)
          .default([]),
        seoTitle: z.string().max(180).default(""),
        seoDescription: z.string().max(320).default(""),
      });
      const canManage = () => ["OWNER", "ADMIN", "PRODUCT_MANAGER"].includes(user.role);
      const readProduct = (id) => db.prepare("SELECT * FROM products WHERE id=?").get(id);
      if (request.method === "GET") {
        if (productId) {
          const product = readProduct(productId);
          return product
            ? send(response, 200, productJson(product))
            : send(response, 404, { error: "Product not found" });
        }
        const products = db.prepare("SELECT * FROM products ORDER BY updated_at DESC").all();
        return send(response, 200, products.map(productJson));
      }
      if (action === "archive" && request.method === "POST") {
        const product = readProduct(productId);
        if (!product) return send(response, 404, { error: "Product not found" });
        db.prepare(
          "UPDATE products SET status='ARCHIVED',archived_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?",
        ).run(productId);
        auditProduct(user.id, "archive_product", productId);
        return send(response, 200, productJson(readProduct(productId)));
      }
      if (action === "publish" && request.method === "POST") {
        const parsed = z.object({ published: z.boolean() }).safeParse(await body(request, 1024));
        if (!parsed.success) return send(response, 400, { error: "Invalid publication state" });
        const product = readProduct(productId);
        if (!product) return send(response, 404, { error: "Product not found" });
        db.prepare(
          "UPDATE products SET status=?,archived_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?",
        ).run(parsed.data.published ? "PUBLISHED" : "DRAFT", productId);
        auditProduct(
          user.id,
          parsed.data.published ? "publish_product" : "unpublish_product",
          productId,
        );
        return send(response, 200, productJson(readProduct(productId)));
      }
      if (action === "duplicate" && request.method === "POST") {
        const source = readProduct(productId);
        if (!source) return send(response, 404, { error: "Product not found" });
        const id = randomUUID();
        const slug = `${source.slug}-copy-${id.slice(0, 8)}`;
        const sku = `${source.sku}-COPY-${id.slice(0, 8)}`;
        db.prepare(
          "INSERT INTO products (id,slug,name,description,sku,price_pesewas,category,status,images_json,sizes_json,colours_json,variants_json,seo_title,seo_description,created_by) VALUES (?,?,?,?,?,?,?,'DRAFT',?,?,?,?,?,?,?)",
        ).run(
          id,
          slug,
          `${source.name} (Copy)`,
          source.description,
          sku,
          source.price_pesewas,
          source.category,
          source.images_json,
          source.sizes_json,
          source.colours_json,
          JSON.stringify(
            JSON.parse(source.variants_json).map((variant) => ({
              ...variant,
              sku: `${variant.sku}-COPY-${id.slice(0, 8)}`,
            })),
          ),
          source.seo_title,
          source.seo_description,
          user.id,
        );
        auditProduct(user.id, "duplicate_product", id);
        return send(response, 201, productJson(readProduct(id)));
      }
      if (request.method === "POST" || request.method === "PUT") {
        if (request.method === "PUT" && !productId)
          return send(response, 404, { error: "Product not found" });
        const parsed = productSchema.safeParse(await body(request, 100_000));
        if (!parsed.success)
          return send(response, 400, {
            error: "Invalid product data",
            issues: parsed.error.issues.map((issue) => ({
              path: issue.path,
              message: issue.message,
            })),
          });
        if (
          parsed.data.variants.some(
            (variant) =>
              !parsed.data.sizes.includes(variant.size) ||
              !parsed.data.colours.includes(variant.colour),
          )
        )
          return send(response, 400, { error: "Variants must use a configured size and colour." });
        const d = parsed.data;
        const validCollections = d.collectionIds.length
          ? db
              .prepare(
                `SELECT COUNT(*) AS count FROM collections WHERE id IN (${d.collectionIds.map(() => "?").join(",")}) AND status!='ARCHIVED'`,
              )
              .get(...d.collectionIds).count
          : 0;
        if (validCollections !== new Set(d.collectionIds).size)
          return send(response, 400, {
            error: "One or more collections do not exist or are archived.",
          });
        const setCollections = (targetId) => {
          db.prepare("DELETE FROM product_collections WHERE product_id=?").run(targetId);
          const insert = db.prepare(
            "INSERT INTO product_collections (product_id,collection_id,position) VALUES (?,?,?)",
          );
          d.collectionIds.forEach((collectionId, position) =>
            insert.run(targetId, collectionId, position),
          );
        };
        try {
          if (request.method === "POST") {
            const id = randomUUID();
            const generatedSlug = `${
              d.name
                .toLowerCase()
                .normalize("NFKD")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "") || "product"
            }-${id.slice(0, 8)}`;
            const slug = d.slug || generatedSlug;
            db.prepare(
              "INSERT INTO products (id,slug,name,description,sku,price_pesewas,category,status,images_json,sizes_json,colours_json,variants_json,seo_title,seo_description,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            ).run(
              id,
              slug,
              d.name,
              d.description,
              d.sku,
              d.pricePesewas,
              d.category,
              d.status,
              JSON.stringify(d.images),
              JSON.stringify(d.sizes),
              JSON.stringify(d.colours),
              JSON.stringify(d.variants),
              d.seoTitle,
              d.seoDescription,
              user.id,
            );
            setCollections(id);
            auditProduct(user.id, "create_product", id);
            return send(response, 201, productJson(readProduct(id)));
          }
          if (!readProduct(productId)) return send(response, 404, { error: "Product not found" });
          db.prepare(
            "UPDATE products SET name=?,slug=COALESCE(?,slug),description=?,sku=?,price_pesewas=?,category=?,status=?,images_json=?,sizes_json=?,colours_json=?,variants_json=?,seo_title=?,seo_description=?,archived_at=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=?",
          ).run(
            d.name,
            d.slug || null,
            d.description,
            d.sku,
            d.pricePesewas,
            d.category,
            d.status,
            JSON.stringify(d.images),
            JSON.stringify(d.sizes),
            JSON.stringify(d.colours),
            JSON.stringify(d.variants),
            d.seoTitle,
            d.seoDescription,
            productId,
          );
          setCollections(productId);
          auditProduct(user.id, "update_product", productId);
          return send(response, 200, productJson(readProduct(productId)));
        } catch (error) {
          if (
            error.code === "SQLITE_CONSTRAINT_UNIQUE" ||
            /UNIQUE constraint failed/.test(error.message)
          )
            return send(response, 409, { error: "SKU or product URL already exists." });
          throw error;
        }
      }
      return send(response, 405, { error: "Method not allowed" });
    }
    if (url.pathname === "/api/studio/dashboard" && request.method === "GET") {
      if (!user) return send(response, 401, { error: "Authentication required" });
      const tables = new Set(
        db
          .prepare("SELECT name FROM sqlite_master WHERE type='table'")
          .all()
          .map((row) => row.name),
      );
      const count = (table, where = "") =>
        tables.has(table)
          ? db.prepare(`SELECT COUNT(*) AS count FROM ${table} ${where}`).get().count
          : null;
      const recentChanges = tables.has("audit_events")
        ? db
            .prepare(
              "SELECT action,entity_type,created_at FROM audit_events ORDER BY created_at DESC LIMIT 5",
            )
            .all()
        : [];
      return send(response, 200, {
        products: count("products"),
        collections: count("collections"),
        orders: count("orders"),
        pendingOrders: tables.has("orders")
          ? count("orders", "WHERE status IN ('PENDING','PROCESSING')")
          : null,
        customers: count("customers"),
        recentChanges,
        customisationRequests: count("customisation_requests"),
      });
    }
    const currentTrusted =
      trustedToken &&
      db
        .prepare(
          "SELECT * FROM trusted_devices WHERE token_hash=? AND revoked_at IS NULL AND expires_at>? AND pin_hash IS NOT NULL",
        )
        .get(hash(decodeURIComponent(trustedToken)), now());
    const mediaMatch = url.pathname.match(/^\/api\/site\/media\/([0-9a-f-]+)$/i);
    if (mediaMatch && request.method === "GET") {
      const media = db.prepare("SELECT * FROM media WHERE id=?").get(mediaMatch[1]);
      if (!media) return send(response, 404, { error: "Media not found" });
      const page = db
        .prepare(
          "SELECT p.published_revision_id,r.document_json FROM pages p LEFT JOIN page_revisions r ON r.id=p.published_revision_id WHERE p.slug='/'",
        )
        .get();
      const publishedUse = page?.document_json?.includes(`/api/site/media/${media.id}`);
      const publishedProductUse = db
        .prepare("SELECT images_json FROM products WHERE status='PUBLISHED'")
        .all()
        .some((row) =>
          JSON.parse(row.images_json).some((image) => image.src === `/api/site/media/${media.id}`),
        );
      const privateProductUse =
        user &&
        db
          .prepare("SELECT images_json FROM products")
          .all()
          .some((row) =>
            JSON.parse(row.images_json).some(
              (image) => image.src === `/api/site/media/${media.id}`,
            ),
          );
      const draft =
        user &&
        db
          .prepare(
            "SELECT document_json FROM page_revisions WHERE status='DRAFT' ORDER BY revision DESC",
          )
          .all()
          .some((row) => row.document_json.includes(`/api/site/media/${media.id}`));
      if (!publishedUse && !publishedProductUse && !draft && !privateProductUse)
        return send(response, 404, { error: "Media not found" });
      const bytes = await readFile(path.join(dataDir, "media", media.id));
      response.writeHead(200, {
        "content-type": media.mime_type,
        "content-length": bytes.length,
        "cache-control":
          publishedUse || publishedProductUse ? "public, max-age=300" : "private, no-store",
        "x-content-type-options": "nosniff",
      });
      response.end(bytes);
      return;
    }
    if (url.pathname === "/api/studio/pin/status" && request.method === "GET") {
      const device =
        currentTrusted &&
        db
          .prepare(
            "SELECT users.enabled FROM trusted_devices JOIN users ON users.id=trusted_devices.user_id WHERE trusted_devices.id=?",
          )
          .get(currentTrusted.id);
      return send(response, 200, { available: Boolean(device?.enabled) });
    }
    if (url.pathname === "/api/studio/pin/unlock" && request.method === "POST") {
      const input = z
        .object({ pin: z.string().regex(/^\d{4}$/) })
        .safeParse(await body(request, 1024));
      if (!input.success) return send(response, 400, { error: "Enter your four-digit PIN." });
      if (!currentTrusted)
        return send(response, 401, { error: "Use your password to sign in on this device." });
      const account = db
        .prepare(
          "SELECT users.id,users.email,users.role,users.enabled,users.pin_failed_attempts,users.pin_locked_until FROM users WHERE users.id=?",
        )
        .get(currentTrusted.user_id);
      if (!account?.enabled) return send(response, 401, { error: "Use your password to sign in." });
      const attemptKey = `${request.socket.remoteAddress || "local"}:${currentTrusted.id}`;
      const attempt = pinIpAttempts.get(attemptKey) || { count: 0, since: now() };
      if (now() - attempt.since > 15 * 60_000) {
        attempt.count = 0;
        attempt.since = now();
      }
      if (attempt.count >= pinMaxAttempts * 2)
        return send(response, 429, {
          error: "PIN entry is temporarily limited. Use password sign-in or wait.",
        });
      if (currentTrusted.locked_until > now() || account.pin_locked_until > now())
        return send(response, 429, {
          error: "PIN entry is temporarily locked. Use password sign-in or wait.",
        });
      if (!pinMatches(input.data.pin, currentTrusted.pin_hash)) {
        attempt.count++;
        pinIpAttempts.set(attemptKey, attempt);
        const deviceFailures = currentTrusted.failed_attempts + 1;
        const accountFailures = account.pin_failed_attempts + 1;
        const lockUntil =
          deviceFailures >= pinMaxAttempts || accountFailures >= pinMaxAttempts
            ? now() + pinLockMs
            : 0;
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare("UPDATE trusted_devices SET failed_attempts=?,locked_until=? WHERE id=?").run(
            deviceFailures,
            lockUntil,
            currentTrusted.id,
          );
          db.prepare("UPDATE users SET pin_failed_attempts=?,pin_locked_until=? WHERE id=?").run(
            accountFailures,
            lockUntil,
            account.id,
          );
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        return send(response, lockUntil ? 429 : 401, {
          error: lockUntil
            ? "PIN entry is temporarily locked. Use password sign-in or wait."
            : "That PIN is incorrect.",
        });
      }
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare(
          "UPDATE trusted_devices SET failed_attempts=0,locked_until=0,last_used_at=CURRENT_TIMESTAMP WHERE id=?",
        ).run(currentTrusted.id);
        db.prepare("UPDATE users SET pin_failed_attempts=0,pin_locked_until=0 WHERE id=?").run(
          account.id,
        );
        db.prepare(
          "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,'pin_unlock','trusted_device',?)",
        ).run(randomUUID(), account.id, currentTrusted.id);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      pinIpAttempts.delete(attemptKey);
      const sessionToken = createSession(account, { trustedDeviceId: currentTrusted.id });
      return send(
        response,
        200,
        { user: { id: account.id, email: account.email, role: account.role }, strongAuth: false },
        { "set-cookie": sessionCookie(sessionToken) },
      );
    }
    if (url.pathname === "/api/studio/login" && request.method === "POST") {
      const ip = request.socket.remoteAddress || "local";
      const attempt = loginAttempts.get(ip) || { count: 0, since: now() };
      if (now() - attempt.since > 15 * 60_000) {
        attempt.count = 0;
        attempt.since = now();
      }
      if (attempt.count >= 8)
        return send(response, 429, {
          error: "Too many sign-in attempts. Try again in 15 minutes.",
        });
      const input = z
        .object({
          email: z
            .string()
            .max(254)
            .refine(
              (value) =>
                z.string().email().safeParse(value).success ||
                (process.env.NODE_ENV !== "production" && value.toLowerCase() === "ken@hmlnd"),
            ),
          password: z.string().min(1).max(200),
        })
        .safeParse(await body(request, 4096));
      if (!input.success)
        return send(response, 400, { error: "Enter a valid email and password." });
      const account = db
        .prepare("SELECT * FROM users WHERE email=? AND enabled=1")
        .get(input.data.email);
      if (!account || !passwordMatches(input.data.password, account.password_hash)) {
        attempt.count++;
        loginAttempts.set(ip, attempt);
        return send(response, 401, { error: "Email or password is incorrect." });
      }
      loginAttempts.delete(ip);
      const trustedDevice = currentTrusted?.user_id === account.id ? currentTrusted : null;
      const rawToken = createSession(account, {
        strong: true,
        trustedDeviceId: trustedDevice?.id || null,
      });
      db.prepare(
        "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,'login','session',?)",
      ).run(randomUUID(), account.id, account.id);
      ensurePage(account);
      return send(
        response,
        200,
        {
          user: { id: account.id, email: account.email, role: account.role },
          strongAuth: true,
          pinEnabled: Boolean(trustedDevice),
        },
        {
          "set-cookie": sessionCookie(rawToken),
        },
      );
    }
    if (url.pathname === "/api/studio/logout" && request.method === "POST") {
      if (token)
        db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hash(decodeURIComponent(token)));
      return send(
        response,
        200,
        { ok: true },
        { "set-cookie": "hmlnd_studio=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" },
      );
    }
    if (!user) return send(response, 401, { error: "Sign in to continue." });
    if (url.pathname === "/api/studio/session" && request.method === "GET") {
      const pinAvailable =
        session.trusted_device_id &&
        db
          .prepare(
            "SELECT 1 FROM trusted_devices WHERE id=? AND user_id=? AND pin_hash IS NOT NULL AND revoked_at IS NULL AND expires_at>?",
          )
          .get(session.trusted_device_id, user.id, now());
      return send(response, 200, {
        user: { id: user.id, email: user.email, role: user.role },
        strongAuth: stronglyAuthenticated(session),
        pinAvailable: Boolean(pinAvailable),
      });
    }
    if (url.pathname === "/api/studio/reauth" && request.method === "POST") {
      const key = `${request.socket.remoteAddress || "local"}:${user.id}`;
      const attempt = reauthAttempts.get(key) || { count: 0, since: now() };
      if (now() - attempt.since > 15 * 60_000) {
        attempt.count = 0;
        attempt.since = now();
      }
      if (attempt.count >= 8)
        return send(response, 429, { error: "Password verification is temporarily limited." });
      const input = z
        .object({ password: z.string().min(1).max(200) })
        .safeParse(await body(request, 4096));
      const account =
        input.success &&
        db.prepare("SELECT password_hash FROM users WHERE id=? AND enabled=1").get(user.id);
      if (
        !input.success ||
        !account ||
        !passwordMatches(input.data.password, account.password_hash)
      ) {
        attempt.count++;
        reauthAttempts.set(key, attempt);
        return send(response, 401, { error: "Password verification failed." });
      }
      reauthAttempts.delete(key);
      const strongUntil = now() + 5 * 60_000;
      db.prepare("UPDATE sessions SET strong_until=? WHERE token_hash=?").run(
        strongUntil,
        hash(decodeURIComponent(token)),
      );
      db.prepare(
        "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,'reauthenticate','session',?)",
      ).run(randomUUID(), user.id, user.id);
      return send(response, 200, { ok: true, strongUntil });
    }
    const reauthRequired = () => {
      if (!stronglyAuthenticated(session)) {
        send(response, 428, { error: "Verify your password again to continue." });
        return false;
      }
      return true;
    };
    if (url.pathname === "/api/studio/pin/enrol" && request.method === "POST") {
      if (user.role !== "OWNER" && user.role !== "ADMIN")
        return send(response, 403, {
          error: "Only an owner or admin may enable trusted-device PIN unlock.",
        });
      if (!reauthRequired()) return;
      const input = z
        .object({
          pin: z.string().regex(/^\d{4}$/),
          confirmPin: z.string().regex(/^\d{4}$/),
          label: z.string().trim().min(1).max(80).optional(),
        })
        .safeParse(await body(request, 4096));
      if (!input.success || input.data.pin !== input.data.confirmPin)
        return send(response, 400, { error: "Enter and confirm the same four-digit PIN." });
      let device = currentTrusted?.user_id === user.id ? currentTrusted : null;
      let deviceToken = trustedToken ? decodeURIComponent(trustedToken) : "";
      if (!device) {
        deviceToken = randomBytes(32).toString("base64url");
        const id = randomUUID();
        db.prepare(
          "INSERT INTO trusted_devices (id,user_id,token_hash,label,expires_at) VALUES (?,?,?,?,?)",
        ).run(
          id,
          user.id,
          hash(deviceToken),
          input.data.label || "Trusted browser",
          now() + 30 * 24 * 60 * 60_000,
        );
        device = db.prepare("SELECT * FROM trusted_devices WHERE id=?").get(id);
      }
      const expiresAt = now() + 30 * 24 * 60 * 60_000;
      db.prepare(
        "UPDATE trusted_devices SET pin_hash=?,failed_attempts=0,locked_until=0,expires_at=?,label=? WHERE id=?",
      ).run(pinHash(input.data.pin), expiresAt, input.data.label || device.label, device.id);
      db.prepare(
        "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,'pin_enrol','trusted_device',?)",
      ).run(randomUUID(), user.id, device.id);
      return send(
        response,
        200,
        { ok: true, deviceId: device.id, expiresAt },
        { "set-cookie": trustedCookie(deviceToken) },
      );
    }
    if (url.pathname === "/api/studio/pin/change" && request.method === "PUT") {
      if (!reauthRequired()) return;
      const input = z
        .object({ pin: z.string().regex(/^\d{4}$/), confirmPin: z.string().regex(/^\d{4}$/) })
        .safeParse(await body(request, 4096));
      if (!input.success || input.data.pin !== input.data.confirmPin)
        return send(response, 400, { error: "Enter and confirm the same four-digit PIN." });
      if (!currentTrusted || currentTrusted.user_id !== user.id)
        return send(response, 403, {
          error:
            "This browser is not a trusted device. Sign in with your password to set up its PIN.",
        });
      db.prepare(
        "UPDATE trusted_devices SET pin_hash=?,failed_attempts=0,locked_until=0,expires_at=? WHERE id=?",
      ).run(pinHash(input.data.pin), now() + 30 * 24 * 60 * 60_000, currentTrusted.id);
      db.prepare(
        "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,'pin_change','trusted_device',?)",
      ).run(randomUUID(), user.id, currentTrusted.id);
      return send(response, 200, { ok: true });
    }
    if (url.pathname === "/api/studio/pin/reset" && request.method === "POST") {
      if (!reauthRequired()) return;
      if (!currentTrusted || currentTrusted.user_id !== user.id)
        return send(response, 404, { error: "No trusted device is registered in this browser." });
      db.prepare("DELETE FROM trusted_devices WHERE id=?").run(currentTrusted.id);
      db.prepare(
        "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,'pin_reset','trusted_device',?)",
      ).run(randomUUID(), user.id, currentTrusted.id);
      return send(response, 200, { ok: true }, { "set-cookie": trustedCookie("", 0) });
    }
    if (url.pathname === "/api/studio/security/devices" && request.method === "GET") {
      const devices = db
        .prepare(
          "SELECT id,label,created_at,last_used_at,expires_at,CASE WHEN pin_hash IS NOT NULL THEN 1 ELSE 0 END AS pin_enabled FROM trusted_devices WHERE user_id=? AND revoked_at IS NULL AND expires_at>? ORDER BY COALESCE(last_used_at,created_at) DESC",
        )
        .all(user.id, now());
      return send(response, 200, {
        devices: devices.map((device) => ({
          ...device,
          current: device.id === currentTrusted?.id,
        })),
      });
    }
    const revokeDevice = url.pathname.match(/^\/api\/studio\/security\/devices\/([0-9a-f-]+)$/i);
    if (revokeDevice && request.method === "DELETE") {
      if (!reauthRequired()) return;
      const device = db
        .prepare("SELECT id FROM trusted_devices WHERE id=? AND user_id=? AND revoked_at IS NULL")
        .get(revokeDevice[1], user.id);
      if (!device) return send(response, 404, { error: "Trusted device not found." });
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare("DELETE FROM sessions WHERE trusted_device_id=?").run(device.id);
        db.prepare(
          "UPDATE trusted_devices SET revoked_at=CURRENT_TIMESTAMP,pin_hash=NULL,token_hash=? WHERE id=?",
        ).run(hash(randomBytes(32).toString("base64url")), device.id);
        db.prepare(
          "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,'revoke_device','trusted_device',?)",
        ).run(randomUUID(), user.id, device.id);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return send(
        response,
        200,
        { ok: true },
        device.id === currentTrusted?.id
          ? { "set-cookie": [trustedCookie("", 0), sessionCookie("", 0)] }
          : {},
      );
    }
    if (!roleCan(user.role, "design"))
      return send(response, 403, { error: "Your role cannot edit website content." });
    if (url.pathname === "/api/studio/media" && request.method === "GET") {
      const media = db
        .prepare(
          "SELECT id,filename,mime_type,byte_count,alt_text,owner_id,created_at FROM media ORDER BY created_at DESC,id DESC",
        )
        .all()
        .map((item) => ({ ...item, url: `/api/site/media/${item.id}` }));
      return send(response, 200, { media });
    }
    const studioMediaMatch = url.pathname.match(
      /^\/api\/studio\/media\/([0-9a-f-]+)(?:\/(content))?$/i,
    );
    if (studioMediaMatch && request.method === "GET" && studioMediaMatch[2] === "content") {
      const media = db.prepare("SELECT * FROM media WHERE id=?").get(studioMediaMatch[1]);
      if (!media) return send(response, 404, { error: "Media not found" });
      const bytes = await readFile(path.join(dataDir, "media", media.id)).catch(() => null);
      if (!bytes) return send(response, 404, { error: "Media file not found" });
      response.writeHead(200, {
        "content-type": media.mime_type,
        "content-length": bytes.length,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      });
      response.end(bytes);
      return;
    }
    if (studioMediaMatch && request.method === "PATCH" && !studioMediaMatch[2]) {
      const parsed = z
        .object({ altText: z.string().max(500) })
        .strict()
        .safeParse(await body(request));
      if (!parsed.success)
        return send(response, 400, { error: "Alt text must be 500 characters or fewer." });
      const media = db.prepare("SELECT id FROM media WHERE id=?").get(studioMediaMatch[1]);
      if (!media) return send(response, 404, { error: "Media not found" });
      db.prepare("UPDATE media SET alt_text=? WHERE id=?").run(
        parsed.data.altText.trim(),
        media.id,
      );
      db.prepare(
        "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,?,'media',?)",
      ).run(randomUUID(), user.id, "media_alt_updated", media.id);
      return send(response, 200, { id: media.id, alt_text: parsed.data.altText.trim() });
    }
    if (studioMediaMatch && request.method === "DELETE" && !studioMediaMatch[2]) {
      const media = db.prepare("SELECT id FROM media WHERE id=?").get(studioMediaMatch[1]);
      if (!media) return send(response, 404, { error: "Media not found" });
      const mediaUrl = `/api/site/media/${media.id}`;
      const pageUse = db
        .prepare("SELECT 1 FROM page_revisions WHERE instr(document_json,?)>0 LIMIT 1")
        .get(mediaUrl);
      const productUse = db
        .prepare("SELECT 1 FROM products WHERE instr(images_json,?)>0 LIMIT 1")
        .get(mediaUrl);
      const collectionUse = db
        .prepare("SELECT 1 FROM collections WHERE cover_image=? LIMIT 1")
        .get(mediaUrl);
      if (pageUse || productUse || collectionUse)
        return send(response, 409, { error: "This image is in use and cannot be deleted." });
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare("DELETE FROM media WHERE id=?").run(media.id);
        db.prepare(
          "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,'media_delete','media',?)",
        ).run(randomUUID(), user.id, media.id);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      await unlink(path.join(dataDir, "media", media.id)).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
      return send(response, 200, { deleted: true, id: media.id });
    }
    if (url.pathname === "/api/studio/media" && request.method === "POST") {
      const parsed = z
        .object({ filename: z.string().min(1).max(180), data: z.string().max(14_000_000) })
        .safeParse(await body(request, 15_000_000));
      if (!parsed.success)
        return send(response, 400, { error: "Choose an image smaller than 10 MB." });
      const match = parsed.data.data.match(
        /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/,
      );
      if (!match)
        return send(response, 400, { error: "Only JPEG, PNG and WebP images are supported." });
      const bytes = Buffer.from(match[2], "base64");
      if (!bytes.length || bytes.length > 10_000_000)
        return send(response, 413, { error: "Image must be smaller than 10 MB." });
      const valid =
        match[1] === "image/jpeg"
          ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9
          : match[1] === "image/png"
            ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
      if (!valid)
        return send(response, 400, { error: "The file content does not match its image type." });
      const id = randomUUID();
      await mkdir(path.join(dataDir, "media"), { recursive: true });
      await writeFile(path.join(dataDir, "media", id), bytes, { flag: "wx" });
      db.prepare(
        "INSERT INTO media (id,filename,mime_type,byte_count,owner_id) VALUES (?,?,?,?,?)",
      ).run(
        id,
        path
          .basename(parsed.data.filename)
          .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
          .slice(0, 180),
        match[1],
        bytes.length,
        user.id,
      );
      db.prepare(
        "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,'upload','media',?)",
      ).run(randomUUID(), user.id, id);
      return send(response, 201, { id, url: `/api/site/media/${id}` });
    }
    const page = ensurePage(user);
    if (url.pathname === "/api/studio/home" && request.method === "GET") {
      const draft = db
        .prepare(
          "SELECT * FROM page_revisions WHERE page_id=? AND status='DRAFT' ORDER BY revision DESC LIMIT 1",
        )
        .get(page.id);
      const published = db
        .prepare("SELECT * FROM page_revisions WHERE id=?")
        .get(page.published_revision_id);
      return send(response, 200, {
        draft: draft ? { ...draft, document: JSON.parse(draft.document_json) } : null,
        published: published
          ? { ...published, document: JSON.parse(published.document_json) }
          : null,
        page: { id: page.id, title: page.title, slug: page.slug },
      });
    }
    if (url.pathname === "/api/studio/home/draft" && request.method === "PUT") {
      const input = z
        .object({ document: documentSchema, baseRevision: z.number().int().min(0) })
        .strict()
        .safeParse(await body(request));
      if (!input.success)
        return send(response, 400, {
          error: "The page data is invalid.",
          details: input.error.flatten(),
        });
      const current = db
        .prepare(
          "SELECT * FROM page_revisions WHERE page_id=? AND status='DRAFT' ORDER BY revision DESC LIMIT 1",
        )
        .get(page.id);
      const latestNumber =
        current?.revision ||
        db
          .prepare(
            "SELECT COALESCE(MAX(revision),0) AS revision FROM page_revisions WHERE page_id=?",
          )
          .get(page.id).revision;
      if (latestNumber !== input.data.baseRevision)
        return send(response, 409, {
          error: "This page changed since it was opened. Reload before saving.",
        });
      const revision = latestNumber + 1;
      const id = randomUUID();
      db.prepare(
        "INSERT INTO page_revisions (id,page_id,revision,status,document_json,editor_id) VALUES (?,?,?,'DRAFT',?,?)",
      ).run(id, page.id, revision, JSON.stringify(input.data.document), user.id);
      db.prepare(
        "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,'save_draft','page',?)",
      ).run(randomUUID(), user.id, page.id);
      return send(response, 200, { id, revision, document: input.data.document });
    }
    if (url.pathname === "/api/studio/home/publish" && request.method === "POST") {
      if (!roleCan(user.role, "content"))
        return send(response, 403, {
          error: "Only an owner, admin or content editor may publish.",
        });
      const input = z
        .object({ revisionId: z.string().uuid() })
        .safeParse(await body(request, 4096));
      const revision =
        input.success &&
        db
          .prepare("SELECT * FROM page_revisions WHERE id=? AND page_id=? AND status='DRAFT'")
          .get(input.data.revisionId, page.id);
      if (!revision) return send(response, 400, { error: "No matching saved draft was found." });
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare(
          "UPDATE page_revisions SET status='ARCHIVED' WHERE page_id=? AND status='PUBLISHED'",
        ).run(page.id);
        db.prepare("UPDATE page_revisions SET status='PUBLISHED' WHERE id=?").run(revision.id);
        db.prepare(
          "UPDATE pages SET published_revision_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
        ).run(revision.id, page.id);
        db.prepare(
          "INSERT INTO audit_events (id,actor_id,action,entity_type,entity_id) VALUES (?,?,'publish','page',?)",
        ).run(randomUUID(), user.id, page.id);
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return send(response, 200, { ok: true, revision: revision.revision });
    }
    if (url.pathname === "/api/studio/home/history" && request.method === "GET") {
      const rows = db
        .prepare(
          "SELECT id,revision,status,editor_id,created_at FROM page_revisions WHERE page_id=? ORDER BY revision DESC LIMIT 50",
        )
        .all(page.id);
      return send(response, 200, { revisions: rows });
    }
    const restore = url.pathname.match(/^\/api\/studio\/home\/restore\/([0-9a-f-]+)$/i);
    if (restore && request.method === "POST") {
      if (!roleCan(user.role, "content"))
        return send(response, 403, {
          error: "Only an owner, admin or content editor may restore a version.",
        });
      const prior = db
        .prepare("SELECT document_json FROM page_revisions WHERE id=? AND page_id=?")
        .get(restore[1], page.id);
      if (!prior) return send(response, 404, { error: "Version not found." });
      const max = db
        .prepare("SELECT COALESCE(MAX(revision),0) AS revision FROM page_revisions WHERE page_id=?")
        .get(page.id).revision;
      const id = randomUUID();
      db.prepare(
        "INSERT INTO page_revisions (id,page_id,revision,status,document_json,editor_id) VALUES (?,?,?,'DRAFT',?,?)",
      ).run(id, page.id, max + 1, prior.document_json, user.id);
      return send(response, 200, {
        id,
        revision: max + 1,
        document: JSON.parse(prior.document_json),
      });
    }
    return send(response, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    return send(response, error.message === "Request body too large" ? 413 : 500, {
      error: error.message === "Request body too large" ? error.message : "Studio request failed.",
    });
  }
});
const port = Number(process.env.STUDIO_API_PORT || 4310);
server.listen(port, "127.0.0.1", () =>
  console.info(`HMLND Studio local API listening on http://127.0.0.1:${port}`),
);
