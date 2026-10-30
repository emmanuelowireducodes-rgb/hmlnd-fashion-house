import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = await mkdtemp(path.join(os.tmpdir(), "hmlnd-studio-test-"));
const port = 43100 + Math.floor(Math.random() * 500);
const origin = `http://127.0.0.1:${port}`;
let child;
let output = "";
async function start() {
  child = spawn(process.execPath, [path.join(root, "scripts/studio-server.mjs")], {
    cwd: root,
    env: {
      ...process.env,
      STUDIO_API_PORT: String(port),
      STUDIO_DATA_DIR: dataDir,
      STUDIO_BOOTSTRAP_EMAIL: "owner@test.invalid",
      STUDIO_BOOTSTRAP_PASSWORD: "test-only-password-43",
      STUDIO_PIN_LOCK_MS: "5000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output += chunk;
  });
  for (let attempt = 0; attempt < 300; attempt++) {
    if (child.exitCode !== null) throw new Error(`Studio API exited early: ${output}`);
    try {
      await fetch(`${origin}/api/site/home`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Studio API did not start: ${output}`);
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
  child = undefined;
}
async function request(route, options = {}) {
  const response = await fetch(`${origin}${route}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
  });
  return { response, body: await response.json() };
}
function cookie(response, name) {
  const values = response.headers.getSetCookie?.() || [response.headers.get("set-cookie") || ""];
  const found = values.find((value) => value.startsWith(`${name}=`));
  return found?.split(";")[0];
}
const pause = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
let persistedOrderReference = "";
try {
  const legacyDb = new DatabaseSync(path.join(dataDir, "studio.sqlite"));
  legacyDb.exec(await readFile(path.join(root, "db/migrations/001_studio.sql"), "utf8"));
  legacyDb.close();
  await start();
  const anonymousDashboard = await fetch(`${origin}/api/studio/dashboard`);
  assert.equal(anonymousDashboard.status, 401, "dashboard statistics require authentication");
  let result = await request("/api/studio/home");
  assert.equal(result.response.status, 401, "admin API rejects anonymous callers");
  result = await request("/api/studio/login", {
    method: "POST",
    body: JSON.stringify({ email: "owner@test.invalid", password: "test-only-password-43" }),
  });
  assert.equal(result.response.status, 200);
  let auth = { cookie: cookie(result.response, "hmlnd_studio") };
  const ownerDashboard = await request("/api/studio/dashboard", { headers: auth });
  assert.equal(
    ownerDashboard.response.status,
    200,
    "authenticated owner can load dashboard statistics",
  );
  assert.equal(
    typeof ownerDashboard.body.products,
    "number",
    "dashboard uses database product counts",
  );
  const newProduct = {
    name: "Smoke Test Tee",
    description: "A database-backed test garment",
    sku: "SMOKE-TEE-001",
    pricePesewas: 12500,
    category: "T-shirts",
    status: "DRAFT",
    images: [],
    sizes: ["S", "M", "L", "XL"],
    colours: ["Black"],
    variants: [
      { sku: "SMOKE-TEE-S-BLK", size: "S", colour: "Black" },
      { sku: "SMOKE-TEE-M-BLK", size: "M", colour: "Black" },
    ],
    seoTitle: "Smoke Tee",
    seoDescription: "Smoke test product",
  };
  assert.equal(
    (await request("/api/studio/products", { method: "POST", body: JSON.stringify(newProduct) }))
      .response.status,
    401,
    "anonymous callers cannot modify products",
  );
  let productResult = await request("/api/studio/products", {
    method: "POST",
    headers: auth,
    body: JSON.stringify(newProduct),
  });
  assert.equal(productResult.response.status, 201, "owner can create products");
  const productId = productResult.body.id;
  const productDb = new DatabaseSync(path.join(dataDir, "studio.sqlite"));
  assert.equal(
    productDb.prepare("SELECT price_pesewas FROM products WHERE id=?").get(productId).price_pesewas,
    12500,
    "product is persisted as integer pesewas",
  );
  productDb.close();
  assert.equal(
    (await request("/api/site/products")).body.some((product) => product.id === productId),
    false,
    "draft products are private",
  );
  const duplicateSku = await request("/api/studio/products", {
    method: "POST",
    headers: auth,
    body: JSON.stringify(newProduct),
  });
  assert.equal(duplicateSku.response.status, 409, "duplicate product SKUs are rejected safely");
  const invalidPrice = await request("/api/studio/products", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ ...newProduct, sku: "SMOKE-TEE-BAD", pricePesewas: 1.5 }),
  });
  assert.equal(invalidPrice.response.status, 400, "fractional pesewas are rejected");
  productResult = await request(`/api/studio/products/${productId}`, {
    method: "PUT",
    headers: auth,
    body: JSON.stringify({ ...newProduct, name: "Updated Smoke Test Tee", pricePesewas: 13900 }),
  });
  assert.equal(productResult.body.pricePesewas, 13900, "product updates persist");
  const productCopy = await request(`/api/studio/products/${productId}/duplicate`, {
    method: "POST",
    headers: auth,
  });
  assert.equal(productCopy.response.status, 201, "product duplication creates a draft copy");
  const collectionBody = {
    name: "Integration Collection",
    slug: "integration-collection",
    description: "Collection API check",
    coverImage: "",
    seoTitle: "",
    seoDescription: "",
    status: "DRAFT",
    productIds: [productId],
  };
  let collectionResult = await request("/api/studio/collections", {
    method: "POST",
    headers: auth,
    body: JSON.stringify(collectionBody),
  });
  assert.equal(collectionResult.response.status, 201, "authorised owner creates a collection");
  const collectionId = collectionResult.body.id;
  assert.equal(
    (await request("/api/site/collections/integration-collection")).response.status,
    404,
    "draft collections are not publicly discoverable",
  );
  await request(`/api/studio/collections/${collectionId}/publish`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ published: true }),
  });
  let publicCollection = await request("/api/site/collections/integration-collection");
  assert.equal(publicCollection.response.status, 200);
  assert.equal(
    publicCollection.body.products.length,
    0,
    "draft products stay hidden in published collections",
  );
  await request(`/api/studio/products/${productId}/publish`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ published: true }),
  });
  publicCollection = await request("/api/site/collections/integration-collection");
  assert.equal(
    publicCollection.body.products.some((product) => product.id === productId),
    true,
    "published assigned products appear in collection order",
  );
  collectionResult = await request(`/api/studio/collections/${collectionId}`, {
    method: "PUT",
    headers: auth,
    body: JSON.stringify({ ...collectionBody, status: "PUBLISHED", productIds: [] }),
  });
  assert.equal(collectionResult.response.status, 200);
  assert.equal(
    (await request("/api/site/collections/integration-collection")).body.products.length,
    0,
    "removing membership updates public listing",
  );
  await request(`/api/studio/collections/${collectionId}/archive`, {
    method: "POST",
    headers: auth,
  });
  assert.equal(
    (await request("/api/site/collections/integration-collection")).response.status,
    404,
    "archived collections are undiscoverable",
  );
  assert.equal(
    (
      await request(`/api/studio/products/${productId}/publish`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ published: true }),
      })
    ).response.status,
    200,
  );
  assert.equal(
    (await request("/api/site/products")).body.some((product) => product.id === productId),
    true,
    "published products are public",
  );
  const stockAdjustment = (variantSku, delta, reason, headers = auth) =>
    request("/api/studio/inventory/adjust", {
      method: "POST",
      headers,
      body: JSON.stringify({ productId, variantSku, delta, reason }),
    });
  assert.equal(
    (await stockAdjustment("SMOKE-TEE-M-BLK", 10, "Initial stock", {})).response.status,
    401,
    "inventory changes require authentication",
  );
  const initialStock = await stockAdjustment("SMOKE-TEE-M-BLK", 10, "Initial stock");
  assert.equal(initialStock.response.status, 200, JSON.stringify(initialStock.body));
  assert.equal(initialStock.body.quantity, 10);
  assert.equal((await stockAdjustment("SMOKE-TEE-M-BLK", -3, "Damaged item")).body.quantity, 7);
  assert.equal(
    (await request("/api/studio/inventory", { headers: auth })).body.find(
      (row) => row.variantSku === "SMOKE-TEE-M-BLK",
    ).quantity,
    7,
    "inventory dashboard reads updated quantity",
  );
  assert.equal(
    (await stockAdjustment("SMOKE-TEE-M-BLK", -8, "Over-adjustment")).response.status,
    400,
    "inventory cannot become negative",
  );
  assert.equal(
    (await request(`/api/studio/inventory/history/${productId}/SMOKE-TEE-M-BLK`, { headers: auth }))
      .body.length,
    2,
    "both adjustments are audited",
  );
  await request("/api/studio/inventory/threshold", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ productId, variantSku: "SMOKE-TEE-M-BLK", threshold: 8 }),
  });
  let publicStockProduct = (await request("/api/site/products")).body.find(
    (product) => product.id === productId,
  );
  assert.equal(
    publicStockProduct.variants.find((variant) => variant.sku === "SMOKE-TEE-M-BLK").available,
    true,
    "low stock remains purchasable while quantity is positive",
  );
  await stockAdjustment("SMOKE-TEE-M-BLK", -7, "Final unit sold out");
  await stockAdjustment("SMOKE-TEE-S-BLK", 2, "Initial stock for alternate size");
  publicStockProduct = (await request("/api/site/products")).body.find(
    (product) => product.id === productId,
  );
  assert.equal(
    publicStockProduct.variants.find((variant) => variant.sku === "SMOKE-TEE-M-BLK").available,
    false,
    "empty size is out of stock publicly",
  );
  assert.equal(
    publicStockProduct.variants.find((variant) => variant.sku === "SMOKE-TEE-S-BLK").available,
    true,
    "another stocked size remains available",
  );
  const orderDetails = {
    customer: { name: "Smoke Buyer", email: "buyer@test.invalid", phone: "+233200000000" },
    delivery: {
      address: "1 Test Street",
      city: "Accra",
      region: "Greater Accra",
      instructions: "",
    },
    items: [
      {
        productId,
        variantSku: "SMOKE-TEE-S-BLK",
        quantity: 2,
        unitPricePesewas: 1,
        lineTotalPesewas: 2,
      },
    ],
  };
  const draftOrder = await request("/api/site/orders", {
    method: "POST",
    headers: { "idempotency-key": randomUUID() },
    body: JSON.stringify({
      ...orderDetails,
      items: [
        {
          ...orderDetails.items[0],
          productId: productCopy.body.id,
          variantSku: productCopy.body.variants[0].sku,
        },
      ],
    }),
  });
  assert.equal(draftOrder.response.status, 400, "draft products cannot be ordered");
  const orderKey = randomUUID();
  let orderResult = await request("/api/site/orders", {
    method: "POST",
    headers: { "idempotency-key": orderKey },
    body: JSON.stringify(orderDetails),
  });
  assert.equal(
    orderResult.response.status,
    201,
    "published in-stock product creates an unpaid order",
  );
  assert.equal(
    orderResult.body.totalPesewas,
    27800,
    "server recalculates total from stored price despite client price fields",
  );
  assert.equal(orderResult.body.paymentStatus, "UNPAID");
  assert.equal(orderResult.body.reservations[0].quantity, 2, "available stock is reserved");
  assert.equal(
    (await stockAdjustment("SMOKE-TEE-S-BLK", -1, "Attempt to remove reserved stock")).response
      .status,
    409,
    "manual stock changes cannot consume reserved quantities",
  );
  persistedOrderReference = orderResult.body.reference;
  const replay = await request("/api/site/orders", {
    method: "POST",
    headers: { "idempotency-key": orderKey },
    body: JSON.stringify(orderDetails),
  });
  assert.equal(replay.response.status, 200, "duplicate idempotency key returns the existing order");
  assert.equal(replay.body.id, orderResult.body.id);
  const mismatchedReplay = await request("/api/site/orders", {
    method: "POST",
    headers: { "idempotency-key": orderKey },
    body: JSON.stringify({ ...orderDetails, items: [{ ...orderDetails.items[0], quantity: 1 }] }),
  });
  assert.equal(
    mismatchedReplay.response.status,
    409,
    "idempotency key cannot be reused with different items",
  );
  const oversell = await request("/api/site/orders", {
    method: "POST",
    headers: { "idempotency-key": randomUUID() },
    body: JSON.stringify({ ...orderDetails, items: [{ ...orderDetails.items[0], quantity: 1 }] }),
  });
  assert.equal(oversell.response.status, 409, "active reservations prevent overselling");
  assert.equal(
    (
      await request(`/api/studio/orders/${orderResult.body.id}/status`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ status: "SHIPPED" }),
      })
    ).response.status,
    409,
    "unpaid orders cannot be shipped",
  );
  assert.equal(
    (
      await request(`/api/studio/orders/${orderResult.body.id}/status`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ status: "CANCELLED" }),
      })
    ).response.status,
    400,
    "cancellation requires a reason",
  );
  orderResult = await request(`/api/studio/orders/${orderResult.body.id}/status`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ status: "CANCELLED", note: "Customer changed mind" }),
  });
  assert.equal(orderResult.response.status, 200);
  assert.equal(
    orderResult.body.reservations[0].status,
    "RELEASED",
    "cancellation releases reserved stock",
  );
  const afterCancel = await request("/api/site/orders", {
    method: "POST",
    headers: { "idempotency-key": randomUUID() },
    body: JSON.stringify(orderDetails),
  });
  assert.equal(afterCancel.response.status, 201, "released stock can be reserved again");
  assert.equal(
    (await request("/api/studio/orders", { headers: auth })).response.status,
    200,
    "authenticated staff can list orders",
  );
  assert.equal((await request("/api/studio/orders")).response.status, 401, "order list is private");
  assert.equal(
    (
      await request(`/api/studio/orders/${afterCancel.body.id}/notes`, {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ note: "Call before dispatch" }),
      })
    ).response.status,
    201,
  );
  await request(`/api/studio/orders/${afterCancel.body.id}/status`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ status: "CANCELLED", note: "Smoke cleanup" }),
  });
  const abandonedOrder = await request("/api/site/orders", {
    method: "POST",
    headers: { "idempotency-key": randomUUID() },
    body: JSON.stringify({ ...orderDetails, items: [{ ...orderDetails.items[0], quantity: 1 }] }),
  });
  assert.equal(abandonedOrder.response.status, 201);
  persistedOrderReference = abandonedOrder.body.reference;
  const reservationDb = new DatabaseSync(path.join(dataDir, "studio.sqlite"));
  reservationDb
    .prepare("UPDATE inventory_reservations SET expires_at=0 WHERE order_id=?")
    .run(abandonedOrder.body.id);
  reservationDb.close();
  await request("/api/studio/orders", { headers: auth });
  const expiredOrder = await request(`/api/studio/orders/${abandonedOrder.body.id}`, {
    headers: auth,
  });
  assert.equal(
    expiredOrder.body.status,
    "CANCELLED",
    "expired reservations cancel abandoned unpaid orders",
  );
  assert.equal(expiredOrder.body.reservations[0].status, "RELEASED");
  assert.equal(
    (await request(`/api/studio/products/${productId}/archive`, { method: "POST", headers: auth }))
      .response.status,
    200,
  );
  assert.equal(
    (await request("/api/site/products")).body.some((product) => product.id === productId),
    false,
    "archived products are not public",
  );
  assert.equal((await request("/api/studio/pin/status")).body.available, false);
  assert.equal(
    (
      await request("/api/studio/pin/unlock", {
        method: "POST",
        body: JSON.stringify({ pin: "0420" }),
      })
    ).response.status,
    401,
    "untrusted devices cannot use PIN unlock",
  );
  result = await request("/api/studio/pin/enrol", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ pin: "0420", confirmPin: "0420", label: "Smoke browser" }),
  });
  assert.equal(result.response.status, 200, "recent password sign-in allows PIN enrolment");
  const trusted = { cookie: cookie(result.response, "hmlnd_trusted") };
  assert.ok(trusted.cookie);
  auth = { cookie: `${auth.cookie}; ${trusted.cookie}` };
  assert.equal(
    (await request("/api/studio/pin/status", { headers: trusted })).body.available,
    true,
  );
  await request("/api/studio/logout", { method: "POST", headers: auth });
  auth = {};
  for (let i = 0; i < 4; i++)
    assert.equal(
      (
        await request("/api/studio/pin/unlock", {
          method: "POST",
          headers: trusted,
          body: JSON.stringify({ pin: "9999" }),
        })
      ).response.status,
      401,
    );
  assert.equal(
    (
      await request("/api/studio/pin/unlock", {
        method: "POST",
        headers: trusted,
        body: JSON.stringify({ pin: "9999" }),
      })
    ).response.status,
    429,
    "repeated wrong PINs lock the device and account",
  );
  assert.equal(
    (
      await request("/api/studio/pin/unlock", {
        method: "POST",
        headers: trusted,
        body: JSON.stringify({ pin: "0420" }),
      })
    ).response.status,
    429,
    "a locked PIN cannot unlock the device",
  );
  await pause(5100);
  result = await request("/api/studio/pin/unlock", {
    method: "POST",
    headers: trusted,
    body: JSON.stringify({ pin: "0420" }),
  });
  assert.equal(result.response.status, 200, "correct PIN unlocks after the temporary lockout");
  auth = { cookie: `${cookie(result.response, "hmlnd_studio")}; ${trusted.cookie}` };
  assert.equal(
    (await request("/api/studio/session", { headers: auth })).body.strongAuth,
    false,
    "PIN sessions are not strong reauthentication",
  );
  assert.equal(
    (
      await request("/api/studio/pin/change", {
        method: "PUT",
        headers: auth,
        body: JSON.stringify({ pin: "9876", confirmPin: "9876" }),
      })
    ).response.status,
    428,
    "PIN changes require password reauthentication",
  );
  assert.equal(
    (
      await request("/api/studio/reauth", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ password: "wrong-password" }),
      })
    ).response.status,
    401,
  );
  assert.equal(
    (
      await request("/api/studio/reauth", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({ password: "test-only-password-43" }),
      })
    ).response.status,
    200,
  );
  assert.equal(
    (
      await request("/api/studio/pin/change", {
        method: "PUT",
        headers: auth,
        body: JSON.stringify({ pin: "9876", confirmPin: "9876" }),
      })
    ).response.status,
    200,
    "password reauthentication allows PIN change",
  );
  await request("/api/studio/logout", { method: "POST", headers: auth });
  assert.equal(
    (
      await request("/api/studio/pin/unlock", {
        method: "POST",
        headers: trusted,
        body: JSON.stringify({ pin: "0420" }),
      })
    ).response.status,
    401,
    "changed PIN cannot be reused",
  );
  result = await request("/api/studio/pin/unlock", {
    method: "POST",
    headers: trusted,
    body: JSON.stringify({ pin: "9876" }),
  });
  assert.equal(result.response.status, 200);
  auth = { cookie: `${cookie(result.response, "hmlnd_studio")}; ${trusted.cookie}` };
  await request("/api/studio/reauth", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ password: "test-only-password-43" }),
  });
  assert.equal(
    (await request("/api/studio/pin/reset", { method: "POST", headers: auth })).response.status,
    200,
    "password recovery can reset the current device PIN",
  );
  assert.equal(
    (
      await request("/api/studio/pin/status", {
        headers: { cookie: cookie(result.response, "hmlnd_trusted") || trusted.cookie },
      })
    ).body.available,
    false,
  );
  await request("/api/studio/logout", { method: "POST", headers: auth });
  result = await request("/api/studio/login", {
    method: "POST",
    body: JSON.stringify({ email: "owner@test.invalid", password: "test-only-password-43" }),
  });
  assert.equal(result.response.status, 200, "password sign-in remains available for recovery");
  auth = { cookie: cookie(result.response, "hmlnd_studio") };
  result = await request("/api/studio/pin/enrol", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ pin: "1357", confirmPin: "1357", label: "Smoke recovery browser" }),
  });
  assert.equal(result.response.status, 200, "password recovery can enrol a replacement PIN");
  const recoveryTrusted = { cookie: cookie(result.response, "hmlnd_trusted") };
  assert.ok(recoveryTrusted.cookie);
  auth = { cookie: `${auth.cookie}; ${recoveryTrusted.cookie}` };
  result = await request("/api/studio/home", { headers: auth });
  assert.equal(result.response.status, 200);
  assert.equal(result.body.published.document.sections[0].title, "Mainline");
  const document = structuredClone(result.body.published.document);
  const baseRevision = result.body.published.revision;
  document.sections[0].title = "Local campaign edit";
  document.designSystem.colors.accent = "#CC5500";
  const invalidDesign = structuredClone(document);
  invalidDesign.designSystem.typography.headingFont = "Unlicensed Display Font";
  const invalidDesignSave = await request("/api/studio/home/draft", {
    method: "PUT",
    headers: auth,
    body: JSON.stringify({ document: invalidDesign, baseRevision }),
  });
  assert.equal(invalidDesignSave.response.status, 400, "arbitrary font families are rejected");
  const privateLibrary = await request("/api/studio/media");
  assert.equal(
    privateLibrary.response.status,
    401,
    "media library requires an authenticated Studio session",
  );
  const upload = await request("/api/studio/media", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      filename: "campaign.png",
      data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/nqkAAAAASUVORK5CYII=",
    }),
  });
  assert.equal(upload.response.status, 201, "supported image uploads are stored");
  let mediaLibrary = await request("/api/studio/media", { headers: auth });
  assert.equal(mediaLibrary.response.status, 200, "authenticated Studio can list uploaded media");
  assert.ok(mediaLibrary.body.media.some((item) => item.id === upload.body.id));
  const privatePreview = await fetch(`${origin}/api/studio/media/${upload.body.id}/content`, {
    headers: auth,
  });
  assert.equal(
    privatePreview.status,
    200,
    "authenticated Studio can preview an unreferenced image",
  );
  assert.match(privatePreview.headers.get("content-type"), /^image\/png/);
  result = await request(`/api/studio/media/${upload.body.id}`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({ altText: "Campaign image alt" }),
  });
  assert.equal(result.response.status, 200, "media alt text can be updated");
  assert.equal(result.body.alt_text, "Campaign image alt");
  const disposableUpload = await request("/api/studio/media", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      filename: "unused.png",
      data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/nqkAAAAASUVORK5CYII=",
    }),
  });
  assert.equal(disposableUpload.response.status, 201);
  result = await request(`/api/studio/media/${disposableUpload.body.id}`, {
    method: "DELETE",
    headers: auth,
  });
  assert.equal(result.response.status, 200, "unused media can be safely deleted");
  mediaLibrary = await request("/api/studio/media", { headers: auth });
  assert.ok(!mediaLibrary.body.media.some((item) => item.id === disposableUpload.body.id));
  const storefrontProduct = await request("/api/studio/products", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      name: "Published image integration tee",
      description: "Public image visibility integration case",
      sku: "MEDIA-INTEGRATION-TEE",
      pricePesewas: 22000,
      category: "T-shirts",
      status: "DRAFT",
      images: [{ src: upload.body.url, alt: "Integration test tee" }],
      sizes: ["S"],
      colours: ["Black"],
      variants: [{ sku: "MEDIA-INTEGRATION-S-BLACK", size: "S", colour: "Black" }],
      seoTitle: "",
      seoDescription: "",
    }),
  });
  assert.equal(storefrontProduct.response.status, 201);
  result = await request(`/api/studio/media/${upload.body.id}`, {
    method: "DELETE",
    headers: auth,
  });
  assert.equal(result.response.status, 409, "media referenced by a product cannot be deleted");
  assert.equal(
    (await fetch(`${origin}${upload.body.url}`)).status,
    404,
    "draft product media remains private",
  );
  await request(`/api/studio/products/${storefrontProduct.body.id}/publish`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ published: true }),
  });
  assert.equal((await fetch(`${origin}/api/site/products`)).status, 200);
  assert.equal(
    (await fetch(`${origin}${upload.body.url}`)).status,
    200,
    "published product media is public",
  );
  await request(`/api/studio/products/${storefrontProduct.body.id}/archive`, {
    method: "POST",
    headers: auth,
  });
  assert.equal(
    (await fetch(`${origin}${upload.body.url}`)).status,
    404,
    "archived product media is private again",
  );
  document.sections[0].image = upload.body.url;
  result = await request("/api/studio/home/draft", {
    method: "PUT",
    headers: auth,
    body: JSON.stringify({ document, baseRevision }),
  });
  assert.equal(result.response.status, 200);
  const draftId = result.body.id;
  const stale = await request("/api/studio/home/draft", {
    method: "PUT",
    headers: auth,
    body: JSON.stringify({ document, baseRevision }),
  });
  assert.equal(stale.response.status, 409, "stale edits are rejected");
  const invalidUpload = await request("/api/studio/media", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ filename: "active.svg", data: "data:image/svg+xml;base64,PHN2Zz4=" }),
  });
  assert.equal(invalidUpload.response.status, 400, "unsupported uploads are rejected");
  const privateMedia = await fetch(`${origin}${upload.body.url}`);
  assert.equal(privateMedia.status, 404, "draft media stays private");
  const crossOrigin = await fetch(`${origin}/api/studio/home/draft`, {
    method: "PUT",
    headers: { ...auth, origin: "https://attacker.invalid", "content-type": "application/json" },
    body: JSON.stringify({ document, baseRevision }),
  });
  assert.equal(crossOrigin.status, 403, "cross-origin mutations are denied");
  result = await request("/api/studio/home/publish", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ revisionId: draftId }),
  });
  assert.equal(result.response.status, 200);
  result = await request("/api/site/home");
  assert.equal(result.body.sections[0].title, "Local campaign edit", "published content is public");
  assert.equal(result.body.sections[0].image, upload.body.url);
  assert.equal(
    result.body.designSystem.colors.accent,
    "#CC5500",
    "published design settings are public",
  );
  assert.equal(
    (await fetch(`${origin}${upload.body.url}`)).status,
    200,
    "published media becomes public",
  );
  await stop();
  await start();
  const persistedOrder = await request(`/api/studio/orders/${persistedOrderReference}`, {
    headers: auth,
  });
  assert.equal(persistedOrder.response.status, 200, "order persists after API restart");
  assert.equal(persistedOrder.body.status, "CANCELLED");
  const persistedInventory = await request("/api/studio/inventory", { headers: auth });
  assert.equal(persistedInventory.response.status, 200);
  assert.equal(
    persistedInventory.body.find((row) => row.variantSku === "SMOKE-TEE-M-BLK").quantity,
    0,
    "stock quantity persists after API restart",
  );
  assert.equal(
    (await request(`/api/studio/inventory/history/${productId}/SMOKE-TEE-M-BLK`, { headers: auth }))
      .body.length,
    3,
    "adjustment history persists after API restart",
  );
  result = await request("/api/site/home");
  assert.equal(
    result.body.sections[0].title,
    "Local campaign edit",
    "published content survives an API restart",
  );
  assert.equal(
    result.body.designSystem.colors.accent,
    "#CC5500",
    "published design settings survive an API restart",
  );
  assert.equal(
    (await fetch(`${origin}${upload.body.url}`)).status,
    200,
    "media survives an API restart",
  );
  const history = await request("/api/studio/home/history", { headers: auth });
  assert.equal(history.response.status, 200);
  assert.ok(history.body.revisions.length >= 2);
  result = await request(`/api/studio/home/restore/${history.body.revisions.at(-1).id}`, {
    method: "POST",
    headers: auth,
  });
  assert.equal(result.response.status, 200);
  result = await request("/api/studio/home/publish", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ revisionId: result.body.id }),
  });
  assert.equal(result.response.status, 200);
  result = await request("/api/site/home");
  assert.equal(result.body.sections[0].title, "Mainline", "rollback publishes the earlier content");
  assert.equal(
    (await fetch(`${origin}${upload.body.url}`)).status,
    404,
    "rolled-back media becomes private again",
  );
  const rawSession = decodeURIComponent(auth.cookie.split(";")[0].split("=")[1]);
  const expiryDb = new DatabaseSync(path.join(dataDir, "studio.sqlite"));
  expiryDb
    .prepare("UPDATE sessions SET expires_at=? WHERE token_hash=?")
    .run(Date.now() - 1, createHash("sha256").update(rawSession).digest("hex"));
  expiryDb.close();
  assert.equal(
    (await request("/api/studio/session", { headers: auth })).response.status,
    401,
    "expired server sessions are rejected",
  );
  result = await request("/api/studio/pin/unlock", {
    method: "POST",
    headers: recoveryTrusted,
    body: JSON.stringify({ pin: "1357" }),
  });
  assert.equal(
    result.response.status,
    200,
    "an expired Studio session can be unlocked again on its trusted device",
  );
  auth = { cookie: `${cookie(result.response, "hmlnd_studio")}; ${recoveryTrusted.cookie}` };
  const devices = await request("/api/studio/security/devices", { headers: auth });
  assert.equal(devices.response.status, 200);
  const currentDevice = devices.body.devices.find((device) => device.current);
  assert.ok(
    currentDevice,
    "trusted-device records are visible without exposing their verifier or token",
  );
  await request("/api/studio/reauth", {
    method: "POST",
    headers: auth,
    body: JSON.stringify({ password: "test-only-password-43" }),
  });
  assert.equal(
    (
      await request(`/api/studio/security/devices/${currentDevice.id}`, {
        method: "DELETE",
        headers: auth,
      })
    ).response.status,
    200,
    "strong reauthentication permits device revocation",
  );
  assert.equal(
    (await request("/api/studio/session", { headers: auth })).response.status,
    401,
    "revocation terminates sessions created on that device",
  );
  assert.equal(
    (await request("/api/studio/pin/status", { headers: recoveryTrusted })).body.available,
    false,
  );
  result = await request("/api/studio/login", {
    method: "POST",
    body: JSON.stringify({ email: "owner@test.invalid", password: "test-only-password-43" }),
  });
  assert.equal(
    result.response.status,
    200,
    "password recovery works after trusted-device revocation",
  );
  console.log(
    "Studio API smoke test passed: PIN enrolment, unlock, lockout, password recovery, PIN reset/change, expiry, device revocation, role session checks, publishing and rollback.",
  );
} finally {
  await stop();
  await rm(dataDir, { recursive: true, force: true });
}
