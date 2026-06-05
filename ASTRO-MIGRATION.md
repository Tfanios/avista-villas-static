# Avista — migrate this folder to Astro

> **Feed this file to Claude Code to migrate this folder's static site to Astro** (SSG on
> Cloudflare Pages). Companion file: **[`PAYLOAD-CMS.md`](PAYLOAD-CMS.md)** — the Payload CMS that
> supplies the content. Keep [`DESIGN.md`](DESIGN.md) / [`PRODUCT.md`](PRODUCT.md) as the look-and-voice
> source of truth. **Do not re-theme during the migration** — reproduce the current pages exactly,
> then make them content-driven.

---

## 1. What you're migrating

This folder is the live **Avista** brochure — a two-villa luxury site (Avista Villa + Avista Private
Resort, Vourvourou / Sithonia, Halkidiki). It's hand-written static HTML sharing one stylesheet and
one JS file, deployed today as Cloudflare static assets. The goal: rebuild it as **Astro**, pulling
all copy/photos/reviews from Payload (see `PAYLOAD-CMS.md`) and keeping the contact form working.

## 2. Current architecture snapshot

| Piece | File(s) | Notes |
|---|---|---|
| Pages | `index.html`, `avista-villa.html`, `avista-private-resort.html`, `location.html`, `contact.html` | Plain static HTML; nav/footer duplicated in each. |
| Styles | `avista.css` | One stylesheet. Design tokens in `:root` (lines 7–28). No build step. |
| Behaviour | `avista.js` | Vanilla IIFEs: nav-solidify-on-scroll, mobile menu, scroll reveal (IntersectionObserver), gallery drag-carousel + lightbox, video modal, Open-Meteo weather widget. Every block guards against missing elements. |
| Hosting | `wrangler.jsonc` | Cloudflare **static assets** (`assets.directory = "."`). No server runtime today. |
| Contact form | `contact.html` | Posts to placeholder `action="/api/enquiry"`; an inline script intercepts and shows a local confirmation. **§8 replaces that placeholder with a real endpoint.** |

**External dependencies** (currently hard-coded in the HTML/JS — move the URLs/keys into CMS fields):

- Hero video (Avista Villa): `https://pub-d6e79d28cef04ba49c2a61300dbd5552.r2.dev/avista-villa.mp4` (Cloudflare R2) → `properties.hero.videoUrl`.
- Estate film modal: Google Drive embed `https://drive.google.com/file/d/1K1lpUHufT-ImoCSl2V4z7R1Sx9nqoH1t/preview` → a global field.
- Maps: Google Maps embed, query `Vourvourou, Sithonia, Halkidiki, Greece` → `mapQuery` fields.
- Weather: Open-Meteo, `latitude=40.1969&longitude=23.7761` (Vourvourou), client-side fetch → `siteSettings.weather`.
- Reviews: styled to look like **Booking.com** (logo SVG, score chip `#003580`).
- Images: local under `assets/avista-villa/`, `assets/private-resort/`, `assets/common/` → migrate to the CMS `media`/R2 (or keep static for v1).

## 3. Target

- **Astro `output: 'static'` (SSG)** deployed to **Cloudflare Pages**.
- Fetches Payload over REST (`/api/<collection>`) **at build time** and emits plain HTML — the same
  fast static hosting you have today.
- Rebuild on content publish via a Payload `afterChange` webhook → Cloudflare Pages **deploy hook**.
- The only non-static piece is the contact endpoint (§8), handled by a Cloudflare **Pages Function**.

## 4. Page → route mapping

| Current file | Astro route | Data source (Payload) |
|---|---|---|
| `index.html` | `src/pages/index.astro` | `home` global + `properties` (comparison) |
| `avista-villa.html` | `src/pages/[slug].astro` | `properties` where `slug == params.slug` |
| `avista-private-resort.html` | `src/pages/[slug].astro` | **same dynamic template** for both villas |
| `location.html` | `src/pages/location.astro` | `locationPage` global |
| `contact.html` | `src/pages/contact.astro` | `contactPage` global + the `EnquiryForm` component |

`getStaticPaths()` on `[slug].astro` generates both villa pages from the `properties` collection.

## 5. Components to extract

Each current CSS class becomes a component taking CMS fields as props (e.g. `<VillaFeature property={p} />`).

| Component | Replaces (class in `avista.css`) |
|---|---|
| `<Nav>` / `<MobileNav>` | `.nav`, `.mobile-panel` |
| `<Footer>` | `.foot` |
| `<Hero>` | `.hero` / `.hero.page` (+ `data-layout`) |
| `<WeatherWidget>` | `.nav-weather` island (Open-Meteo fetch) |
| `<VillaFeature>` | `.villa` (comparison block) |
| `<CrossLink>` | `.crosslink` |
| `<Gallery>` | `.carousel` + `.lb` lightbox (one island) |
| `<Reviews>` | `.carousel.reviews` / `.review-card` |
| `<AmenityGrid>` | `.amenity-grid` / `.amenity` |
| `<Stats>` / `<LocationFacts>` | `.villa-stats`/`.pagestats`, `.loc-facts` |
| `<Services>` | `.exp-list` ("What can be arranged") |
| `<MapEmbed>` | the Google Maps `<iframe>` block |
| `<Cta>` | `.cta` |
| `<EnquiryForm>` | `.enquiry-form` (contact page) |
| `<VideoModal>` | `.modal#film` |
| `<Icon iconKey="…">` | the inline amenity/weather SVGs (registry keyed by `iconKey` — see `PAYLOAD-CMS.md` §3) |

## 6. Design-system preservation

- **Keep `avista.css` as-is** initially: import it once globally (e.g. in `src/styles/avista.css`,
  referenced from a `BaseLayout.astro`). The class names above map 1:1, so components reuse it untouched.
- Keep the `:root` tokens (`avista.css:7–28`) — colours, `--font-display`/`--font-sans`, `--radius`,
  `--gut`, `--maxw`, `--ease`. Don't re-theme during the migration.
- The enquiry form already has its styles in the `ENQUIRY FORM` block at the end of `avista.css`
  (cream surfaces, 1px soft rules, rounded fields, brass focus ring) — carry them over verbatim.
- Fonts stay Google Fonts (Cormorant Garamond + Jost), loaded in `<head>` — move the `<link>`s into the layout.
- Enforce the named `DESIGN.md` rules in any new markup: Brass Rarity (<10%), Forest Grounding (pine
  only for gallery/location/footer/modals), One Serif Voice, Label Restraint, Photo-Only Lift.

## 7. Port the dynamic JS (`avista.js`)

`avista.js` is framework-agnostic vanilla JS; each IIFE moves into an Astro `<script>` (client-side)
or a small island, mostly verbatim:

| Feature | Current location | Astro home |
|---|---|---|
| Nav solidify on scroll + mobile menu | `avista.js` top IIFE | `<Nav>` client script |
| Scroll reveal (`.reveal` via IntersectionObserver) | `avista.js` | global client script in the layout |
| Gallery drag-carousel + lightbox + keyboard nav | `avista.js` | `<Gallery>` island |
| Video modal | `avista.js` (`#film`) | `<VideoModal>` island |
| Weather widget (Open-Meteo) | `avista.js` bottom IIFE | `<WeatherWidget>` island; read lat/lon from `siteSettings.weather` instead of hard-coding |

Store the external URLs as CMS fields (R2 video on `properties.hero.videoUrl`, film embed on a global,
map query on each page/property, weather coords on `siteSettings`).

## 8. Contact form wiring

The contact form already targets `POST /api/enquiry`. Because the front end is **static SSG**,
implement that route as a **Cloudflare Pages Function** that forwards to the Payload Worker
(`PAYLOAD_URL` is a Pages env var; the `enquiries` collection is defined in `PAYLOAD-CMS.md`):

```ts
// functions/api/enquiry.ts  (Cloudflare Pages Function — Worker runtime)
export const onRequestPost: PagesFunction<{ PAYLOAD_URL: string }> = async ({ request, env }) => {
  const form = await request.formData();
  if (form.get('company')) return new Response(null, { status: 204 }); // honeypot → drop

  const body = {
    name: form.get('name'),
    email: form.get('email'),
    phone: form.get('phone') || undefined,
    preferredProperty: form.get('property') || 'either',
    arrival: form.get('arrival') || undefined,
    departure: form.get('departure') || undefined,
    guests: Number(form.get('guests')) || undefined,
    message: form.get('message'),
  };

  const res = await fetch(`${env.PAYLOAD_URL}/api/enquiries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return Response.json({ ok: res.ok }, { status: res.ok ? 200 : 502 });
};
```

Then swap the contact page's placeholder block for a real
`fetch('/api/enquiry', { method: 'POST', body: new FormData(form) })`. The inline script in the
current `contact.html` is marked with a `MIGRATION:` comment showing exactly where. *Pure-static
alternative (no function):* POST straight to `${PAYLOAD_URL}/api/enquiries` with CORS enabled on Payload.

## 9. Content you'll consume (quick reference)

Full schema is in `PAYLOAD-CMS.md`; this is the shape the Astro build reads:

- **Collections:** `properties` (name, slug, order, tag, numeral, hero{image,videoUrl,poster,kicker,title,sub},
  summary, overview, stats[], amenities[], gallery[], mapQuery, seo) · `reviews` (property, authorName,
  authorLocation, source, score, quote, date, featured) · `media` (image + alt) · `enquiries` (write-only).
- **Globals:** `siteSettings`, `navigation`, `footer`, `home`, `locationPage`, `contactPage`.

Example build-time fetch in a route:

```astro
---
// src/pages/[slug].astro
export async function getStaticPaths() {
  const res = await fetch(`${import.meta.env.PAYLOAD_URL}/api/properties?depth=2&limit=100`);
  const { docs } = await res.json();
  return docs.map((p) => ({ params: { slug: p.slug }, props: { property: p } }));
}
const { property } = Astro.props;
---
<!-- render <Hero>, <AmenityGrid>, <Gallery>, <Reviews>, <Cta> from `property` -->
```

## 10. Build order

1. **Scaffold Astro** (`npm create astro@latest`), `output: 'static'`, add `@astrojs/cloudflare` only
   if you later need server routes.
2. **BaseLayout**: import `avista.css` + the Google Fonts `<link>`s + the ported global scripts (reveal, nav).
3. **Build the shared components** (§5) and the routes (§4); start by reproducing each page **pixel-for-pixel**
   against its current `.html` (hardcode content first, then swap to Payload fetches).
4. **Wire content**: replace hardcoded copy with build-time fetches from Payload (§9).
5. **Port the JS** islands (§7).
6. **Contact form** (§8): add the Pages Function, replace the placeholder submit block.
7. **Parity pass:** diff each Astro page vs. its HTML counterpart — layout, copy, focus states,
   reduced-motion, WCAG AA (see `PRODUCT.md` accessibility targets).
8. **Deploy** to Cloudflare **Pages** (SSG); set `PAYLOAD_URL`; add the Payload→Pages deploy hook so
   publishing content triggers a rebuild.
9. **Retire** the static `.html` files and the current static-assets `wrangler.jsonc`.

## 11. Open decisions

1. **Images:** migrate `assets/**` into the CMS `media`/R2 now, or keep them static for v1 and move later.
2. **Real contact phone number** (current `+30 000 000 000` is a placeholder).
