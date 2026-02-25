import { instancedBufferAttribute } from "three/tsl";
import * as THREE from "three/webgpu";

export function getModelSize(model: THREE.Group<THREE.Object3DEventMap> | THREE.Mesh | THREE.Object3D<THREE.Object3DEventMap>) {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);
  size.multiplyScalar(0.5);
  return size;
}

export function getWorldTransform(mesh: THREE.Object3D) {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  mesh.getWorldPosition(position);
  mesh.getWorldQuaternion(quaternion);
  return { position, quaternion };
}

export class AnimationController {
  private mixer: THREE.AnimationMixer;
  private actions: Map<string, THREE.AnimationAction> = new Map();
  private currentAction: THREE.AnimationAction | null = null;

  constructor(model: THREE.Object3D, animations: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(model);

    animations.forEach((clip) => {
      const action = this.mixer.clipAction(clip);
      this.actions.set(clip.name, action);
    });
  }

  play(name: string, fadeDuration: number = 0.2) {
    const newAction = this.actions.get(name);

    if (!newAction || newAction === this.currentAction) return;

    newAction.reset();
    newAction.fadeIn(fadeDuration);
    newAction.play();

    if (this.currentAction) {
      this.currentAction.fadeOut(fadeDuration);
    }

    this.currentAction = newAction;
  }

  playOneShot(name: string, fadeDuration: number = 0.2) {
    const action = this.actions.get(name);
    if (!action) return;

    action.setLoop(THREE.LoopOnce, 1);

    action.clampWhenFinished = true;

    this.play(name, fadeDuration);
  }

  update(delta: number) {
    this.mixer.update(delta);
  }
}

export const mulberry32 = (seed: number): Function => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const rand = mulberry32(12345);

export function genInstanceAttributes(count: number, size: number = 10, seed = 12345) {
  const positions = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  const metadata = new THREE.InstancedBufferAttribute(new Uint32Array(count), 1);

  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const z = rand() * size;

    positions.setXYZ(i, x, 0, z);

    const type = Math.floor(rand() * 4);
    const rot = Math.floor(rand() * 256);
    const scale = Math.floor(rand() * 256);

    metadata.setX(i, type | (rot << 2) | (scale << 10));
  }

  // return { iPos: instancedBufferAttribute(positions), iData: instancedBufferAttribute(metadata) };
  return { iPos: positions, iData: metadata };
}

function generatePoissonDisk(width: number, height: number, minRadius: number, k: number = 30) {
  const cellSize = minRadius / Math.SQRT2;
  const gridWidth = Math.ceil(width / cellSize);
  const gridHeight = Math.ceil(height / cellSize);
  const grid = new Array(gridWidth * gridHeight).fill(null);

  const points: { x: number; z: number }[] = [];
  const activeList: { x: number; z: number }[] = [];

  const p0 = { x: rand() * width, z: rand() * height };

  const insertPoint = (p: { x: number; z: number }) => {
    points.push(p);
    activeList.push(p);
    const col = Math.floor(p.x / cellSize);
    const row = Math.floor(p.z / cellSize);
    grid[row * gridWidth + col] = p;
  };

  const isValid = (p: { x: number; z: number }) => {
    if (p.x < 0 || p.x >= width || p.z < 0 || p.z >= height) return false;
    const col = Math.floor(p.x / cellSize);
    const row = Math.floor(p.z / cellSize);

    for (let r = Math.max(0, row - 2); r <= Math.min(gridHeight - 1, row + 2); r++) {
      for (let c = Math.max(0, col - 2); c <= Math.min(gridWidth - 1, col + 2); c++) {
        const neighbor = grid[r * gridWidth + c];
        if (neighbor) {
          const dx = p.x - neighbor.x;
          const dz = p.z - neighbor.z;
          if (dx * dx + dz * dz < minRadius * minRadius) return false;
        }
      }
    }
    return true;
  };

  insertPoint(p0);

  while (activeList.length > 0) {
    const idx = Math.floor(rand() * activeList.length);
    const point = activeList[idx];
    let found = false;

    for (let i = 0; i < k; i++) {
      const angle = rand() * Math.PI * 2;
      const dist = minRadius + rand() * minRadius;
      const candidate = {
        x: point.x + Math.cos(angle) * dist,
        z: point.z + Math.sin(angle) * dist,
      };

      if (isValid(candidate)) {
        insertPoint(candidate);
        found = true;
        break;
      }
    }

    if (!found) activeList.splice(idx, 1);
  }

  return points;
}

export function genInstanceAttributes2(size: number = 100, minDistance: number = 3, minScale = 0.5, maxScale = 2.0) {
  const points = generatePoissonDisk(size, size, minDistance, rand());
  const count = points.length;

  const positions = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  const metadata = new THREE.InstancedBufferAttribute(new Uint32Array(count), 1);

  for (let i = 0; i < count; i++) {
    const p = points[i];

    positions.setXYZ(i, p.x, 0, p.z);

    const type = Math.floor(rand() * 4); // 0~3 (2비트)
    const rot = Math.floor(rand() * 256); // 0~7 (3비트)
    const scaleRatioInt = Math.floor(rand() * 8); // 0~255 (8비트)

    metadata.setX(i, type | (rot << 2) | (scaleRatioInt << 10));
  }

  return {
    iPos: positions,
    iData: metadata,
    minScale,
    maxScale,
    count,
  };
}
