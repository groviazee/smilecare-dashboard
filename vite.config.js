import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Splits big vendor libraries into their own cached files instead of one
    // giant ~800KB bundle. Browsers cache these separately, so a future
    // deploy that only touches app code won't force staff to re-download
    // React/Recharts/Supabase again — just the small app chunk.
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-charts": ["recharts"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-icons": ["lucide-react"],
        },
      },
    },
  },
});
