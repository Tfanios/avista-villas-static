# Avista — Payload CMS schema & backend

> **Feed this file to Claude Code when building the Payload CMS** that backs the Avista site.
> Companion file: **[`ASTRO-MIGRATION.md`](ASTRO-MIGRATION.md)** — the Astro front end that consumes
> this CMS. The look-and-voice source of truth stays in [`DESIGN.md`](DESIGN.md) / [`PRODUCT.md`](PRODUCT.md).

---

## 1. What you're building

A **Payload 3.x** headless CMS for **Avista** — a two-villa luxury brochure (Avista Villa + Avista
Private Resort, in Vourvourou / Sithonia, Halkidiki). The public site is currently static HTML in
this folder (see `ASTRO-MIGRATION.md`). This CMS owns **all that content** plus the **contact-form
enquiries**. Keep it a *personal-enquiry* model, **not** a booking engine (see `PRODUCT.md`
anti-references) — no availability calendars or payments.

## 2. Hosting & stack (decided)

- **Runtime:** Payload 3 (a Next.js app) on **Cloudflare Workers**, deployed via the **OpenNext**
  Cloudflare adapter (`@opennextjs/cloudflare`). Serves the admin UI + REST/GraphQL API.
- **Database:** Cloudflare **D1** (SQLite) via `@payloadcms/db-sqlite` — the main DB. The D1 binding
  (`env.DB`) is provided by the Worker; for local dev use a libSQL file. Follow Payload's SQLite/D1
  docs for the exact binding wiring. *(Fallback only if you ever outgrow D1: Postgres via Cloudflare
  **Hyperdrive** or Neon's HTTP driver. **MongoDB is not viable on Workers.**)*
- **Media:** Cloudflare **R2** via `@payloadcms/storage-s3` (R2 is S3-compatible). R2 already hosts the
  site's hero video, so all assets stay in one place.
- **Email (optional · undecided):** the enquiry *notification* needs an **HTTP email adapter**
  (Resend / Postmark / SendGrid) — Workers can't send SMTP. **Not a blocker:** every enquiry saves to
  the `enquiries` collection and is readable in the admin regardless; email is just a heads-up you can
  switch on later.

## 3. Content model — collections & globals

Field types use Payload names (`text`, `textarea`, `richText`, `number`, `date`, `email`, `checkbox`,
`select`, `upload`, `relationship`, `array`, `group`). The values come from the current HTML pages.

### Collections

#### `properties` — the two villas
Source: `avista-villa.html`, `avista-private-resort.html`, plus the comparison blocks on `index.html`.

| Field | Type | Example / notes |
|---|---|---|
| `name` | text | "Avista Villa", "Avista Private Resort" |
| `slug` | text (unique, index) | `avista-villa`, `avista-private-resort` → drives the route |
| `order` | number | 1, 2 — controls comparison order |
| `tag` | text | "Sea-facing architectural villa" / "Garden estate for larger groups" |
| `numeral` | text | "I" / "II" |
| `hero` | group | `{ ...heroMedia, kicker: text, title: text, sub: textarea }` — **`heroMedia`** = responsive desktop **and** mobile image + video (+ posters, LCP/data-saver flags). Defined once in **§3.5**, reused everywhere a hero appears. |
| `summary` | textarea | comparison-card description |
| `overview` | richText | detail-page lead + body copy |
| `stats` | array | `{ value: text, label: text }` — e.g. `5 / Bedrooms`, `10 / Guests`, `∞ / Infinity pool`, `Wide / Sea views` |
| `amenities` | array | `{ iconKey: select, title: text, description: textarea }` — 8–9 per villa |
| `gallery` | array | `{ image: upload, alt: text, layout: select(l\|p\|s), height: select(h1..h5) }` — `image` carries width/height + a blur placeholder for zero-CLS lazy loading (see **§3.5**) |
| `map` | group | **`mapLocation`** (see **§3.5**): pin `{ latitude, longitude, zoom, label, directionsQuery, staticPreview: upload }`. Real pin coordinates + a static preview image so the heavy interactive embed is **click-to-load** (big mobile-perf win). Replaces the old `mapQuery`. |
| `seo` | group | `{ title: text, description: textarea, ogImage: upload }` |

Reviews attach via the `reviews` relationship (below). The "other villa" cross-link is derived in
Astro (the property whose `slug` ≠ current) — no field needed.

#### `reviews`
Source: review carousels on both villa pages, 6 per villa.

| Field | Type | Example / notes |
|---|---|---|
| `property` | relationship → `properties` | which villa |
| `authorName` | text | "Dima", "Yasmine", "Boban" |
| `authorLocation` | text | "Luxembourg", "Australia", "Bulgaria" |
| `source` | select | `booking` (Booking.com); extensible: `google`, `airbnb`, `direct` |
| `score` | number | 10 (min 0, max 10) |
| `quote` | textarea | the review body |
| `date` | text | "October 2024" (matches current display; use `date` if you want sorting) |
| `featured` | checkbox | show on site (default true) |

#### `enquiries` — contact-form submissions (write target)
This is what the contact form's `POST /api/enquiry` ultimately writes to. See §4.

| Field | Type | Notes |
|---|---|---|
| `name` | text (required) | |
| `email` | email (required) | |
| `phone` | text | optional |
| `preferredProperty` | select | `either` \| `avista-villa` \| `avista-private-resort` |
| `arrival` | date | |
| `departure` | date | |
| `guests` | number | min 1 |
| `message` | textarea (required) | |
| `status` | select | `new` (default) \| `replied` \| `archived` |
| `createdAt` | date | Payload adds automatically |

- **Honeypot:** the form sends a `company` field that must be empty; the front-end function drops
  non-empty submissions (don't store it).
- **Access:** `create: () => true` (public submit), `read/update/delete: admin only`.

#### `media` (upload collection) — the performance backbone
Replaces the static `assets/**` images. `upload: true` with a **required `alt`** field (the current
markup already has descriptive `alt` on every image — preserve it). Store on **R2** (§5).

This collection is where mobile performance is won or lost, so it is configured for it (full config in
**§3.5** / **§5**):
- **Pre-generated responsive sizes** (`imageSizes`) + modern format output (**WebP/AVIF**), so the
  front end ships a `srcset` and the phone downloads a ~30–80 KB image instead of a 2 MB original.
- **Intrinsic `width`/`height`** are stored automatically by Payload on every upload → the front end
  sets them on `<img>` so **CLS = 0**.
- **`focalPoint: true`** so art-directed crops (square gallery tiles, 16:9 hero) keep the subject.
- A tiny **`blurDataURL`** LQIP placeholder generated on upload (hook in §5) for smooth loading with no
  layout jump.

*(If you prefer to keep images static for v1, skip this and store image paths as `text` — but you lose
the responsive sizes and the 100-score is much harder. Recommended: use the collection.)*

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
| `weather` | group | `{ latitude: number (40.1969), longitude: number (23.7761) }` (for the live weather widget) |
| `defaultSeo` | group | `{ titleTemplate: text, description: textarea, ogImage: upload }` |

#### `navigation`
`leftLinks` + `rightLinks` arrays of `{ label: text, href: text }`. Current: left = Avista Villa,
Private Resort; right = Location, Enquire (→ `/contact`).

#### `footer`
`brandBlurb` (textarea) + `columns` array of `{ heading: text, links: array<{ label, href }> }`.
Current columns: **Explore** (Avista Villa / Private Resort / Location / Enquire) and **Contact**
(email, phone, address).

#### Page singletons: `home`, `locationPage`, `contactPage`
- `home`: hero `{ ...heroMedia, kicker, title, sub }`, intro `lead`/`statement`,
  `villas` group `{ kicker: text, title: text, body: textarea, featured: relationship → properties (hasMany) }`
  — owns the home page's `#villas` comparison section: optional section copy plus which villas to show and in
  what order. Leave `featured` empty to fall back to **all** `properties` sorted by their `order`. The cards
  themselves still come from the `properties` collection (this group only frames the section), gallery selection,
  `services` array `{ iconKey: select, title: text, description: textarea }` ("What can be arranged",
  4 items), location summary, `locationFacts` array `{ value, label }`, CTA `{ title, body, buttonLabel }`.
- `locationPage`: `{ ...heroMedia }` hero, overview copy, `locationFacts`, `map` (**`mapLocation`**), the two cross-links.
- `contactPage`: hero `{ ...heroMedia, kicker, title, sub }`, invitation copy, `map` (**`mapLocation`**). (The form fields are
  code, in the Astro front end — not content.)

> Hero on the home page can be lighter than the villa heroes (it is the very first paint): consider
> setting `playOnMobile = false` so phones show the poster image and the desktop video never downloads.

> `locationFacts` appears on both `home` and `locationPage`. Duplicate the array on each (simplest),
> or promote it to a small `facts` collection for a single edit point.

### Icon registry (`iconKey`)
Amenities, services, and the weather widget use **inline SVGs**, not uploaded files. The SVGs live in
an Astro component (see `ASTRO-MIGRATION.md`); the CMS stores only the **key**. Offer these as the
`iconKey` select options:

```
amenities/services: bed | bath | pool | view | kitchen | garden | wifi | parking | accessible | bbq | concierge | chef
weather (set by code, from avista.js pick()): sun | part | cloud | fog | rain | snow | storm
```

## 3.5 Responsive media & map (mobile-first, target ~100 Lighthouse)

Three things decide the mobile score on an image-led site like this: the **hero** (it is the LCP), the
**map** (a Google Maps iframe is ~hundreds of KB of third-party JS), and **every other image** (size +
CLS). The schema is shaped so the front end can do the right thing for each. Define these two reusable
field groups once and import them wherever a hero or a map appears.

### `heroMedia` — responsive hero (desktop **and** mobile, image **and** video)

```ts
// fields/heroMedia.ts — spread into any hero group: { ...heroMedia, kicker, title, sub }
import type { Field } from 'payload';

export const heroMedia: Field[] = [
  // --- Image (the LCP element; always required so there is a fast, light first paint) ---
  { name: 'imageDesktop', type: 'upload', relationTo: 'media', required: true,
    admin: { description: 'Shown ≥768px and as the video poster/fallback. LCP image.' } },
  { name: 'imageMobile', type: 'upload', relationTo: 'media',
    admin: { description: 'Portrait-friendly crop shown <768px. Falls back to imageDesktop if empty.' } },

  // --- Optional video, with a lighter mobile encode (R2 URLs, matching today's setup) ---
  { name: 'videoDesktop', type: 'text',
    admin: { description: 'R2 URL, MP4 (H.264) + ideally a WebM. Optional. Plays muted/looped.' } },
  { name: 'videoMobile', type: 'text',
    admin: { description: 'Lighter/shorter encode for phones (≤~1.5 MB). Optional.' } },

  // --- Data-saver + LCP controls ---
  { name: 'playOnMobile', type: 'checkbox', defaultValue: false,
    admin: { description: 'OFF = phones show the poster image only and never download the video (recommended for the home hero).' } },
  { name: 'priority', type: 'checkbox', defaultValue: true,
    admin: { description: 'Above-the-fold hero: front end preloads it + sets fetchpriority="high". Turn OFF for heroes below the fold.' } },
];
```

Why this shape:
- **Separate mobile/desktop images** let you ship a 900px-wide portrait crop to phones instead of a
  2400px landscape one. The front end renders a `<picture>` with `media` queries; Payload's
  `imageSizes` produce the actual `srcset` per source.
- **Separate mobile video** (or none) avoids autoplaying a multi-MB desktop video over cellular. With
  `playOnMobile = false` the phone loads **zero** video bytes — just the poster image.
- **`priority`** tells the front end which hero is the LCP so it can `<link rel="preload">` it and set
  `fetchpriority="high"`; every other image stays lazy.

### `mapLocation` — pin + click-to-load facade

```ts
// fields/mapLocation.ts — spread into any map group: { ...mapLocation }
import type { Field } from 'payload';

export const mapLocation: Field[] = [
  { name: 'latitude',  type: 'number', required: true, admin: { description: 'Pin latitude, e.g. 40.1969' } },
  { name: 'longitude', type: 'number', required: true, admin: { description: 'Pin longitude, e.g. 23.7761' } },
  { name: 'zoom',      type: 'number', defaultValue: 14, min: 1, max: 20 },
  { name: 'label',     type: 'text',   admin: { description: 'Pin tooltip / place name, e.g. "Avista Villa, Vourvourou"' } },
  { name: 'directionsQuery', type: 'text',
    admin: { description: 'Optional. "Get directions" link target; falls back to "lat,lng".' } },
  { name: 'staticPreview', type: 'upload', relationTo: 'media',
    admin: { description: 'Static map image (with the pin baked in) shown as the facade. The interactive iframe only loads on click — keeps the map off the critical path.' } },
];
```

The interactive Google/OSM embed is **never** in the initial HTML. The front end paints
`staticPreview` (a normal optimized `<img>`) with a play/expand affordance, and only injects the iframe
when the visitor clicks it. Coordinates also drive a precise pin (instead of a fuzzy text search) and
the "Get directions" deep link.

> If you'd rather not maintain static map screenshots, the front end can synthesize the facade from the
> coordinates (a styled static-tile image or a CSS pin over a muted tile). `staticPreview` is the
> highest-quality option; the coordinates are the required part.

### Performance rules the schema enforces (hand these to the front end)

| Lever | Schema gives you | Front end must |
|---|---|---|
| **LCP** | `heroMedia.priority`, `imageDesktop`/`imageMobile`, posters | preload the chosen hero image, `fetchpriority="high"`, **not** lazy; defer/omit video on mobile per `playOnMobile` |
| **CLS** | stored `width`/`height` on every upload + `blurDataURL` | always set `width`/`height` (or `aspect-ratio`) and a blur placeholder background |
| **Image weight** | `imageSizes` (WebP/AVIF) → `srcset` | ship `srcset` + correct `sizes`; gallery grid uses small sizes, the viewer uses large |
| **Third-party JS** | `mapLocation.staticPreview` + coords | facade the map; load the iframe only on click |
| **Lazy work** | everything below the hero | `loading="lazy"` + `decoding="async"` on all non-LCP images; the scroll viewer eager-loads only the opened photo |

## 4. Enquiries — closing the contact-form loop

The Astro front end posts the contact form to a **Cloudflare Pages Function** (`/api/enquiry`) that
forwards to this CMS's public `enquiries` create endpoint — full front-end code is in
`ASTRO-MIGRATION.md`. On this side you need the collection (above) plus an optional email hook:

```ts
// inside the `enquiries` collection config — fires only when email is configured (§5)
hooks: {
  afterChange: [
    async ({ doc, operation, req }) => {
      if (operation !== 'create') return;
      await req.payload.sendEmail({
        to: 'stay@avista.gr',
        subject: `New enquiry — ${doc.name}`,
        text: `${doc.name} (${doc.email})\nVilla: ${doc.preferredProperty}\n` +
              `Dates: ${doc.arrival ?? '?'} → ${doc.departure ?? '?'} · guests ${doc.guests ?? '?'}\n\n${doc.message}`,
      });
    },
  ],
}
```

Enable CORS for the front-end origin if you let the form POST directly instead of via the function.

## 5. Config & code

```ts
// payload.config.ts (Payload 3.x — deployed to Cloudflare Workers via @opennextjs/cloudflare)
import { buildConfig } from 'payload';
import { sqliteAdapter } from '@payloadcms/db-sqlite';      // Cloudflare D1
import { s3Storage } from '@payloadcms/storage-s3';         // Cloudflare R2 (S3-compatible)
import { resendAdapter } from '@payloadcms/email-resend';   // HTTP email (optional — provider undecided; no SMTP on Workers)
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
import { heroMedia } from '../fields/heroMedia';     // §3.5
import { mapLocation } from '../fields/mapLocation';  // §3.5

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
        ...heroMedia,                       // responsive desktop+mobile image & video (fields/heroMedia.ts, §3.5)
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
    { name: 'map', type: 'group', fields: [ ...mapLocation ] },   // pin + facade (fields/mapLocation.ts, §3.5)
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

```ts
// collections/Media.ts — responsive, modern-format, zero-CLS uploads on R2
import type { CollectionConfig } from 'payload';
import sharp from 'sharp';

export const Media: CollectionConfig = {
  slug: 'media',
  access: { read: () => true },
  upload: {
    // Payload also stores width/height/filesize/mimeType automatically → use them for <img> dims (CLS=0).
    focalPoint: true,
    // Pre-generate the widths the front end will reference in srcset. Crops where it matters.
    imageSizes: [
      { name: 'thumbnail', width: 480 },                                   // gallery grid tiles, cards
      { name: 'card',      width: 800 },
      { name: 'mobile',    width: 1080 },                                   // hero/full-bleed on phones
      { name: 'tablet',    width: 1600 },                                   // gallery scroll viewer
      { name: 'desktop',   width: 2000 },
      { name: 'hero',      width: 2400 },                                   // desktop full-bleed hero
      { name: 'og',        width: 1200, height: 630, position: 'centre' },  // social card
    ],
    // Emit modern formats. AVIF is smallest; WebP is the safe default. (Per-size formatOptions also allowed.)
    formatOptions: { format: 'webp', options: { quality: 72 } },
    // Strip metadata for smaller files.
    withMetadata: false,
  },
  fields: [
    { name: 'alt', type: 'text', required: true },
    { name: 'caption', type: 'text' },
    // Tiny LQIP placeholder (~0.5–1 KB) generated on upload; front end uses it as a blurred background.
    { name: 'blurDataURL', type: 'text', admin: { readOnly: true, hidden: true } },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req, operation }) => {
        if (operation !== 'create' || doc.blurDataURL) return doc;
        try {
          const file = req.file?.data;                    // original upload buffer
          if (!file) return doc;
          const buf = await sharp(file).resize(16).webp({ quality: 40 }).toBuffer();
          doc.blurDataURL = `data:image/webp;base64,${buf.toString('base64')}`;
          await req.payload.update({ collection: 'media', id: doc.id, data: { blurDataURL: doc.blurDataURL } });
        } catch { /* non-fatal: image still works without the placeholder */ }
        return doc;
      },
    ],
  },
};
```

> **Even better on Cloudflare:** instead of (or alongside) pre-generating `imageSizes`, store the
> original on R2 and transform at the edge with **Cloudflare Image Resizing** (`/cdn-cgi/image/
> width=NNN,format=auto,quality=72/<r2-url>`). `format=auto` serves AVIF/WebP per the browser, and you
> resize per request with no extra storage. The schema is identical either way — only the front-end
> URL builder changes (see §8).

`Navigation`, `Footer`, `Home`, `LocationPage`, and `ContactPage` follow the same
`CollectionConfig` / `GlobalConfig` shape using the fields listed in §3 — one file each. `Home`,
`LocationPage`, and `ContactPage` spread `...heroMedia` / `...mapLocation` the same way `Properties`
does.

The one field worth spelling out is the `home` global's **`villas`** section group (it frames the
home page's `#villas` comparison block — see §3):

```ts
// inside globals/Home.ts → fields: [ ... ]
{
  name: 'villas', type: 'group', fields: [
    { name: 'kicker', type: 'text' },
    { name: 'title',  type: 'text' },
    { name: 'body',   type: 'textarea' },
    { name: 'featured', type: 'relationship', relationTo: 'properties', hasMany: true,
      admin: { description: 'Villas shown on the home page, in this order. Leave empty to show all by their `order`.' } },
  ],
},
```

## 6. Build order

1. **Scaffold** `npx create-payload-app` with the **SQLite/D1** adapter and **R2** storage; plan to
   deploy to Workers via `@opennextjs/cloudflare`.
2. **Add collections & globals** from §3 / §5.
3. **Seed content** from the current HTML (2 properties, ~12 reviews, amenities, galleries, facts,
   services, globals). A one-off seed script that reads the existing pages speeds this up.
4. **Upload media** to the `media` collection on R2, preserving every `alt`. Confirm `imageSizes`
   generate and `blurDataURL` populates (§3.5 / §5) — this is what the mobile score rides on.
5. **Expose the API** the Astro build will read (`GET /api/properties?depth=2`, etc.); confirm public
   `read` access on `properties`/`reviews` and public `create` on `enquiries`.
6. **(Optional) Email:** add an HTTP email adapter + the `afterChange` hook when you pick a provider.
7. **Deploy** to Cloudflare Workers (D1 + R2). Add a Cloudflare Pages **deploy hook** and call it from a
   Payload `afterChange` so publishing content rebuilds the Astro site.

## 7. Open decisions

1. **Email provider — undecided:** Resend / Postmark / SendGrid (HTTP; no SMTP). Non-blocking.
2. **Real contact phone number** (current `+30 000 000 000` is a placeholder).
3. **Reviews source of truth:** manual entries (current) vs. a future Booking.com/Google import.
4. **Image transform strategy:** Payload `imageSizes` (portable) vs. Cloudflare Image Resizing at the
   edge (`format=auto`, no extra storage). Either works with this schema; pick one before wiring §8.

## 8. Astro front-end changes (yes — required)

The schema changes above don't render themselves; the Astro side has to consume them. None of it is
large, and most of it is "pass the new fields through + add the right attributes." Hand this list to
whoever builds the front end (it pairs with `ASTRO-MIGRATION.md`).

**1. A media URL helper — `src/lib/media.ts`.** One function that turns a Payload `media` upload into
`{ src, srcset, sizes, width, height, blurDataURL, alt }`. It reads `imageSizes` URLs (or builds
`/cdn-cgi/image/width=…,format=auto,quality=72/<r2-url>` if you chose Cloudflare Resizing) and the
stored `width`/`height`/`blurDataURL`. Every image on the site goes through it.

**2. `Hero.astro` — responsive image + video.** Today it takes a single `image`/`videoUrl`. Change it to
take `heroMedia` and render:
- a `<picture>`: `<source media="(max-width:767px)" srcset={imageMobile…}>` then a desktop
  `<img srcset sizes width height>`. The hero `<img>` is **eager** + `fetchpriority="high"` +
  `decoding="async"`.
- the `<video>` only when a video exists **and** (`!isMobile || playOnMobile`): `<source>` for
  `videoMobile`/`videoDesktop` (WebM then MP4), `poster`, `muted loop playsinline preload="metadata"`.
  When `playOnMobile` is false, phones render just the poster `<img>` and download no video.
- in the page `<head>`, when `priority` is set: `<link rel="preload" as="image" imagesrcset=… imagesizes=…>`
  for the hero, and `<link rel="preconnect">` to the R2 / image origin.

**3. `MapEmbed.astro` — facade instead of an eager iframe.** Today it renders a Google Maps `<iframe>`
on load (the single biggest mobile-perf hit). Change it to take `mapLocation` and render the
`staticPreview` image (via the media helper) inside a `<button>` with a "View map" affordance; on click,
swap in the `<iframe>` (built from `latitude`/`longitude`/`zoom`). Add a plain "Get directions" link to
`https://www.google.com/maps/dir/?api=1&destination=${directionsQuery ?? `${lat},${lng}`}`. Result: the
map costs ~one image on load and only pulls Google's JS if the visitor asks for it.

**4. Gallery (carousel + the grid/scroll viewer we built) — responsive `srcset`.** The components
already split a small "thumb" from the full image; wire those to the media helper so the carousel and
the grid tiles use `thumbnail`/`card` sizes and the scroll viewer uses `tablet`/`desktop`. Keep grid &
carousel images `loading="lazy"`; the scroll viewer already eager-loads only the opened photo.

**5. Every `<img>` gets dimensions + a blur placeholder.** Set `width`/`height` (or a wrapper
`aspect-ratio`) from the stored values and use `blurDataURL` as a blurred `background-image` that the
image fades over. This is what takes CLS to 0.

**6. Astro config / fonts (perf housekeeping).** If you use `astro:assets`, add the R2 host (and the
Cloudflare image endpoint) to `image.domains`/`remotePatterns`; otherwise the media helper emits plain
`<img>` and you skip that. Also self-host or `preconnect` the Cormorant/Jost fonts with
`font-display: swap` and preload the hero display weight — render-blocking font CSS is a common reason an
otherwise-fast page misses 100.

**What does _not_ change:** the contact-form flow, the weather widget, reviews, nav/footer — those just
swap hard-coded values for CMS fields (per `ASTRO-MIGRATION.md`) and need no perf work.
