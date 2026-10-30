# HMLND Fashion House

HMLND (Homeland) streetwear storefront built with React, TypeScript, TanStack Start, Tailwind CSS, and shadcn/ui.

## Development

```sh
npm install
npm run dev
```

The development command starts Vite and the local Studio API. To create the first local owner, set bootstrap credentials in PowerShell before first startup:

```powershell
$env:STUDIO_BOOTSTRAP_EMAIL = "owner@example.com"
$env:STUDIO_BOOTSTRAP_PASSWORD = "a-unique-password-at-least-14-chars"
npm run dev
```

Open `/studio`, sign in, and use Website Builder. The first startup creates `.data/studio.sqlite`; uploaded media is stored under `.data/media`. The bootstrap is one-time: after the owner record is created, remove the credentials from the environment. Local persistence uses Node 22's experimental `node:sqlite`; this is a development adapter and is not a production database recommendation. See `docs/hmlnd-studio-architecture.md` for current limitations and migration direction.

After password sign-in, open **Security & trusted devices** to enable a four-digit PIN for that browser. A password is still required on untrusted browsers and for PIN enrolment, changes, resets and device revocation. PIN lockout and device records persist in SQLite. This convenience flow is for local development/testing; it is not connected to a production authentication deployment.

For local owner setup only, `npm run studio:owner:local` reads `STUDIO_LOCAL_OWNER_EMAIL` and `STUDIO_LOCAL_OWNER_PASSWORD` from the process environment, updates the existing owner row in place or creates one, and stores only a scrypt hash. It is disabled when `NODE_ENV=production`.

## Checks and builds

```sh
npm run test
npm run test:studio
npm run lint
npm run build
```

The production build exports static HTML and browser assets into `dist`. The intermediate server build in `.static-build` is used locally to render the pages and is never uploaded.

## Project structure

- `src/routes`: file-based pages and the shared application shell.
- `src/components/site`: header, footer, newsletter, and the client-supplied logo component.
- `src/components/product`: reusable product cards.
- `src/components/ui`: shared UI primitives.
- `src/lib`: demo catalogue, projects, local cart, and server error handling.
- `src/styles.css`: brand colours, fonts, and shared styling.
- `public`: client logo assets and favicons.

The catalogue, prices, account page, checkout, newsletter, and custom enquiries are prototypes. Live payments and backend services are not connected.

Set `BRAND_FONT_KIT_URL` in `src/routes/__root.tsx` to enable the client's Adobe Fonts kit.

## SEO configuration

Set `VITE_SITE_URL` to the final public origin (for example `https://example.com`) in the build environment, then rebuild. See `.env.example`. This enables absolute canonical URLs, social preview images, organization and breadcrumb URLs, and `/sitemap.xml`. Without this setting the sitemap returns 503 rather than publishing a made-up domain.

`/robots.txt` advertises the sitemap when the origin is configured. The sitemap follows the catalogue and project data automatically; search, account and cart pages are excluded and carry `noindex, follow`. Missing pages return 404. Demo products intentionally omit structured offers until real checkout and prices are available.

Before launch, replace demo catalogue/editorial content, check the production page source, and submit `/sitemap.xml` in Google Search Console. Control preview indexing through the hosting provider; do not submit preview domains.

## Netlify drag-and-drop deployment

1. Run `npm run build` locally.
2. Drag the **dist folder** to https://app.netlify.com/drop (or the existing site's Deploys drop zone).
3. For updates, rebuild and upload the new dist folder to the same site.

`dist/index.html` is at the folder root; every linked collection, product, project and utility page has its own HTML file. `_redirects` serves the branded 404 page for unknown URLs. `_headers` sets asset caching and basic response headers. Do not upload the repository, `.static-build`, or `.output`.

Use `npm run preview` to inspect the upload at http://127.0.0.1:4173. This serves only the static files, without the application server.

Once Netlify assigns the final domain, put it in `.env.local` as `VITE_SITE_URL=https://your-site.netlify.app`, rebuild, and upload dist again to activate canonical links and the sitemap. Netlify environment variables do not modify files already built locally. Search and the local shopping bag work in the browser; accounts, live payments and form submissions remain prototypes.
