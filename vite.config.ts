import { defineConfig } from "vite";
import path from "path"; // path 모듈 import
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  // ... plugins 등 기존 설정들 ...
  plugins: [
    visualizer({ open: true, gzipSize: true }) // ⭐️ 빌드 시 브라우저에 분석표 자동 오픈
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 객체 대신 함수 형태로 변경합니다.
        // id는 빌드되는 각 파일의 절대 경로입니다.
        manualChunks(id) {
          if (id.includes("node_modules/three")) {
            return "three"; // three.js 관련 코드는 'three.js' 파일로 묶음
          }
          if (id.includes("node_modules/@dimforge/rapier3d")) {
            return "rapier"; // 물리 엔진 코드는 'rapier.js' 파일로 묶음
          }
          if (id.includes("lil-gui")) {
            return "gui"; // GUI 코드는 'gui.js' 파일로 묶음
          }
        }
      },
      // 라이브러리 내부의 무의미한 eval 경고 숨기기
      onwarn(warning, warn) {
        if (warning.code === "EVAL") return;
        warn(warning);
      }
    }
  }
});
