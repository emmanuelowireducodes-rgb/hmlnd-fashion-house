# HMLND Fashion House

Build a new premium fashion e-commerce web application called HMLND (Homeland). This is a NEW project from scratch, beginning with a beautiful, functional storefront prototype. The client provided a 12-page visual reference guide referencing fearofgod.com. Use that as high-level editorial design inspiration (NOT a copy of logos, imagery, or layouts). Prioritize sleek minimalism, bold art direction, compelling full-bleed photography, substantial whitespace, very restrained black/white/stone palette, elegant typography, premium microinteractions, excellent desktop and mobile responsiveness.

Exact client-defined brand navigation: MAINLINE, SUMMER CHRISTIAN SHIRTS, CUSTOMISED, PROJECTS. The homepage has three distinct major visual sections: HMLND Mainline; HMLND Summer Christian Shirts; HMLND Customised. Each uses striking, fashion-editorial imagery, restrained text, tasteful overlay, and a clear Shop / Explore CTA. Projects has an editorial lookbook/campaign landing page and individual story pages.

Create real working routes and front-end interactions:
- / homepage with elegant sticky/minimal header, centered HMLND wordmark, navigation, search, account placeholder, cart count, mobile full-screen menu, newsletter section and polished footer.
- /collections/mainline, /collections/summer-christian-shirts: clean responsive product grid, filters (size, colour, sort), linked product cards.
- /products/:slug: beautiful large gallery, product name, GHS pricing, variant selectors, quantity, size guide, add-to-cart, product detail accordion; handle missing variants gracefully.
- /customised: premium custom-order enquiry flow with apparel type, sizes, quantity, design description and optional upload UI; label submissions as demo only until backend is connected.
- /projects and /projects/:slug: magazine-like editorial campaigns and project storytelling.
- /search: working search over demo product catalog.
- /cart: working cart persisted locally, quantity change, removal, order totals; checkout must be labelled demo / coming soon (NO fake payment success).
- /account: tasteful login placeholder without pretending it works.
- newsletter: UI validation and clearly labelled demo subscription until integrated.
Use a SMALL realistic demo catalog with non-branded placeholder product names and explicitly demo prices in GHS; no invented official HMLND products or claims. Include tasteful placeholder editorial images that are legally safe where available; visually coherent fallbacks if remote photography is unavailable. No Fear of God branding or copyrighted images. Avoid generic SaaS-style cards, icons or gradients. Design should feel like an actual premium luxury streetwear label.

Prepare clean maintainable TypeScript architecture with reusable product components, catalog data, responsive layouts, accessible contrast, keyboard-friendly controls, alt text, fast loading, and basic SEO metadata. Prefer the platform's native full-stack TypeScript / Tailwind / shadcn stack, but do NOT implement real customer accounts, live payments, or inventory backend yet. Keep source ready for later Supabase database, Ghana-friendly Paystack Mobile Money/card integration, secure admin inventory, order management and real shipping rules. Do not publish. Focus strongly on working, polished initial application.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3d51318a-d6fc-4d15-bd63-348784df9813).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
