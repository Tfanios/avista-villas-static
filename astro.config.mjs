import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

// Sets canonical URLs, the passkey domain and the origin allowed for image
// optimization. Override with EMDASH_SITE_URL for local runs.
const siteUrl = process.env.EMDASH_SITE_URL ?? "https://avistavillas.com";

export default defineConfig({
  site: siteUrl,
  output: "server",
  adapter: cloudflare(),
  integrations: [
    react(),
    emdash({
      database: d1({ binding: "DB" }),
      storage: r2({ binding: "MEDIA" }),
      siteUrl,
      // Lets setup run on a subdomain while the live site still owns the apex.
      // Only valid alongside the production siteUrl.
      allowedOrigins: siteUrl.endsWith("avistavillas.com") ? ["https://staging.avistavillas.com"] : []
    })
  ],
  // EmDash routes have no trailing slash; src/middleware.ts keeps it on public pages.
  trailingSlash: "ignore"
});
