import { Fn, mat2, cos, sin } from "three/tsl";
import * as THREE from "three/webgpu";
import { mulberry32 } from "./math";

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

export const rand = mulberry32(123456);

export function genInstanceAttributes(count: number, size: number = 10) {
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

export function genInstanceAttributes2(count: number, size: number = 10) {
  const positions = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  const metadata = new THREE.InstancedBufferAttribute(new Uint32Array(count), 1);

  // 💡 1. 군집(Cluster) 중심점 미리 만들기
  // 예: 전체 개수를 30으로 나누어 한 무리에 대략 30~50개씩 모이게 설정
  const numClusters = Math.max(1, Math.floor(count / 200));
  const clusters = [];

  for (let i = 0; i < numClusters; i++) {
    clusters.push({
      x: rand() * size, // 기존처럼 범위 내의 임의의 위치를 중심점으로 잡음
      z: rand() * size,
    });
  }

  // 💡 군집이 퍼져나갈 최대 반경 (전체 사이즈에 비례하도록 설정)
  const clusterRadius = size / 4;

  for (let i = 0; i < count; i++) {
    // 💡 2. 현재 풀포기가 소속될 무리(중심점)를 무작위로 하나 뽑기
    const myCluster = clusters[Math.floor(rand() * numClusters)];

    // 💡 3. 중심점을 기준으로 퍼트리기
    const angle = rand() * Math.PI * 2; // 0 ~ 360도 무작위 방향

    // 🔥 마법의 코드: rand()를 두 번 곱하면 0에 가까운 값이 압도적으로 많이 나옵니다!
    // 즉, 중심엔 엄청 빽빽하고 가장자리로 갈수록 듬성듬성해지는 '자연스러운 흩뿌림'이 완성됩니다.
    const distance = rand() * rand() * clusterRadius;

    // 최종 위치 계산
    const x = myCluster.x + Math.cos(angle) * distance;
    const z = myCluster.z + Math.sin(angle) * distance;

    positions.setXYZ(i, x, 0, z);

    // 기존의 완벽한 비트 패킹 로직은 그대로 유지!
    const type = Math.floor(rand() * 4);
    const rot = Math.floor(rand() * 256);
    const scale = Math.floor(rand() * 256);

    metadata.setX(i, type | (rot << 2) | (scale << 10));
  }

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

// export function genInstanceAttributes2(offsetX: number, offsetZ: number, size: number = 100, minDistance: number = 4, seed = 12345) {
//   const rand = mulberry32(seed);
//   const points = generatePoissonDisk(size, size, minDistance);
//   const count = points.length;

//   // 순수 1차원 숫자 배열 할당 (메모리 초경량)
//   const positions = new Float32Array(count * 3);
//   const metadata = new Uint32Array(count);

//   for (let i = 0; i < count; i++) {
//     const p = points[i];

//     // 🚀 글로벌 메쉬를 위해 청크의 위치(offset)를 더해 절대 '월드 좌표'로 만듭니다.
//     positions[i * 3 + 0] = p.x + offsetX;
//     positions[i * 3 + 1] = 0;
//     positions[i * 3 + 2] = p.z + offsetZ;

//     const type = Math.floor(rand() * 4);
//     const rot = Math.floor(rand() * 256);
//     const scaleRatioInt = Math.floor(rand() * 256);

//     metadata[i] = type | (rot << 2) | (scaleRatioInt << 10);
//   }

//   return { positions, metadata, count };
// }

export function createDataTextureArray(images: HTMLImageElement[]) {
  const width = images[0].width;
  const height = images[0].height;
  const depth = images.length;

  // RGBA = 4
  // 현대 그래픽스 API(WebGPU, Metal 등)는 RGB(3채널) 포맷을 별로 좋아하지 않는다.
  // 컴퓨터는 4의 배수(32비트)로 데이터를 처리할 때 가장 빠름
  // RGB(24비트)를 쓰면 데이터 처리가 어긋나서 성능이 떨어지거나, 아예 지원하지 않는 경우도 많음
  // WebGPU와 WebGL 최적화 때매 투명도가 없는 JPG 이미지라도 메모리에는 RGBA로 변환해서 올리는 게 국룰
  const size = width * height * 4;
  const data = new Uint8Array(size * depth);

  // 3. 캔버스를 이용해 픽셀 데이터 추출
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) throw new Error("Canvas context creation failed");

  images.forEach((img, index) => {
    // 크기 검증
    if (img.width !== width || img.height !== height) {
      console.warn(`Image at index ${index} has different dimensions! Resizing to match first image.`);
    }

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // 픽셀 데이터 가져오기 (RGBA)
    const imgData = ctx.getImageData(0, 0, width, height);

    // 전체 버퍼의 알맞은 위치에 복사
    data.set(imgData.data, index * size);
  });

  // 4. DataArrayTexture 생성
  const texture = new THREE.DataArrayTexture(data, width, height, depth);
  texture.format = THREE.RGBAFormat;
  texture.type = THREE.UnsignedByteType;
  texture.minFilter = THREE.LinearMipMapLinearFilter; // 밉맵 사용 시
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true; // 밉맵 생성
  texture.needsUpdate = true;

  return texture;
}

export const rotate2d = Fn(([angle]: [angle: number]) => {
  // @ts-ignore
  return mat2(cos(angle), sin(angle).mul(-1), sin(angle), cos(angle));
});
