import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({
  root: resolve(import.meta.dirname, "static"),
  base: "/mua-ca-phe/",
  publicDir: resolve(import.meta.dirname, "public"),
  plugins: [react()],
  define: {
    "import.meta.env.VITE_MARKET_API_BASE": JSON.stringify(
      "https://mua-ca-phe-vn.cozyspoon36.chatgpt.site",
    ),
  },
  build: {
    outDir: resolve(import.meta.dirname, "dist-pages"),
    emptyOutDir: true,
  },
  server: { fs: { allow: [import.meta.dirname] } },
});
