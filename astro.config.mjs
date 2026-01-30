// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Dynamic adapter selection based on BUILD_TARGET environment variable
// - "vercel" → @astrojs/vercel (for PROD on Vercel)
// - "node" (default) → @astrojs/node (for DEV and TEST)
const getAdapter = async () => {
  const target = process.env.BUILD_TARGET || "node";

  if (target === "vercel") {
    const vercel = (await import("@astrojs/vercel")).default;
    return vercel();
  }

  // Default to node for DEV and TEST environments
  const node = (await import("@astrojs/node")).default;
  return node({ mode: "standalone" });
};

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [react(), sitemap()],
  server: { port: 3000 },
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: await getAdapter(),
});