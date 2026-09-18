import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  image: {
    domains: ["payload-avista-villas.fanis1337.workers.dev"]
  },
  trailingSlash: "always"
});
