# EmDash migration

The site now renders on a Cloudflare Worker and reads content from EmDash on each
request, so published edits appear without a rebuild.

| Resource | Name | Binding |
|---|---|---|
| Worker | `avista-emdash` | |
| D1 | `avista-emdash` | `DB` |
| R2 | `avista-emdash-media` | `MEDIA` |
| Images | | `IMAGES` |
| KV (sessions, created on first deploy) | | `SESSION` |

The live `avista-villas-static` Worker and all `payload-avista-villas` resources
are separate and unchanged.

## Run locally

```sh
EMDASH_SITE_URL=http://localhost:4321 npm run dev
```

A fresh local database needs seeding. Keep Payload online, because the seed
downloads media from it:

```sh
curl -X POST http://localhost:4321/_emdash/api/setup/dev-bypass \
  -H 'X-EmDash-Request: 1' -H 'Content-Type: application/json'
```

## First deployment

The remote D1 and R2 are empty until these steps are done.

The production domain is `https://avistavillas.com`, which still serves the live
site. Set up on the staging subdomain first; passkeys created there also work on
the production domain.

1. Add `staging.avistavillas.com` as a custom domain for this Worker, then deploy:

   ```sh
   npm run deploy
   ```

2. Open `https://staging.avistavillas.com/_emdash/admin` straight away and finish
   the setup wizard with sample content enabled. Until then, the first visitor can
   claim the admin account.
3. Keep Payload online until the wizard finishes; it copies all media.
4. Check the site. Staging serves full-size images and is marked `noindex`; both
   are expected.
5. Move `avistavillas.com` to this Worker, then submit
   `https://avistavillas.com/sitemap.xml` in Google Search Console.

The Worker is about 4.3 MB gzipped, so it needs the Workers Paid plan.

## SEO

`src/layouts/BaseLayout.astro` adds canonical, Open Graph and icon tags. Structured
data is built in `src/lib/seo.ts`. Any host other than the production domain gets
`noindex`, and `/sitemap.xml` is generated from the current content.

Share images use the entry's `seo_og_image`, then its hero. Review ratings are
deliberately not in the structured data: they come from Booking.com, which Google's
review guidelines exclude.

## Section visibility

Each section has a `show_*` checkbox on its page or villa entry. The location
page's local guide uses its existing `local_guide_enabled` field.

| Entry | Shown by default | Hidden by default |
|---|---|---|
| Home page | hero, intro, villas, gallery, location, cta | services |
| Villas | hero, spaces, amenities, gallery, reviews, map, cta | location, cross_link |
| Location page | hero, cta | overview |
| Contact page | hero, enquiry, map | |
| Footer | footer | |

Hidden-by-default sections were commented out of the templates before the
migration. To add a toggle, add it to `SECTIONS` in
`scripts/build-emdash-seed.mjs` and to the `sections()` call in `src/lib/cms.ts`.
Changing the seed only affects new databases; add the field in the admin for a
database that already exists.

## Update the seed

```sh
npm run export:emdash -- --url https://payload-avista-villas.fanis1337.workers.dev
npm run seed:build -- exports/payload-<timestamp>/seed.json
```

## Known limitations

- Global pages are ordinary collections with one entry. If an editor adds a second
  entry, the oldest one is used.
- Contact email and phone numbers are still hardcoded in `src/lib/cms.ts`, and the
  postal address used in structured data is hardcoded in `src/lib/seo.ts`.
- Hero videos still load from the existing `pub-d6e79d28cef04ba49c2a61300dbd5552.r2.dev` URL.
- The enquiry form sends through EmailJS, so enquiries are not stored in EmDash.
