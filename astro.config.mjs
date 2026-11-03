import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

// Fixes the passkey domain and the origin allowed for image optimization, so it
// must be the public URL when building. Override with EMDASH_SITE_URL.
const siteUrl = process.env.EMDASH_SITE_URL ?? "https://avista-emdash.fanis1337.workers.dev";

export default defineConfig({
  site: siteUrl,
  output: "server",
  adapter: cloudflare(),
  integrations: [
    react(),
    emdash({
      database: d1({ binding: "DB" }),
      storage: r2({ binding: "MEDIA" }),
      siteUrl
    })
  ],
  // EmDash routes have no trailing slash; src/middleware.ts keeps it on public pages.
  trailingSlash: "ignore"
});
