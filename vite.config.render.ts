// Vite config for static site deployment (GitHub Pages / Render)
// Usage: vite build --config vite.config.render.ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

// For GitHub Pages: set base to "/<repo-name>/" if deploying to a project page
// For Render / custom domain: set base to "/"
const base = process.env.GITHUB_PAGES === "true"
  ? "/network_analysis_platform/"
  : "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist-render"),
    emptyOutDir: true,
  },
});
