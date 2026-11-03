import { defineMiddleware } from "astro:middleware";
import { withContentScope } from "./lib/cms";

function isPublicPageWithoutSlash(pathname: string) {
  return !pathname.endsWith("/") && !pathname.startsWith("/_") && !pathname.includes(".");
}

export const onRequest = defineMiddleware((context, next) => {
  const { url, request } = context;
  if (request.method === "GET" && isPublicPageWithoutSlash(url.pathname)) {
    return context.redirect(`${url.pathname}/${url.search}`, 301);
  }

  return withContentScope(url.origin, next);
});
