import { defineConfig } from "vite";
import path from "path"; // path 모듈 import

export default defineConfig({
  // ... plugins 등 기존 설정들 ...

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
