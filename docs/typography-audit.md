# HMLND typography audit

Inspected 28 October 2026. Findings below come from public HTML, inline theme variables and CSS, rather than visual font identification. The reference can change over time.

## Verified reference fonts

| Family declared by Fear of God | Font-face weight | Verified role |
| --- | --- | --- |
| `HelveticaNeueLTPro-Cn` (Helvetica Neue LT Pro Condensed) | 500, normal | Body and subheading variables; navigation; buttons; product-grid text |
| `HelveticaNeueLTPro-LtCn` (Helvetica Neue LT Pro Light Condensed) | 400, normal | Accent variable; explicitly used for legal paragraphs |
| `Optima` | 400, normal | Heading variable; campaign-hub headings; editorial headings and body |

The reference's CSS weights do not consistently match its font-face mappings: body requests 400 and subheadings 500 from the Condensed face registered as 500; accent requests 500 from Light Condensed registered as 400. These are verified CSS values, not claims about the internal font metadata. Editorial captions request Condensed at 300. Exact font editions, version numbers and licensing entitlements cannot be established from filenames alone.

The homepage's current campaigns include lettering embedded in photographs. That lettering cannot be reliably identified from font-family declarations and has not been treated as an independently verified webfont. The campaign-hub stylesheet explicitly uses Optima 400, uppercase, 32px at 768–1440px, 2.222vw above that and 6vw below 768px, centred near the lower part of the image. This is a reusable campaign rule; it is not proof that every current homepage slide renders a live heading.

Navigation uses the body family, normal style, 400, uppercase, with a desktop size of 0.75rem. Buttons use the body family; base button rules use 0.05em tracking. The product-grid detail rule uses the paragraph family, 400, with 1.3 line-height; prices can use 500. General paragraph defaults are 0.875rem and 1.6 line-height. Heading defaults are Optima 400, with h1 at 2rem and h2 at 1.5rem; section rules can override these.

Editorial CSS explicitly sets Optima 400 headings at 36/42/60px across breakpoints, and Optima body at 18/20px. Captions use Condensed at 12px, uppercase, 0.08em tracking. Individual campaign and product templates may override the defaults; do not assume every text element shares one style.

Sources inspected:

- [Homepage](https://fearofgod.com/)
- [Public base stylesheet](https://fearofgod.com/cdn/shop/t/332/assets/base.css?v=79377590291086610441791401078)
- [Public section stylesheet](https://fearofgod.com/cdn/shop/t/332/compiled_assets/styles.css?v=54994074213543828911792592582)
- [Mainline collection](https://fearofgod.com/collections/collection-9-mens)
- [Mainline lookbook](https://fearofgod.com/pages/fear-of-god-the-eternal-order-lookbook)
- [Product](https://fearofgod.com/products/clean-neck-ss-tee-fg9m10-9930cry-black)
- [Editorial campaign](https://fearofgod.com/pages/eternally-driven-jordan-clarksons-path-to-greatness)

The inspected Cotton Rayon Tee product page overrides its title to the heading family (Optima), 400, 1.5rem, normal case and zero tracking; its price is the body family at 0.75rem. This distinction between collection-card text and product detail titles is reflected in HMLND's font roles, while HMLND's existing casing and sizes are preserved.

## Implementation and licensing

The verified reference families differ from HMLND's geometric Futura PT. No client-owned Helvetica/Optima webfont files, webfont licences or Adobe Web Project URL were provided. Neither proprietary family has been downloaded, hotlinked or redistributed. Exact matching therefore remains pending suitable web licences and files.

- `--font-sans`: self-hosted **Roboto Condensed**, normal 300/400/500/600, as a temporary condensed sans alternative to Helvetica Neue LT Pro Condensed. It is an approximation, not the same font.
- `--font-display`: self-hosted **Belleza**, normal 400, as a temporary humanist/flared alternative to Optima. It is an approximation, not the same font. Optima is also listed as a system fallback, without serving any proprietary bytes.
- `--font-brand`: retains **Futura PT**, with the existing Jost fallback. Configure a client-owned Adobe Web Project through `BRAND_FONT_KIT_URL` in `src/routes/__root.tsx`. The logo remains the original supplied image, rendered by `Logo.tsx`; it does not depend on webfont availability.
- Fonts were obtained from Google's official CSS API and gstatic servers. SIL Open Font License notices are included in `public/fonts/Belleza-OFL.txt` and `public/fonts/RobotoCondensed-OFL.txt`. They may be embedded and redistributed under those notices.

[Neue Helvetica licensing options](https://www.myfonts.com/collections/neue-helvetica-font-linotype) include webfonts. Confirm the required Condensed and Light Condensed editions and domain/traffic terms with the vendor. [Optima Nova](https://www.myfonts.com/products/pro-regular-optima-nova-lt-1078902) has webfont licensing options, but is a related edition rather than a verified identical copy of the reference's `OPTIMA` file. [Futura PT on Adobe Fonts](https://fonts.adobe.com/fonts/futura-pt) supports website publishing through a Web Project; desktop activation alone is not a self-hosting licence.

Once licensed assets are supplied, add their authorised font-face definitions in `src/styles.css` and replace the relevant role token. Do not point HMLND at Fear of God's CDN font URLs.

## Visual and metadata changes

All three homepage collection headings use the same `campaign-title` utility: 24px below 768px and 32px from 768px, 400 weight, 1.2 line-height, 0.03em tracking, uppercase and balanced wrapping. Previously they used 60px on mobile, 96px from 768px and 144px from 1024px at weight 500. Their existing bottom position, left/right alignment, imagery, copy and links are preserved. The size cap is an intentional HMLND adaptation of the reference's restrained campaign scale.

Display typography throughout the existing site inherits the display family token; navigation, products, descriptions and controls inherit the condensed body family. Eyebrow and button text use regular weight and 0.1em tracking. Other page-specific size classes remain intact.

The homepage title, Open Graph title and Twitter title are exactly **Heritage Memory Language Narrative Divinity**, through the existing SEO helper. The Organization alternate name matches that phrase. Page-specific titles and the HMLND brand/site name remain intact.

Colours remain white #FFFFFF, black #000000 and yellow #E99801. Product data, photography, routes, backend and cart logic were not changed.

## Validation

- `tsc --noEmit`: passed after the final edits.
- `npm run build`: passed; exported 18 HTML pages plus 404 and assets.
- `npm test -- --pool=threads --maxWorkers=1`: 3 files, 10 tests passed. Default fork workers timed out during startup in this environment; the thread run completed successfully.
- Chromium at 1440×1000 and 390×844: visually inspected; all three campaign headings measured 32px and 24px respectively, weight 400, with no page overflow. Belleza and Roboto Condensed loaded successfully from the local production build.
- Browser document, Open Graph and Twitter titles all matched the exact requested phrase.
- `git diff --check`: passed.

Existing deployment limitation: `VITE_SITE_URL` is unset. Absolute SEO URLs and the sitemap still require the final domain and a rebuild; this typography task does not invent or change that domain.

Files changed for this refinement: `src/styles.css`, `src/routes/index.tsx`, `src/routes/__root.tsx`, `src/routes/products.$slug.tsx`, `src/routes/projects.$slug.tsx`, this audit, and the five font files plus two licence notices in `public/fonts/`. Other pre-existing working-tree changes were preserved.
