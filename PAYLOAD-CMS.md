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
| `hero` | group | `{ image: upload, videoUrl: text (optional, R2), poster: upload, kicker: text, title: text, sub: textarea }` |
| `summary` | textarea | comparison-card description |
| `overview` | richText | detail-page lead + body copy |
| `stats` | array | `{ value: text, label: text }` — e.g. `5 / Bedrooms`, `10 / Guests`, `∞ / Infinity pool`, `Wide / Sea views` |
| `amenities` | array | `{ iconKey: select, title: text, description: textarea }` — 8–9 per villa |
| `gallery` | array | `{ image: upload, alt: text, layout: select(l\|p\|s), height: select(h1..h5) }` |
| `mapQuery` | text | Google Maps query string for this villa |
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

#### `media` (upload collection)
Replaces the static `assets/**` images. `upload: true` with a **required `alt`** field (the current
markup already has descriptive `alt` on every image — preserve it). Store on **R2** (§5). *(If you
prefer to keep images static for v1, skip this and store image paths as `text` instead of `upload`.)*

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
- `home`: hero `{ image/video, kicker, title, sub }`, intro `lead`/`statement`, gallery selection,
  `services` array `{ iconKey: select, title: text, description: textarea }` ("What can be arranged",
  4 items), location summary, `locationFacts` array `{ value, label }`, CTA `{ title, body, buttonLabel }`.
- `locationPage`: hero, overview copy, `locationFacts`, `mapQuery`, the two cross-links.
- `contactPage`: hero `{ kicker, title, sub }`, invitation copy, `mapQuery`. (The form fields are
  code, in the Astro front end — not content.)

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

`Media`, `Navigation`, `Footer`, `Home`, `LocationPage`, and `ContactPage` follow the same
`CollectionConfig` / `GlobalConfig` shape using the fields listed in §3 — one file each.

## 6. Build order

1. **Scaffold** `npx create-payload-app` with the **SQLite/D1** adapter and **R2** storage; plan to
   deploy to Workers via `@opennextjs/cloudflare`.
2. **Add collections & globals** from §3 / §5.
3. **Seed content** from the current HTML (2 properties, ~12 reviews, amenities, galleries, facts,
   services, globals). A one-off seed script that reads the existing pages speeds this up.
4. **Upload media** to the `media` collection on R2, preserving every `alt`.
5. **Expose the API** the Astro build will read (`GET /api/properties?depth=2`, etc.); confirm public
   `read` access on `properties`/`reviews` and public `create` on `enquiries`.
6. **(Optional) Email:** add an HTTP email adapter + the `afterChange` hook when you pick a provider.
7. **Deploy** to Cloudflare Workers (D1 + R2). Add a Cloudflare Pages **deploy hook** and call it from a
   Payload `afterChange` so publishing content rebuilds the Astro site.

## 7. Open decisions

1. **Email provider — undecided:** Resend / Postmark / SendGrid (HTTP; no SMTP). Non-blocking.
2. **Real contact phone number** (current `+30 000 000 000` is a placeholder).
3. **Reviews source of truth:** manual entries (current) vs. a future Booking.com/Google import.
