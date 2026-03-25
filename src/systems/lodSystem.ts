import { eventBus } from "@/core/EventBus";
import * as THREE from "three/webgpu";

export class LODSystem {
  private CHUNK_CELL = { x: 5, z: 4 };
  private CHUNK_SIZE = 23;
  private OFFSET = { x: 0, z: -10 };
  public chunks = new Set<Chunk>(); // 생성된 청크들을 담아둘 배열

  constructor() {
    // 맵 전체 크기의 절반 (기준점을 0,0,0 정중앙에 맞추기 위함)
    const halfX = (this.CHUNK_SIZE * this.CHUNK_CELL.x) / 2;
    const halfZ = (this.CHUNK_SIZE * this.CHUNK_CELL.z) / 2;
    // 청크의 꼭짓점이 아닌 '중앙'을 잡기 위한 오프셋 (절반 크기)
    const offset = this.CHUNK_SIZE / 2;

    for (let i = 0; i < this.CHUNK_CELL.x; i++) {
      for (let j = 0; j < this.CHUNK_CELL.z; j++) {
        // x, z 좌표 계산 (-24 ~ +24 사이로 격자 배치)
        const x = i * this.CHUNK_SIZE - halfX + offset + this.OFFSET.x;
        const z = j * this.CHUNK_SIZE - halfZ + offset + this.OFFSET.z;

        const center = new THREE.Vector3(x, 0, z);
        const id = `chunk_${i}_${j}`; // 고유 ID 부여 (예: chunk_0_0)

        // 청크 생성 후 배열에 저장
        const chunk = new Chunk(id, center);
        this.chunks.add(chunk);
      }
    }

    eventBus.on("lateUpdate", ({ playerPos }) => {
      this.update(playerPos);
    });
  }

  // 매 프레임(animate)마다 호출할 업데이트 함수
  update(cameraPosition: THREE.Vector3) {
    for (const chunk of this.chunks) {
      chunk.checkLOD(cameraPosition);
    }
  }
  get offset() {
    return this.OFFSET;
  }

  get chunkSize() {
    return this.CHUNK_SIZE;
  }

  get chunkCell() {
    return this.CHUNK_CELL;
  }
}

class Chunk {
  public id: string;
  private center: THREE.Vector3;

  private currentLevel: string = ""; // 현재 LOD 상태 저장용

  constructor(id: string, center: THREE.Vector3) {
    this.id = id;
    this.center = center;
  }

  // 통합 LOD 관리자 함수
  checkLOD(cameraPosition: THREE.Vector3) {
    const dist = this.center.distanceTo(cameraPosition);
    let newLevel = "";

    // 거리에 따른 레벨 결정
    if (dist < 40) newLevel = "level_1";
    else if (dist >= 40 && dist < 100) newLevel = "level_2";
    else newLevel = "level_3";

    // 💡 핵심 최적화: 기존 레벨과 달라졌을 때만(상태 변화) 이벤트 발생!
    if (this.currentLevel !== newLevel) {
      this.currentLevel = newLevel;

      // 어떤 청크가 어떤 레벨로 변했는지 객체로 묶어서 전달
      eventBus.emit("lod_changed", {
        chunkId: this.id,
        level: this.currentLevel
      });
    }
  }

  // 여기서 각 grass, long grass의 데이터를 받아와서 chunk의 업데이트에 맞춰서 애들이 같이 업데이트 됐으면 좋겠다.
  // 그러려면 최적화 할 수 있는 부분은 최대한 최적화 하고 맵으로 받아와서 각 맵의 values만 뽑아 꼭 for문 돌려야하는 부분만 같이 돌림.
}

export const lodManager = new LODSystem();
