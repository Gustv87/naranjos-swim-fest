import { defineConfig, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
// mode === 'production' ? '/naranjos-swim-fest/' :
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base:  '/',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), splitVendorChunkPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('@radix-ui')) return 'radix';
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
