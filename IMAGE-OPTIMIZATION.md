# Image delivery

Photos are optimized during `npm run build` with Astro's image service. Payload
continues to store the originals; visitors load generated WebP files from
`/_astro/` on this site.

- `src/lib/optimized-image.ts` creates 480, 800, 1200, 1600 and 2400px variants
  at quality 80, capped at the source width so small images are not enlarged.
- Use `OptimizedImage.astro` for content photos. It supplies responsive sources,
  intrinsic dimensions, asynchronous decoding and lazy loading. Set `sizes` to
  match the displayed width; full-width backgrounds use `100vw`.
- Hero images and their preloads share the same generated sources. When a mobile
  hero is supplied, media queries select the matching preload. The responsive
  picture is also the fallback behind video, avoiding a second poster download.
- Gallery cards use previews. The gallery modals receive responsive sources only
  when opened; the largest generated photo is capped at 2400px.
- SVG logos and the cursor remain vectors.
- `public/_headers` gives generated assets a one-year immutable browser cache.
  Astro generates hashed filenames. Upload replacement photos with new filenames
  rather than overwriting an existing image URL, so build and browser caches can
  distinguish revisions.

Publish CMS image changes with a fresh build and deployment. The first build
downloads and transforms originals; retaining `node_modules/.astro` in CI speeds
up subsequent builds. If the CMS moves, update the image-domain allowlist in
`astro.config.mjs`.
