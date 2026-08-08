import { eventBus } from "@/core/EventBus";
import { Vector3 } from "three/webgpu";

export class LODSystem {
  private CHUNK_CELL = { x: 5, z: 4 };
  private CHUNK_SIZE = 23;
  private OFFSET = { x: 0, z: -10 };
  public chunks = new Set<Chunk>();

  constructor() {
    const halfX = (this.CHUNK_SIZE * this.CHUNK_CELL.x) / 2;
    const halfZ = (this.CHUNK_SIZE * this.CHUNK_CELL.z) / 2;
    // 청크의 꼭짓점이 아닌 '중앙'을 잡기 위한 오프셋 (절반 크기)
    const offset = this.CHUNK_SIZE / 2;

    for (let i = 0; i < this.CHUNK_CELL.x; i++) {
      for (let j = 0; j < this.CHUNK_CELL.z; j++) {
        const x = i * this.CHUNK_SIZE - halfX + offset + this.OFFSET.x;
        const z = j * this.CHUNK_SIZE - halfZ + offset + this.OFFSET.z;

        const center = new Vector3(x, 0, z);
        const id = `chunk_${i}_${j}`;

        const chunk = new Chunk(id, center);
        this.chunks.add(chunk);
      }
    }

    eventBus.on("lateUpdate", ({ playerPos }) => {
      this.update(playerPos);
    });
  }

  update(cameraPosition: Vector3) {
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
  private center: Vector3;

  private currentLevel: string = "";

  constructor(id: string, center: Vector3) {
    this.id = id;
    this.center = center;
  }

  checkLOD(cameraPosition: Vector3) {
    const dist = this.center.distanceTo(cameraPosition);
    let newLevel = "";

    if (dist < 40) newLevel = "level_1";
    else if (dist >= 40 && dist < 100) newLevel = "level_2";
    else newLevel = "level_3";

    if (this.currentLevel !== newLevel) {
      this.currentLevel = newLevel;

      eventBus.emit("lod_changed", {
        chunkId: this.id,
        level: this.currentLevel,
      });
    }
  }

  // 여기서 각 grass, long grass의 데이터를 받아와서 chunk의 업데이트에 맞춰서 애들이 같이 업데이트 됐으면 좋겠다.
  // 그러려면 최적화 할 수 있는 부분은 최대한 최적화 하고 맵으로 받아와서 각 맵의 values만 뽑아 꼭 for문 돌려야하는 부분만 같이 돌림.
}

export const lodManager = new LODSystem();
