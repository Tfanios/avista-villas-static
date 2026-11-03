# Image delivery

EmDash stores original photos in R2. Pages request resized WebP files through
`/_image`, which EmDash serves using the Cloudflare `IMAGES` binding.

- `src/lib/optimized-image.ts` creates 480, 800, 1200, 1600 and 2400px variants
  at quality 80, capped at the source width so small images are not enlarged.
  Sizes come from the width and height EmDash stores with each upload.
- Use `OptimizedImage.astro` for content photos. It supplies responsive sources,
  intrinsic dimensions, asynchronous decoding and lazy loading. Set `sizes` to
  match the displayed width; full-width backgrounds use `100vw`.
- Hero images and their preloads share the same generated sources. When a mobile
  hero is supplied, media queries select the matching preload. The responsive
  picture is also the fallback behind video, avoiding a second poster download.
- Gallery cards use previews. The gallery modals receive responsive sources only
  when opened; the largest generated photo is capped at 2400px.
- SVG logos and the cursor remain vectors.

Image changes go live when published in the CMS; no rebuild is needed.

Astro only optimizes media from the origin known at build time, so build with
`EMDASH_SITE_URL` set to the public URL. If it does not match, images still load
but as full-size originals.
