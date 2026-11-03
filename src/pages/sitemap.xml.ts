import type { APIRoute } from "astro";
import { getSitemapPages } from "../lib/cms";

// Replaces EmDash's sitemap, which only lists routable collections: the home,
// location and contact pages would be missing.
export const GET: APIRoute = async ({ site }) => {
  const pages = await getSitemapPages();
  const urls = pages.map(({ path, lastmod }) => {
    const modified = lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : "";
    return `<url><loc>${new URL(path, site).href}</loc>${modified}</url>`;
  });

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } }
  );
};
