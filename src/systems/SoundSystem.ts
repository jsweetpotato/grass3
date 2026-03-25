import * as THREE from "three";

class SurfaceManager {
  // RGB를 모두 읽어야 하므로 원본 RGBA 배열(Uint8ClampedArray)을 그대로 사용합니다.
  private surfaceData: Uint8ClampedArray | null = null;
  private mapWidth = 0;
  private mapHeight = 0;
  
  private worldSize = 1000;
  private invWorldSize = 0.001; 

  constructor(maskImageElement: HTMLImageElement, worldSize = 1000) {
    const width = maskImageElement.width;
    const height = maskImageElement.height;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) return;
    ctx.drawImage(maskImageElement, 0, 0);

    // ★ 최적화: getImageData.data는 이미 브라우저에 최적화된 고속 배열입니다. 그대로 씁니다.
    this.surfaceData = ctx.getImageData(0, 0, width, height).data;

    this.mapWidth = width;
    this.mapHeight = height;

    this.worldSize = worldSize;
    this.invWorldSize = 1.0 / worldSize;
  }

  getSurfaceType(worldX: number, worldZ: number): "grass" | "sand" | "sea" {
    if (!this.surfaceData) return "sand"; // 로딩 전 기본값

    // 월드 좌표를 UV 좌표로 변환 (수학적 최적화 유지)
    const u = worldX * this.invWorldSize + 0.5;
    const v = 0.5 - worldZ * this.invWorldSize;

    // 화면 밖으로 나갔을 때를 대비한 안전장치 (Clamp)
    const pixelX = Math.max(0, Math.min(this.mapWidth - 1, (u * this.mapWidth) | 0));
    const pixelY = Math.max(0, Math.min(this.mapHeight - 1, (v * this.mapHeight) | 0));

    // ★ RGBA 배열이므로 픽셀 하나당 4칸씩 차지합니다 (* 4 필요)
    const index = (pixelY * this.mapWidth + pixelX) * 4;

    // R, G, B 채널 값을 각각 가져옵니다.
    const r = this.surfaceData[index];     // Red: 잔디
    const g = this.surfaceData[index + 1]; // Green: 모래
    const b = this.surfaceData[index + 2]; // Blue: 바다

    // ★ 3가지 색상 중 가장 수치가 높은(우세한) 채널을 찾아냅니다.
    if (r > g && r > b) {
      return "grass";
    } else if (b > r && b > g) {
      return "sea";
    } else {
      // Green이 가장 높거나, 색이 모호할 때는 기본값으로 모래를 반환합니다.
      return "sand"; 
    }
  }

  playFootstepSound(playerPos: THREE.Vector3) {
    const surface = this.getSurfaceType(playerPos.x, playerPos.z);

    if (surface === "grass") {
      console.log("잔디 소리 재생 🌿");
      // audio.play("step_grass.mp3");
    } else if (surface === "sea") {
      console.log("첨벙첨벙 바다 소리 재생 🌊");
      // audio.play("step_water.mp3");
    } else {
      console.log("모래 소리 재생 🏖️");
      // audio.play("step_sand.mp3");
    }
  }
}