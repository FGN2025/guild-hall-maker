import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// Publishable (anon) backend settings used as a build-time fallback when the
// platform does not inject VITE_SUPABASE_* into the build environment. The
// anon key is safe to ship in client code; access is enforced by RLS.
const FALLBACK_SUPABASE_URL = "https://yrhwzmkenjgiujhofucx.supabase.co";
const FALLBACK_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyaHd6bWtlbmpnaXVqaG9mdWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzM1NjMsImV4cCI6MjA4NjYwOTU2M30.echaV8AKghAqXcwqnn8SWOq06vrN-ks_v8XK29M8DxI";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const define: Record<string, string> = {};
  if (!(process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL)) {
    define["import.meta.env.VITE_SUPABASE_URL"] = JSON.stringify(FALLBACK_SUPABASE_URL);
  }
  if (!(process.env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY)) {
    define["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"] = JSON.stringify(FALLBACK_SUPABASE_ANON_KEY);
  }
  return {
  define,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mcpPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    // Pre-bundle these in dev so the browser doesn't fetch hundreds of icon
    // modules individually on first load. Drastically improves dev FCP.
    include: ["lucide-react", "react-router-dom", "@tanstack/react-query"],
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy/seldom-used libs into their own chunks so they don't
        // bloat the main entry bundle. Each chunk is downloaded only when a
        // route/component that uses it is loaded.
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("react-markdown") || id.includes("remark-") || id.includes("rehype-") || id.includes("micromark") || id.includes("mdast-")) return "markdown";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("embla-carousel")) return "carousel";
          if (id.includes("react-day-picker") || id.includes("date-fns")) return "datepicker";
          if (id.includes("lucide-react")) return "icons";
        },
      },
    },
  },
}));
