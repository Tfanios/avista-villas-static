import handler, { createScheduledHandler, PluginBridge } from "@emdash-cms/cloudflare/worker";

export { PluginBridge };

export default {
  ...handler,
  fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.hostname === "www.avistavillas.com") {
      url.hostname = "avistavillas.com";
      return Response.redirect(url.toString(), 301);
    }
    return handler.fetch!(request, env, ctx);
  },
  scheduled: createScheduledHandler()
} satisfies ExportedHandler;
