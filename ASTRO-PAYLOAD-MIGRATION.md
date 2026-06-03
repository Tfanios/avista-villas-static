# Avista → Astro + Payload CMS migration guide

> A guide for a future Claude Code session (and humans) to migrate the Avista
> static brochure to **Astro** (front end) backed by **Payload CMS** (content),
> and to define the Payload **schema** directly from the content that already
> lives in these HTML pages.
>
> Read alongside [`DESIGN.md`](DESIGN.md) (visual system + named rules) and
> [`PRODUCT.md`](PRODUCT.md) (voice, users, anti-references). Those two files stay
> the source of truth for **how it should look and sound**; this file is the
> source of truth for **how the content is structured**.

---

## 1. Purpose & scope

- **Goal:** move from hand-written HTML to a CMS-driven Astro site so Avista's team
  can edit copy, photos, reviews, amenities, and read enquiries without touching code.
- **In scope:** the content model → Payload collections/globals, the static-page →
  Astro route/component mapping, preserving the design system, porting the dynamic
  JS, and wiring the contact form to a real backend.
- **Out of scope (for now):** booking/availability calendars, payments, multi-language.
  The brand is *personal enquiry, not a booking engine* (see `PRODUCT.md` anti-references) —
  keep it that way.

## 2. Current architecture snapshot

| Piece | File(s) | Notes |
|---|---|---|
| Pages | `index.html`, `avista-villa.html`, `avista-private-resort.html`, `location.html`, `contact.html` | Plain static HTML, hand-authored, duplicated nav/footer in each. |
| Styles | `avista.css` | One stylesheet. Design tokens in `:root` (lines 7–28). No build step. |
| Behaviour | `avista.js` | Vanilla IIFEs: nav-solidify-on-scroll, mobile menu, scroll reveal (IntersectionObserver), gallery drag-carousel + lightbox, video modal, Open-Meteo weather widget. Every block guards against missing elements. |
| Hosting | `wrangler.jsonc` | Cloudflare **static assets** (`assets.directory = "."`). No server runtime today. |
| Contact form | `contact.html` | Posts to placeholder `action="/api/enquiry"`; an inline script intercepts and shows a local confirmation. **This guide replaces that placeholder with a real endpoint.** |

**External dependencies** (currently hard-coded — move the URLs/keys into CMS fields):

- Hero video (Avista Villa): `https://pub-d6e79d28cef04ba49c2a61300dbd5552.r2.dev/avista-villa.mp4` (Cloudflare R2).
- Estate film modal: Google Drive embed `https://drive.google.com/file/d/1K1lpUHufT-ImoCSl2V4z7R1Sx9nqoH1t/preview`.
- Maps: Google Maps embed, query `Vourvourou, Sithonia, Halkidiki, Greece`.
- Weather: Open-Meteo, `latitude=40.1969&longitude=23.7761` (Vourvourou), client-side fetch (`avista.js`).
- Reviews: styled to look like **Booking.com** (logo SVG, score chip `#003580`).
- Images: local under `assets/avista-villa/`, `assets/private-resort/`, `assets/common/`.

## 3. Target architecture

```
┌─────────────────────────┐         ┌──────────────────────────────┐
│  Payload CMS (headless)  │  REST/  │  Astro front end             │
│  admin UI + content API  │  GraphQL│  pages + components + islands │
│  + DB (Postgres/Mongo)   │ ───────▶│  pulls content at build/SSR   │
│  + media storage         │         │  ships avista.css + ported JS │
└─────────────────────────┘         └──────────────────────────────┘
        ▲  enquiries (afterChange → email)        │ deploy
        └─────────── POST /api/enquiry ◀───────────┘
```

**Chosen shape (everything on Cloudflare):** Astro **SSG** front end on Cloudflare Pages +
**Payload 3.x hosted on Cloudflare Workers**.

- **Payload** runs as a Cloudflare **Worker**. Payload 3 is a Next.js app, deployed to Workers via
  the **OpenNext** Cloudflare adapter (`@opennextjs/cloudflare`). It serves the admin UI and the
  REST/GraphQL content API.
  - **Database:** Cloudflare **D1** (SQLite) via `@payloadcms/db-sqlite` — the Cloudflare-native
    choice, bound to the Worker. (Outgrow it? Postgres via Cloudflare **Hyperdrive** or Neon's HTTP
    driver. **MongoDB is not a fit on Workers.**)
  - **Media:** Cloudflare **R2** via `@payloadcms/storage-s3` (R2 is S3-compatible). You already use
    R2 for the hero video, so this keeps every asset in one place.
  - **Email (optional · undecided):** the enquiry *notification* needs an **HTTP email adapter**
    (Resend/Postmark/SendGrid) — Workers can't send SMTP. **Not a blocker:** every enquiry is saved
    to the `enquiries` collection and readable in the admin regardless; email is just a heads-up you
    can switch on later.
- **Astro** front end is **static** (`output: 'static'`), built on Cloudflare **Pages**. It fetches
  Payload over REST (`/api/<collection>`) or GraphQL **at build time** and emits plain HTML — the
  same fast static hosting you have today. Rebuild on content publish via a Payload `afterChange`
  webhook → Cloudflare Pages **deploy hook**.
- **Enquiry form** (no SSR server in pure SSG): post to a small **Cloudflare Pages Function**
  (`functions/api/enquiry.ts`) that forwards to Payload's public `enquiries` create endpoint — keeps
  the call same-origin and runs the honeypot/spam check server-side. (Simplest alternative: POST the
  form **directly** to the Payload Worker's `POST /api/enquiries` with CORS enabled, since
  enquiry-create is public.)

> Remaining content/config decisions are in [§10](#10-open-decisions).

## 4. Content model → Payload collections & globals

Derived field-by-field from the live pages. Types use Payload field names
(`text`, `textarea`, `richText`, `number`, `date`, `email`, `checkbox`, `select`,
`upload`, `relationship`, `array`, `group`).

### Collections

#### `properties` — the two villas
Source: `avista-villa.html`, `avista-private-resort.html`, and the comparison blocks on
`index.html` (`.villa`) / `location.html` (`.crosslink`).

| Field | Type | Example / notes |
|---|---|---|
| `name` | text | "Avista Villa", "Avista Private Resort" |
| `slug` | text (unique, index) | `avista-villa`, `avista-private-resort` → drives the route |
| `order` | number | 1, 2 — controls comparison order |
| `tag` | text | "Sea-facing architectural villa" / "Garden estate for larger groups" (`.villa-tag`) |
| `numeral` | text | "I" / "II" (`.villa-num`) |
| `hero` | group | `{ image: upload, videoUrl: text (optional, R2), poster: upload, kicker: text, title: text, sub: textarea }` |
| `summary` | textarea | the comparison-card description (`.villa-desc`) |
| `overview` | richText | the detail-page lead + body copy |
| `stats` | array | `{ value: text, label: text }` — e.g. `5 / Bedrooms`, `10 / Guests`, `∞ / Infinity pool`, `Wide / Sea views` (`.villa-stats .stat`) |
| `amenities` | array | `{ iconKey: select, title: text, description: textarea }` — 8–9 per villa (`.amenity-grid`) |
| `gallery` | array | `{ image: upload, alt: text, layout: select(l\|p\|s), height: select(h1..h5) }` (`.carousel .card`) |
| `mapQuery` | text | Google Maps query string for this villa |
| `seo` | group | `{ title: text, description: textarea, ogImage: upload }` |

`reviews` attach via the `reviews` collection's relationship (below), not stored inline.
The "other villa" cross-link can be derived in Astro (the property whose `slug` ≠ current).

#### `reviews`
Source: review carousels on both villa pages (`.review-card`), 6 per villa.

| Field | Type | Example / notes |
|---|---|---|
| `property` | relationship → `properties` | which villa this review belongs to |
| `authorName` | text | "Dima", "Yasmine", "Boban" |
| `authorLocation` | text | "Luxembourg", "Australia", "Bulgaria" |
| `source` | select | `booking` (Booking.com) — extensible: `google`, `airbnb`, `direct` |
| `score` | number | 10 (min 0, max 10) |
| `quote` | textarea | the review body |
| `date` | text | "October 2024" (free text matches current display; use `date` if you want sorting) |
| `featured` | checkbox | show on site (default true) |

#### `enquiries` — contact-form submissions (write target)
Source: the `contact.html` form. This collection is what the placeholder `action="/api/enquiry"` becomes.

| Field | Type | Notes |
|---|---|---|
| `name` | text (required) | |
| `email` | email (required) | |
| `phone` | text | optional |
| `preferredProperty` | select | `either` \| `avista-villa` \| `avista-private-resort` (mirror the form `<select>`; or a relationship) |
| `arrival` | date | |
| `departure` | date | |
| `guests` | number | min 1 |
| `message` | textarea (required) | |
| `status` | select | `new` (default) \| `replied` \| `archived` — admin workflow |
| `createdAt` | date | Payload adds automatically |

- **Honeypot:** the form sends a `company` field that must be empty; reject non-empty in the API route (don't store it).
- **Notify:** add an `afterChange` hook to email `stay@avista.gr` on create (see §5).
- **Access:** `create: () => true` (public submit), `read/update/delete: admin only`.

#### `media` (upload collection) — optional but recommended
Replaces the static `assets/**` images. `upload: true`, with an `alt` text field (required —
the current markup already has descriptive `alt` on every image; preserve it). If you prefer to
keep images static for v1, skip this and store image paths as `text` instead of `upload` relations.

### Globals (singletons)

#### `siteSettings`
| Field | Type | Source |
|---|---|---|
| `brandName` | text | "Avista" |
| `tagline` | text | "Two private villas by the Aegean" |
| `contactEmail` | email | `stay@avista.gr` |
| `phone` | text | `+30 000 000 000` (**placeholder — confirm real number**) |
| `address` | textarea | "Vourvourou 630 78, Halkidiki, Greece" |
| `copyright` | text | "© 2026 Avista Villas" |
| `locationSlogan` | text | "Vourvourou · Sithonia · Halkidiki" |
| `weather` | group | `{ latitude: number (40.1969), longitude: number (23.7761) }` |
| `defaultSeo` | group | `{ titleTemplate: text, description: textarea, ogImage: upload }` |

#### `navigation`
`leftLinks` and `rightLinks` arrays of `{ label: text, href: text }`. Current values:
left = Avista Villa, Private Resort; right = Location, **Enquire → `contact.html`** (now repointed).

#### `footer`
`brandBlurb` (textarea) + `columns` array of `{ heading: text, links: array<{ label, href }> }`.
Current footer columns: **Explore** (Avista Villa / Private Resort / Location / Enquire) and
**Contact** (email, phone, address).

#### Page singletons: `home`, `locationPage`, `contactPage`
One global per non-collection page, holding hero + section copy:

- `home`: hero `{ image/video, kicker, title, sub }`, intro `lead`/`statement`, gallery selection,
  `services` array `{ iconKey: select, title: text, description: textarea }` ("What can be arranged",
  4 items), location summary, `locationFacts` array `{ value, label }` (e.g. `90 min / From Thessaloniki airport`),
  CTA `{ title, body, buttonLabel }`.
- `locationPage`: hero, overview copy, `locationFacts` (shared shape), `mapQuery`, the two cross-links.
- `contactPage`: hero `{ kicker, title, sub }`, invitation copy, and the `mapQuery`. The form fields
  themselves are code, not content.

> `locationFacts` appears on both `home` and `locationPage`. Either duplicate the array on each
> global (simplest) or promote it to a small `facts` collection if you want a single edit point.

### Icon registry (`iconKey`)
Amenities, services, and the weather widget use inline SVGs, not uploaded files. Keep the SVGs in an
Astro component (`src/components/icons/`) keyed by string, and store only the **key** in the CMS:

```ts
// src/components/icons/registry.ts — keys offered as `iconKey` select options
export type IconKey =
  | 'bed' | 'bath' | 'pool' | 'view' | 'kitchen' | 'garden'
  | 'wifi' | 'parking' | 'accessible' | 'bbq' | 'concierge' | 'chef'
  // weather (from avista.js pick()): sun | part | cloud | fog | rain | snow | storm
```

## 5. Enquiry submissions (closing the contact-form loop)

The contact form already targets `POST /api/enquiry`. Because the front end is **static SSG**,
implement that route as a **Cloudflare Pages Function** on the Astro deployment, which forwards to
the Payload Worker (`PAYLOAD_URL` is a Pages env var):

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
`fetch('/api/enquiry', { method: 'POST', body: new FormData(form) })` (the inline script in
`contact.html` is marked with a `MIGRATION:` comment showing exactly where). *Pure-static alternative
(no function):* POST straight to `${PAYLOAD_URL}/api/enquiries` with CORS enabled on Payload.

Email notification via a Payload collection hook (configure an **HTTP email adapter** first — Workers
can't send SMTP):

```ts
// inside the `enquiries` collection config
hooks: {
  afterChange: [
    async ({ doc, operation, req }) => {
      if (operation !== 'create') return;
      await req.payload.sendEmail({
        to: 'stay@avista.gr',
        subject: `New enquiry — ${doc.name}`,
        text: `${doc.name} (${doc.email})\nVilla: ${doc.preferredProperty}\n` +
              `Dates: ${doc.arrival ?? '?'} → ${doc.departure ?? '?'}, guests: ${doc.guests ?? '?'}\n\n${doc.message}`,
      });
    },
  ],
}
```

## 6. Static page → Astro route / component mapping

| Current file | Astro route | Data source |
|---|---|---|
| `index.html` | `src/pages/index.astro` | `home` global + `properties` (comparison) |
| `avista-villa.html` | `src/pages/[slug].astro` | `properties` where `slug == params.slug` |
| `avista-private-resort.html` | `src/pages/[slug].astro` | same dynamic route — **one template for both villas** |
| `location.html` | `src/pages/location.astro` | `locationPage` global |
| `contact.html` | `src/pages/contact.astro` | `contactPage` global + `EnquiryForm` |

`getStaticPaths()` on `[slug].astro` generates both villa pages from the `properties` collection.

### Components to extract (current CSS class → component)

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

Each component takes the CMS fields as props (e.g. `<VillaFeature property={p} />`).

## 7. Design-system preservation

- **Keep `avista.css` as-is** initially: import it once globally (e.g. in a `BaseLayout.astro`
  or `src/styles/avista.css`). The class names above map 1:1, so components can reuse it untouched.
- Keep the `:root` tokens (`avista.css:7–28`) — colours, `--font-display`/`--font-sans`, `--radius`,
  `--gut`, `--maxw`, `--ease`. Later you may expose them as Astro/Tailwind tokens, but don't
  re-theme during the migration.
- **Enforce the named rules from `DESIGN.md`** in any new component: Brass Rarity (<10%),
  Forest Grounding (pine only for gallery/location/footer/modals), One Serif Voice, Label Restraint,
  Photo-Only Lift. The new enquiry form already follows §5 input guidance (cream surfaces, 1px soft
  rules, rounded fields, brass focus ring) — see the `ENQUIRY FORM` block at the end of `avista.css`.
- Fonts stay Google Fonts (Cormorant Garamond + Jost) loaded in `<head>` (move into the layout).

## 8. Dynamic features — port `avista.js`

`avista.js` is framework-agnostic vanilla JS. Port each IIFE into an Astro `<script>` (client-side) or
a small island; most can be reused nearly verbatim:

| Feature | Current location | Astro home |
|---|---|---|
| Nav solidify on scroll + mobile menu | `avista.js` top IIFE | `<Nav>` client script |
| Scroll reveal (IntersectionObserver `.reveal`) | `avista.js` | global client script in layout |
| Gallery drag-carousel + lightbox + keyboard nav | `avista.js` | `<Gallery>` island |
| Video modal | `avista.js` (`#film`) | `<VideoModal>` island |
| Weather widget (Open-Meteo) | `avista.js` bottom IIFE | `<WeatherWidget>` island; read lat/lon from `siteSettings.weather` instead of hard-coding |

Store the external URLs as CMS fields (R2 video on `properties.hero.videoUrl`, film embed on a global,
map query on each page/property, weather coords on `siteSettings`).

## 9. Suggested migration order

1. **Scaffold Payload** (`npx create-payload-app`) with the **SQLite/D1** adapter and **R2** storage,
   add the collections/globals above, and target Workers via `@opennextjs/cloudflare`.
2. **Seed content** from the current HTML (2 properties, ~12 reviews, amenities, galleries, facts,
   services, globals). A one-off seed script that reads the existing pages can speed this up.
3. **Upload media** to the `media` collection (or keep `assets/**` static for v1), preserving `alt` text.
4. **Scaffold Astro**, add a `BaseLayout` that imports `avista.css` + fonts + the ported global scripts.
5. **Build components** (§6) and the 4 routes; verify each renders identically to the current pages.
6. **Wire the contact form** to `/api/enquiry` → Payload `enquiries` + email hook (§5); replace the
   placeholder block in the form script.
7. **Parity pass:** diff each Astro page against its HTML counterpart (layout, copy, focus states,
   reduced-motion, WCAG AA — see `PRODUCT.md` accessibility targets).
8. **Deploy:** Payload → Cloudflare **Workers** (D1 + R2) via OpenNext; Astro **SSG** → Cloudflare
   **Pages**, with a Payload `afterChange` → Pages **deploy-hook** to rebuild on publish.
9. **Retire** the static `.html` files and the current static-assets `wrangler.jsonc`.

## 10. Open decisions

**Decided:** front end = Astro **SSG** on Cloudflare Pages · Payload = **Cloudflare Workers** (Next
via OpenNext) · **D1** as the main database · **R2** media. (Future fallback only: Postgres via
**Hyperdrive**/Neon if the data ever outgrows D1.) Remaining:

1. **Email provider — undecided:** which HTTP service sends the enquiry notification (Resend,
   Postmark, SendGrid…) — Workers can't do SMTP. Not blocking: enquiries land in the admin without it.
2. **Migrate images to R2 now**, or keep `assets/**` static for v1 and move them later.
3. **Real contact phone number** (current `+30 000 000 000` is a placeholder).
4. **Reviews source of truth:** manual entries (current) vs. a future Booking.com/Google import.

---

### Quick reference — Payload config skeleton

```ts
// payload.config.ts (Payload 3.x — deployed to Cloudflare Workers via @opennextjs/cloudflare)
import { buildConfig } from 'payload';
import { sqliteAdapter } from '@payloadcms/db-sqlite';      // Cloudflare D1
import { s3Storage } from '@payloadcms/storage-s3';         // Cloudflare R2 (S3-compatible)
import { resendAdapter } from '@payloadcms/email-resend';   // HTTP email (no SMTP on Workers)
import { lexicalEditor } from '@payloadcms/richtext-lexical';

import { Properties } from './collections/Properties';
import { Reviews } from './collections/Reviews';
import { Enquiries } from './collections/Enquiries';
import { Media } from './collections/Media';
import { SiteSettings } from './globals/SiteSettings';
import { Navigation } from './globals/Navigation';
import { Footer } from './globals/Footer';
import { Home } from './globals/Home';
import { LocationPage } from './globals/LocationPage';
import { ContactPage } from './globals/ContactPage';

export default buildConfig({
  editor: lexicalEditor(),
  // Dev: a local libSQL file. Prod: Cloudflare D1 — wire the adapter to the Worker's D1
  // binding (env.DB) per Payload's SQLite/D1 docs.
  db: sqliteAdapter({ client: { url: process.env.DATABASE_URL ?? 'file:./avista.db' } }),
  collections: [Properties, Reviews, Enquiries, Media],
  globals: [SiteSettings, Navigation, Footer, Home, LocationPage, ContactPage],
  // Email provider undecided — Resend shown as a placeholder. Omit this whole block (and the import)
  // until you pick an HTTP provider; enquiries still save to D1 and show in the admin without it.
  email: resendAdapter({
    defaultFromAddress: 'stay@avista.gr',
    defaultFromName: 'Avista',
    apiKey: process.env.RESEND_API_KEY || '',
  }),
  plugins: [
    s3Storage({
      collections: { media: true },
      bucket: process.env.R2_BUCKET || 'avista',
      config: {
        endpoint: process.env.R2_ENDPOINT,            // https://<account>.r2.cloudflarestorage.com
        region: 'auto',
        credentials: { accessKeyId: process.env.R2_KEY!, secretAccessKey: process.env.R2_SECRET! },
      },
    }),
  ],
});
```

```ts
// collections/Properties.ts
import type { CollectionConfig } from 'payload';

export const Properties: CollectionConfig = {
  slug: 'properties',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug', 'order'] },
  access: { read: () => true },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'order', type: 'number', defaultValue: 1 },
    { name: 'tag', type: 'text' },
    { name: 'numeral', type: 'text' },
    {
      name: 'hero', type: 'group', fields: [
        { name: 'image', type: 'upload', relationTo: 'media' },
        { name: 'videoUrl', type: 'text' },
        { name: 'poster', type: 'upload', relationTo: 'media' },
        { name: 'kicker', type: 'text' },
        { name: 'title', type: 'text' },
        { name: 'sub', type: 'textarea' },
      ],
    },
    { name: 'summary', type: 'textarea' },
    { name: 'overview', type: 'richText' },
    {
      name: 'stats', type: 'array', fields: [
        { name: 'value', type: 'text', required: true },
        { name: 'label', type: 'text', required: true },
      ],
    },
    {
      name: 'amenities', type: 'array', fields: [
        { name: 'iconKey', type: 'select', options: ['bed','bath','pool','view','kitchen','garden','wifi','parking','accessible','bbq','concierge','chef'] },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
      ],
    },
    {
      name: 'gallery', type: 'array', fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'alt', type: 'text', required: true },
        { name: 'layout', type: 'select', options: ['l','p','s'], defaultValue: 'l' },
        { name: 'height', type: 'select', options: ['h1','h2','h3','h4','h5'], defaultValue: 'h2' },
      ],
    },
    { name: 'mapQuery', type: 'text' },
    {
      name: 'seo', type: 'group', fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'ogImage', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
};
```

```ts
// collections/Enquiries.ts
import type { CollectionConfig } from 'payload';

export const Enquiries: CollectionConfig = {
  slug: 'enquiries',
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'email', 'preferredProperty', 'status', 'createdAt'] },
  access: { create: () => true, read: ({ req }) => !!req.user, update: ({ req }) => !!req.user, delete: ({ req }) => !!req.user },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
    { name: 'preferredProperty', type: 'select', options: ['either','avista-villa','avista-private-resort'], defaultValue: 'either' },
    { name: 'arrival', type: 'date' },
    { name: 'departure', type: 'date' },
    { name: 'guests', type: 'number', min: 1 },
    { name: 'message', type: 'textarea', required: true },
    { name: 'status', type: 'select', options: ['new','replied','archived'], defaultValue: 'new' },
  ],
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return;
        await req.payload.sendEmail({
          to: 'stay@avista.gr',
          subject: `New enquiry — ${doc.name}`,
          text: `${doc.name} (${doc.email})\nVilla: ${doc.preferredProperty}\nDates: ${doc.arrival ?? '?'} → ${doc.departure ?? '?'} · guests ${doc.guests ?? '?'}\n\n${doc.message}`,
        });
      },
    ],
  },
};
```

```ts
// collections/Reviews.ts
import type { CollectionConfig } from 'payload';

export const Reviews: CollectionConfig = {
  slug: 'reviews',
  admin: { useAsTitle: 'authorName', defaultColumns: ['authorName', 'property', 'score', 'featured'] },
  access: { read: () => true },
  fields: [
    { name: 'property', type: 'relationship', relationTo: 'properties', required: true },
    { name: 'authorName', type: 'text', required: true },
    { name: 'authorLocation', type: 'text' },
    { name: 'source', type: 'select', options: ['booking','google','airbnb','direct'], defaultValue: 'booking' },
    { name: 'score', type: 'number', min: 0, max: 10, defaultValue: 10 },
    { name: 'quote', type: 'textarea', required: true },
    { name: 'date', type: 'text' },
    { name: 'featured', type: 'checkbox', defaultValue: true },
  ],
};
```

```ts
// globals/SiteSettings.ts
import type { GlobalConfig } from 'payload';

export const SiteSettings: GlobalConfig = {
  slug: 'siteSettings',
  access: { read: () => true },
  fields: [
    { name: 'brandName', type: 'text', defaultValue: 'Avista' },
    { name: 'tagline', type: 'text' },
    { name: 'contactEmail', type: 'email', defaultValue: 'stay@avista.gr' },
    { name: 'phone', type: 'text' },
    { name: 'address', type: 'textarea' },
    { name: 'copyright', type: 'text' },
    { name: 'locationSlogan', type: 'text' },
    { name: 'weather', type: 'group', fields: [
      { name: 'latitude', type: 'number', defaultValue: 40.1969 },
      { name: 'longitude', type: 'number', defaultValue: 23.7761 },
    ] },
    { name: 'defaultSeo', type: 'group', fields: [
      { name: 'titleTemplate', type: 'text', defaultValue: 'Avista | %s' },
      { name: 'description', type: 'textarea' },
      { name: 'ogImage', type: 'upload', relationTo: 'media' },
    ] },
  ],
};
```

`Navigation`, `Footer`, `Home`, `LocationPage`, and `ContactPage` follow the same `GlobalConfig`
shape using the fields listed in §4 — keep each in its own file under `globals/`.
