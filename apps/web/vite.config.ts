import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "spa-github-pages-fallback",
      closeBundle() {
        const index = resolve("dist/index.html");
        if (existsSync(index)) copyFileSync(index, resolve("dist/404.html"));
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.API_PORT ?? "3001"}`,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
