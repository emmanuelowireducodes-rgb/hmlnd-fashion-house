# HMLND Studio architecture

## Current state (repository audit, 2026-10-29)

- React 19, TypeScript, TanStack Start/Router, Vite 8, Tailwind 4; static export is produced by `scripts/build-static.mjs` for Netlify.
- The homepage is assembled in `src/routes/index.tsx`; the Mainline carousel and its two imported slides are in `src/components/site/MainlineCarousel.tsx`. Summer and Customised campaign images are imported by the homepage.
- Products and collections are static demo records in `src/lib/catalog.ts`. Cart state is browser `localStorage` (`src/lib/cart.tsx`). README explicitly says catalogue, prices, account, checkout, newsletter and custom enquiries are prototypes.
- No server database, auth, storage, or payment integration is configured. Node 22 is installed and exposes experimental built-in `node:sqlite`; `psql` and Docker are absent. Existing package already includes Zod and Vitest; no visual-editor package is installed.
- Git is on `main` tracking `origin/main`. One unrelated untracked path is present; preserve it. Repository ownership prevents ordinary Git inspection in this environment; use an explicit per-command safe-directory option if needed, without changing global Git configuration.
- Existing deployment is static-only Netlify Drop. It cannot provide persistent dynamic publishing on its own. A production API/runtime, managed database and media storage will be required to meet the no-redeploy publishing requirement.

## Target architecture

Keep the existing storefront and TanStack app. Represent page content as validated versioned JSON (allowlisted block types and typed style/layout properties); render those blocks through existing HMLND components. Separate private draft revisions from the single published revision. Public requests can read only published revisions. Persist media metadata separately from protected originals and generated derivatives.

Local development starts the existing Vite/TanStack app and a small Node HTTP API. Use Node's built-in SQLite (`node:sqlite`) as a zero-install local adapter, with schema migrations under `db/migrations`; keep repository/data files under ignored `.data/`. This API is a local development foundation, not a claim of production hardening. Production should migrate to PostgreSQL (managed service) and private object storage behind a deployment-specific adapter. Before selecting a provider, compare operational fit, costs, regions, backups and Netlify connectivity.

## Initial database model

- `users`: email, password hash, role, enabled, timestamps.
- `sessions`: opaque token hash, user id, expiry, CSRF token, creation time.
- `pages`: stable slug, title, current published revision id, update time.
- `page_revisions`: page id, JSON document, DRAFT/PUBLISHED/ARCHIVED status, editor id, timestamps, optimistic revision number.
- `media`: id, safe filename, MIME, byte count, dimensions, alt text, storage key, owner, timestamp.
- Future milestones: products, variants, collections, inventory movements/reservations, customers, orders, payment events, discounts, settings, audit events. Financial and inventory mutations must be transactional and server-validated.

The first migration creates only users, sessions, pages, page revisions and audit events. Further schema is added with each milestone rather than pre-claiming nonfunctional commerce tables.

## Security model

Authentication and authorization are enforced by the API. Passwords use Node scrypt; sessions use random opaque tokens stored as hashes and HttpOnly/SameSite cookies, bounded expiry and rate limiting. Mutations require same-origin requests and authenticated sessions. Every route checks role/permission server-side. Bootstrap owner credentials are supplied once through local environment variables and are refused after an owner exists. Do not expose database credentials or draft documents to browser code. Use Zod schemas and strict allowlists; uploaded media is size/type/signature checked. Production requires TLS, secret manager, CSRF strategy appropriate to hosting, monitoring, backups, recovery drills and security review.

PIN unlock is an optional convenience on a trusted browser. Password sign-in creates a five-minute strong-auth window; the owner must enrol a PIN during that window. Each trusted browser gets a random 256-bit HttpOnly/SameSite cookie stored only as a SHA-256 token hash, expiring after 30 days. Its four-digit PIN is stored as a salted scrypt verifier and may be additionally peppered with `STUDIO_PIN_PEPPER`; production startup refuses to enable this feature without a 32-character pepper. PIN attempts increment durable device and account counters, lock both for 15 minutes after five failures, and have an additional per-IP/device limiter. A PIN-created session has no strong-auth window. Password reauthentication is required for PIN enrol/change/reset and trusted-device revocation; revoking a browser invalidates its associated sessions. The PIN never replaces password authentication on an untrusted or expired device. A four-digit secret has limited entropy even when hashed: production deployment needs a security review of rate-limit behavior, shared-IP/proxy handling, pepper storage/rotation, account recovery and the hosting runtime before this is considered production-suitable.

## Content and publishing

The first document models the homepage's ordered campaign and editorial sections; hero configuration has desktop/tablet/mobile image, focal point and independently positioned heading/button. Editors save immutable draft revisions with optimistic concurrency checks, preview drafts only through an authenticated API, publish by atomically switching the public revision pointer, and can restore a prior revision by publishing a copy. The existing static exporter remains usable with defaults. Production dynamic publishing requires the storefront to read a runtime content API/server function and CDN cache invalidation or short cache TTL; this cannot be delivered by static Netlify Drop alone.

## Migration approach and milestones

1. Local API, SQLite migration, owner bootstrap, sessions/RBAC, Studio shell.
2. HMLND homepage block registry and responsive visual editor; persistent media and drafts.
3. Preview, publication, history and storefront runtime content integration.
4. Media/page/navigation/design management.
5. Products, collections, inventory, carts and orders.
6. Payment provider evaluation and verified transaction workflow after credentials/account approval.
7. Customisation, marketing, analytics and team features.
8. Production hosting/database/storage decision, security/performance validation and migration.

## Deployment implications

Current Netlify build emits HTML files and assets only. Do not claim production publishing or backend readiness on that artifact. Keep SEO/static export fallback while implementing a runtime content delivery path for production; deployment target and external services require validation before production use. No provider credentials, database URL or licensed Adobe/Barcelony font assets were found/configured during this audit.

The current Node/SQLite Studio API binds to localhost for development and is not deployed with the Netlify static export. PIN authentication and device persistence are available for local validation only. Production needs HTTPS, durable transactional storage, private secret management for the PIN pepper, and audited session/device controls.
