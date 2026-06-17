import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 开发服务器把 /api 与 /ws 代理到后端 :8000
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/ws": { target: "ws://127.0.0.1:8000", ws: true },
    },
  },
});
