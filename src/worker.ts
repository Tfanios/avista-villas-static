import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

const CANONICAL_HOST = "avistavillas.com";

// Pre-relaunch (Nov 2026) URLs that still rank in Google, mapped to their new
// pages. Keys have no trailing slash; lookups strip one so both forms match.
const LEGACY_REDIRECTS: Record<string, string> = {
  "/villa-avista": "/avista-villa/",
  "/superb-villa": "/",
  "/area": "/location/",
  "/experiences": "/location/"
};

export default {
  ...handler,
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    const legacyKey = url.pathname.replace(/\/+$/, "").toLowerCase();
    const legacyTarget = LEGACY_REDIRECTS[legacyKey];

    // One hop: send old URLs (on either host) straight to the final canonical URL.
    if (legacyTarget || url.hostname === `www.${CANONICAL_HOST}`) {
      url.protocol = "https:";
      if (url.hostname === `www.${CANONICAL_HOST}`) url.hostname = CANONICAL_HOST;
      if (legacyTarget) url.pathname = legacyTarget;
      return Response.redirect(url.toString(), 301);
    }
    return handler.fetch!(request, env, ctx);
  },
  scheduled: createScheduledHandler()
} satisfies ExportedHandler;
