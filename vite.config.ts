import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist", "public"),
    emptyOutDir: true,
    // Modern browsers only — drops ~12 KB of unnecessary babel polyfills
    // (Object.assign, Array.find, String.startsWith, classes, spread, etc.).
    target: "es2022",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Split heavy vendor libs out of the main bundle so the storefront ships
        // ~280 KB of essential React+MUI instead of one 947 KB blob.
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("/recharts/") || id.includes("/d3-")) return "charts";
          if (id.includes("/quill") || id.includes("/react-quill")) return "editor";
          if (id.includes("/@mui/icons-material/")) return "mui-icons";
          if (
            id.includes("/@mui/material/") ||
            id.includes("/@mui/system/") ||
            id.includes("/@mui/private-theming/") ||
            id.includes("/@emotion/")
          ) {
            return "mui-core";
          }
          if (id.includes("/swiper/")) return "swiper";
          if (id.includes("/react-helmet")) return "helmet";
          if (
            id.includes("/react-dom/") ||
            (id.includes("/react/") && !id.includes("/react-")) ||
            id.includes("/scheduler/") ||
            id.includes("/wouter") ||
            id.includes("/@tanstack/react-query/")
          ) {
            return "react-vendor";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    fs: { strict: true, deny: ["**/.*"] },
  },
});
