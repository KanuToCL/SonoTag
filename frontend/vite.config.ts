import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/model-status": "http://localhost:8000",
      "/prompts": "http://localhost:8000",
      "/classify": "http://localhost:8000",
      "/classify-local": "http://localhost:8000",
      "/analyze-youtube": "http://localhost:8000",
      "/prepare-youtube-video": "http://localhost:8000",
      "/stream-video": "http://localhost:8000",
      "/cleanup-video": "http://localhost:8000",
      "/system-info": "http://localhost:8000",
      "/recommend-buffer": "http://localhost:8000",
    },
  },
});
