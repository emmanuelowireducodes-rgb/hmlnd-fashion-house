# HMLND Studio progress

Updated: 2026-10-30

## Audit

- Confirmed existing storefront, demo catalogue/cart, homepage structure, Mainline carousel behavior (six-second timer, keyboard and swipe support), typography tokens and static Netlify export.
- Confirmed no database/auth/backend integration; Node 22 built-in SQLite is available. PostgreSQL and Docker commands are unavailable.
- Existing untracked path is preserved.

## Milestones 1–3 — local vertical slice foundation

- Architecture documented in `docs/hmlnd-studio-architecture.md`.
- Added local Node HTTP API backed by a SQLite migration, one-time environment-based owner creation, scrypt password hashing, hashed opaque sessions, login throttling, same-origin mutation checks, server-side role checks, page revisions, optimistic draft saves, publish, history and restore.
- Added `/studio` sign-in and branded admin shell without the storefront header/footer, responsive campaign canvas, section ordering/visibility controls, image replacement/upload and focal point, text and CTA URL editing, independent bounded heading and button positions per desktop/tablet/mobile, draft save, publish and restore UI.
- Public homepage consumes published hero text, image, focal point, destination, visibility, responsive heading/button position and section order. HMLND-specific carousel keyboard/swipe/autoplay behavior remains in place. Stable copies of the existing approved hero photos are available at `/images/hero-*.jpg`. Newly uploaded assets are type/signature checked and size bounded, stored under ignored `.data/`; anonymous access is limited to media currently referenced by published content.
- `npm run dev` starts Vite and the local Studio API; Vite proxies `/api`. Bootstrap instructions and nonsecret placeholders are in README and `.env.example`.
- This is a local demonstrator of the publishing vertical slice. It does not make current Netlify static deployments dynamic. Production authentication/runtime, managed PostgreSQL, storage adapters/CDN invalidation, backups and operational security are not implemented.
- Remaining gaps: canvas previews a HMLND campaign section rather than the entire page in an iframe; arbitrary new section types are not rendered on the public site; image optimization/cropping/metadata tools and carousel editing are not implemented; page/navigation/product/commerce modules are not implemented; no browser visual acceptance run yet.
- Next: add browser tests for the editor and responsive page, then media library/page/design controls. After the storefront editing flow is validated, choose production runtime/database/storage before implementing production migration.

## Verification (2026-10-30)

- `node_modules/.bin/tsc.cmd --noEmit`: passed.
- Scoped ESLint for all changed TypeScript/JS implementation files: passed.
- `node scripts/studio-api-smoke.mjs`: passed anonymous-access rejection, owner sign-in, safe image upload, draft-media privacy, stale-edit conflict, unsupported-upload rejection, cross-origin mutation rejection, draft save, publish, public media access, restart persistence, history and rollback (including media privacy after rollback).
- `node_modules/.bin/vitest.cmd run --pool=threads --maxWorkers=1`: 4 test files, 14 tests passed.
- `node scripts/build-static.mjs`: passed; exported 18 HTML pages and assets. Build warns `VITE_SITE_URL` is unset (pre-existing documented SEO setup requirement).
- Full-repository ESLint was attempted but timed out; scoped lint passes. Browser visual acceptance is not run because Playwright/browser tooling is not configured in this checkout.

## PIN unlock update (2026-10-30)

- Added migration `002_trusted_device_pin.sql`: trusted browser records, salted PIN verifier, account/device lockout counters, strong reauthentication expiry and trusted-device session linkage.
- Password sign-in remains required on new devices and gives a five-minute strong-auth window. Owner/admin may enrol PIN on the current browser during that window. PIN unlock creates an ordinary eight-hour server session without strong-auth privileges; trusted-browser cookie expires after 30 days.
- Added keyboard-accessible four-digit masked PIN view and keypad, password fallback, security panel, change/reset, device listing/revocation. Sensitive PIN/device actions require password reauthentication; revocation removes sessions created on that browser.
- Added account/device persistent lockout after five incorrect attempts (15 minutes by default), a secondary per-IP/device limiter, rate-limited password reauthentication, and `STUDIO_PIN_PEPPER` production startup requirement.
- `node scripts/studio-api-smoke.mjs` covers untrusted-device denial, enrolment, correct/incorrect PIN, temporary lock, change/reset recovery, session expiry, trusted-device revocation, and password recovery alongside publishing tests.
- PIN UX and auth have API-level tests but no browser automation. This remains suitable for local testing only; the local API uses localhost-bound Node/SQLite, and production runtime, deployment, operational controls and security review are outstanding.
- Validation after PIN changes: TypeScript passed; scoped ESLint passed; existing Vitest suite passed (14 tests); static build passed (18 pages); expanded Studio API smoke passed against a database upgraded from migration 001.

## Milestone A dashboard update (2026-10-30)

- Added `/studio/dashboard`, registered by the TanStack file route, with authenticated real database counts, clearly labelled unavailable metrics when commerce tables do not exist, recent audit activity, loading/error/unauthenticated states, and a working Visual Builder quick link.
- The `/api/studio/dashboard` endpoint checks the session server-side and returns 401 without an active authenticated session. Existing tables are queried for counts; absent tables return `null` rather than fabricated values.
- Sidebar navigation connects Dashboard and Website Builder; unfinished modules remain visibly disabled and are not represented as implemented.
- Dashboard work does not implement Products, Collections, Inventory, or other commerce management modules.
- Verification: `node_modules/.bin/tsc.cmd --noEmit` passed (exit 0); `node_modules/.bin/eslint.cmd src/routes/studio.dashboard.tsx` passed (exit 0); `node scripts/studio-api-smoke.mjs` passed (exit 0), including the new assertion that anonymous dashboard API requests return 401; `npm run build` passed (exit 0) and generated the `studio.dashboard` route bundles. The build notes that `VITE_SITE_URL` is unset for final-domain sitemap/SEO URLs.
- Route registration is present in `src/routeTree.gen.ts`; the sidebar points Dashboard to `/studio/dashboard` and Website Builder to `/studio`. Focused dashboard lint passed. Linting all three implementation files also reports formatting errors in unrelated-to-dashboard existing server/sidebar lines; dashboard source was formatted and its focused lint passes.

## Product Management step 1 (2026-10-30)

- Added migration `003_products.sql` for durable products with integer pesewas, unique SKU/slug, validated status, media references, sizes, colours, variants, SEO data and archive timestamp. Existing catalogue records and applied migrations remain intact; the hardcoded catalogue remains the storefront compatibility fallback in this step.
- Added authenticated owner/admin/product-manager API operations to list, read, create, update, duplicate, archive, publish and unpublish products. Backend Zod validation rejects fractional/negative prices and invalid variant dimensions; unique SKU conflicts return 409. Public `GET /api/site/products` returns published rows only.
- Added API smoke coverage for anonymous write denial, product creation and SQLite pesewas persistence, edit, duplicate, duplicate SKU, invalid price, draft/public visibility and archive removal from public results.
- Verification: `node scripts/studio-api-smoke.mjs` passed; `node_modules/.bin/tsc.cmd --noEmit` passed; `node_modules/.bin/eslint.cmd scripts/studio-server.mjs scripts/studio-api-smoke.mjs` passed.
- At completion of Step 1, the Product Studio UI and storefront consumption had not yet been implemented; those follow in Steps 2 and 3. Legacy demo products remain in the hardcoded compatibility catalogue.

## Product Management step 2 — Studio interface (2026-10-30)

- Enabled the Products sidebar link and added `/studio/products`, with API-backed listing, search, status filters, create/edit form, GHS display with pesewas API values, generated sizes/colour variants, SEO fields, media upload, draft/publish/unpublish, duplicate, archive and restore-as-draft actions.
- Added optional validated product slug support to existing create/update API contract; existing generated slugs remain automatic when omitted. Public storefront is intentionally unchanged in this step.
- Responsive product table/form styling and loading, empty, success and error states are included. Archived products stay visible under the Archived filter and can be restored as drafts.
- Verification: `node_modules/.bin/tsc.cmd --noEmit` passed; focused ESLint on `studio.products.tsx`, `studio.tsx` and `studio-server.mjs` passed; `node scripts/studio-api-smoke.mjs` passed; `npm run build` passed and generated `studio.products` route bundles. Build notes `VITE_SITE_URL` is unset for final-domain SEO/sitemap URLs.
- No browser-driven owner workflow or local server restart persistence was exercised in this environment. The API smoke verifies SQLite persistence within the test server process; UI acceptance with an uploaded product image remains to be performed manually.

## Product Management step 3 — storefront integration (2026-10-30)

- Added a published-catalog adapter that maps API records to the existing storefront `Product` shape while retaining the hardcoded catalog as the compatibility fallback. Database products are added to the existing Mainline collection and search results; existing product and collection URLs remain unchanged.
- Collection listing, search and product detail now fetch `GET /api/site/products`. Product detail prefers the current published database record by slug and handles loading/failure/unavailable states. Prices, description, variants, image and alt text are taken from published DB data. No draft/archived product is returned by the public endpoint.
- Product-uploaded media is publicly readable only when referenced by a published product (or already-public content); references solely from draft products remain private. Smoke tests cover draft/published/archived media visibility alongside existing product status checks.
- Verification: `node_modules/.bin/tsc.cmd --noEmit` passed; focused ESLint for catalog, search, collection/product detail and API files passed; `node scripts/studio-api-smoke.mjs` passed; `npm run build` passed and includes the compiled Studio/product routes. Static build warns that `VITE_SITE_URL` is unset.
- Static export does not bundle the Node API or SQLite. Published DB catalogue delivery in production requires deploying the local API behavior with a durable database/media store and configuring storefront API access; static-only Netlify hosting continues to use the legacy catalogue fallback until that runtime is deployed.
- Remaining verification: manual browser acceptance and persistence after an actual local server restart were not performed for Step 3. Explicit collection membership is now provided by Milestone C1.

## Milestone C1 — Collection Management (2026-10-30)

- Added migration `004_collections.sql` with collections and ordered many-to-many `product_collections`; existing product rows and migration history are preserved.
- Added authenticated OWNER/ADMIN/PRODUCT_MANAGER collection APIs for list/detail/create/update/archive/publish/unpublish, plus public published collection reads containing assigned published products only. Product APIs now return membership IDs and accept validated collection assignment on create/update. Membership updates and collection edits are committed transactionally.
- Added `/studio/collections` administration with responsive list/form, slug/description/cover upload/SEO/status, product assignment and reorder controls; enabled the sidebar link. Product editor now assigns products to multiple nonarchived collections.
- Storefront collection routes retain the Mainline and Summer Christian Shirts legacy paths and catalogue fallback, and fetch published database collections by slug. The adapter no longer implicitly assigns uncollected database products to Mainline; database products appear only in collections with an explicit membership. Search and product details continue to consume public published product data.
- Product media referenced by published products remains public; draft-only images remain private. Public collection membership filters out draft and archived products.
- Verification: TypeScript passed; focused ESLint passed for all changed implementation/API/test files; `node scripts/studio-api-smoke.mjs` passed including collection publication, membership addition/removal, draft product hiding, archive discoverability and product-media access; `npm run build` passed with both Studio collection and storefront route bundles.
- Manual browser acceptance, actual local API restart persistence, and visual checks of Mainline/Summer pages were not performed. Static-only deployment still requires a separately deployed API, persistent database and media storage for database collections/products to be served in production.

## Milestone C2 — Inventory Management (2026-10-30)

- Added migration `005_inventory.sql` with per-product-variant levels and immutable adjustment records; prior products, collections and variants remain intact. Existing variants with no level read as zero stock until an authorised initial adjustment is made.
- Added authenticated inventory listing, adjustment, threshold and history APIs. OWNER/ADMIN/PRODUCT_MANAGER can mutate stock; ORDER_MANAGER can view. Adjustments validate exact product variant, integer nonzero delta and reason, run under `BEGIN IMMEDIATE`, reject negative results, update quantity and write actor/time/reason/before/after and audit event in one transaction. Threshold changes are validated and audited separately.
- Added `/studio/inventory` with search/filter, quantity/status/threshold display, adjustments, reason entry and movement history; enabled sidebar navigation. Published product variants expose only `available: boolean`; zero-stock options are disabled by the existing product detail controls and sold-out card state. No inventory quantity or adjustment details are public.
- Legacy hardcoded products remain served by the existing catalog and retain their current demo availability behavior; inventory management applies to SQLite-backed products/variants and does not silently seed or reset legacy stock.
- Verification: TypeScript passed; focused ESLint passed for changed inventory/API/catalog/product route files; `node scripts/studio-api-smoke.mjs` passed inventory assertions for unauthenticated denial, initial +10, -3 to 7, rejected negative adjustment, adjustment history, zero-stock public availability, another in-stock variant, and quantity/history persistence after API restart; `npm run build` passed and generated the Studio inventory route.
- Manual browser/mobile acceptance was not performed. Negative stock is not enabled by any configuration; all adjustments below zero are rejected. Build warns `VITE_SITE_URL` is unset for final-domain SEO/sitemap output.

## Milestone D1 — Order Management (2026-10-30)

- Added migration `006_orders.sql` for customer contact snapshots, orders, integer-pesewa order items/totals, status history, private notes and time-limited variant reservations. Earlier migrations and records remain unchanged.
- Added public `POST /api/site/orders` that requires an idempotency key, validates customer/delivery/item details, loads current published products and exact variants, recalculates all prices server-side, and uses `BEGIN IMMEDIATE` to reserve available stock without decrementing physical inventory. Order state begins PENDING/UNPAID. Replays return the prior order; conflicting key reuse is rejected. New-order attempts are IP rate limited.
- Added reservation release on cancellation and 30-minute expiry. Expired unpaid pending/confirmed/processing reservations cancel the order and are audited. Inventory adjustments cannot reduce stock below currently reserved quantities. Draft/archived products, missing variants and insufficient/uninitialized stock are rejected.
- Added protected order list/detail/status/note APIs for OWNER/ADMIN/ORDER_MANAGER. Status transitions are constrained and audited; cancellation requires a reason and releases reservations. Shipped/delivered transitions are rejected unless payment is verified. No endpoint can mark payment successful.
- Added `/studio/orders` with search/status filters, order details, customer/delivery/items/totals, payment integration unavailable label, status history, cancellation and internal notes. Enabled Orders sidebar link.
- Verification: `node scripts/studio-api-smoke.mjs` passed order creation, server-side price recalculation despite tampered price fields, draft rejection, stock reservation/oversell denial, idempotent replay and conflicting-key rejection, unauthorized order listing, invalid unpaid shipping transition, required cancellation reason, cancellation release, reservation expiry, internal notes, status/history persistence after API restart, and existing auth/product/inventory regressions. `node_modules/.bin/tsc.cmd --noEmit` passed; focused ESLint passed for server, smoke test, Orders route and Studio sidebar; `npm run build` passed with the Orders route included.
- Checkout remains disconnected from the shopping cart and no payment provider is configured. Public order creation produces an unpaid local order only; payment collection and fulfillment actions requiring verified payment remain unavailable. Manual browser/mobile acceptance was not performed. Static hosting still requires a deployed API and durable database/media runtime.

## Existing-features integration check (2026-10-30)

- Added an authenticated dashboard assertion to the existing temporary-database Studio smoke suite. `node scripts/studio-api-smoke.mjs` passed after the check; it uses a temporary SQLite database and does not modify the local development catalogue/database.
- Passed at API/integration level: owner password login and trusted PIN enrol/unlock/recovery; dashboard auth/data; product create/edit/publish; collection assignment/publication and membership removal; public product visibility; stock adjustments, variant availability, reservation protection, order server pricing, unpublished product rejection, idempotency, oversell prevention, cancellation/release, reservation expiry, and order/inventory persistence after API restart; protected staff order APIs.
- Sidebar targets for Dashboard, Website Builder, Products, Collections, Inventory and Orders were inspected; the generated TanStack route tree registers each route. `node_modules/.bin/tsc.cmd --noEmit` passed.
- Browser/UI flows are **Not Tested**: this checkout has no Playwright configuration or Studio browser spec, and no interactive browser workflow was run. Link-click behavior, form appearance and mobile layout are therefore not visually verified.
- No product, order or account data in the local development database was changed by this check; workflow records were created in and removed with the smoke test's temporary database.

## Studio nested navigation fix (2026-10-30)

- Root cause: TanStack correctly registered `/studio/dashboard`, `/studio/products`, `/studio/collections`, `/studio/inventory` and `/studio/orders` beneath the `/studio` route, but the authenticated parent component always rendered the Visual Builder and never rendered an `<Outlet />`. Links changed the URL while the parent Builder remained visible.
- Updated `src/routes/studio.tsx` to keep the existing auth, PIN, sidebar and Builder shell mounted; it renders the existing Builder at exactly `/studio` and renders the matched child module through `<Outlet />` for nested routes. Sidebar active styling is now driven by TanStack's active route state, including exact matching for Website Builder.
- Added `src/test/studio-routing.test.tsx`: mounts the actual Studio parent and module components, clicks Dashboard, Products, Collections, Inventory and Orders, checks each distinct page heading and URL, uses browser history Back, and returns to the Visual Builder.
- Verification: `node_modules/.bin/tsc.cmd --noEmit` passed; focused ESLint on Studio route components and the routing test passed; `npm.cmd test -- --pool=threads --maxWorkers=1 --reporter=verbose src/test/studio-routing.test.tsx` passed (1 test); `node scripts/studio-api-smoke.mjs` passed; `npm.cmd run build` passed and emitted assets for all Studio child routes.
- Browser CLI was present but could not complete an interactive browser launch in this environment. The actual React route components and links were instead exercised in the jsdom router-rendering regression test; a manual headed-browser/mobile check remains outstanding. Development server ports 4310 and 5173 were already occupied, so this change did not restart or stop those existing processes.
