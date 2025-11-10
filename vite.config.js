import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const host = true || process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  base: './',
  server: {
    port: 3000,
    strictPort: true,
    host: host || false,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 3000,
    },
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  build: {
    minify: false,
  },
}));
