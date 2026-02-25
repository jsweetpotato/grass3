import * as THREE from "three/webgpu";

import {
  attribute,
  bitAnd,
  color,
  float,
  Fn,
  mix,
  modelViewMatrix,
  modelWorldMatrix,
  normalize,
  positionLocal,
  positionWorld,
  rotate,
  shiftRight,
  sin,
  step,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";

import { genInstanceAttributes, genInstanceAttributes2 } from "@/utils/index";
import { lodManager } from "@/systems/lodSystem";
import { Assets } from "@/core/resources";
import { eventBus } from "@/core/EventBus";
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import type { TConfig } from "@/world/World";

// 청크별 메쉬들을 묶어둘 타입 정의
interface ChunkMeshes {
  level_1: THREE.InstancedMesh; // 가까울 때 (High Poly)
  level_2: THREE.InstancedMesh; // 중간 거리 (Low Poly)
}

interface sway_I {
  metaData: Uint32Array;
}

const swayLevel1 = Fn(
  ([rotation, scale, iPos, iWPos, uvY, timer, playerPos]: [
    rotation: THREE.Node,
    scale: THREE.Node,
    iPos: THREE.AttributeNode,
    iWPos: THREE.Node,
    uvY: THREE.Node,
    timer: THREE.Node,
    playerPos: THREE.Node,
  ]) => {
    const bigSway = sin(timer.add(iWPos.x.mul(0.1)).add(iWPos.z.mul(0.1)));
    const microSway = sin(timer.mul(3.0).add(iWPos.x.mul(2.0))).mul(0.01);
    const totalWind = bigSway.add(microSway).mul(uvY);
    const wind = vec3(totalWind, 0, 0);

    // 1. 플레이어에서 풀까지의 방향 벡터 구하기
    const forceVec = iWPos.sub(playerPos);
    const dist = forceVec.length(); // 거리
    const dir = forceVec.normalize(); // 방향

    // 2. 영향력 계산 (가까울수록 세게, 멀어지면 0)
    // 2유닛 안으로 들어오면 밀어내기 시작합니다.
    const influence = dist.smoothstep(0.0, 2.0).oneMinus();

    // 3. 옆으로 눕히는 힘 계산 (바닥 방향으로 살짝 누르기 위해 y값을 조절할 수도 있음)
    const pushOffset = dir.mul(influence).mul(1.5).mul(uv().y);

    // 최종 위치 = 원래위치 + 바람 + 플레이어가 미는 힘
    const finalPos = rotation.mul(scale).add(wind).add(pushOffset).add(iPos);

    return finalPos;
  }
);

const swayLevel2 = Fn(
  ([rotation, scale, iPos, iWPos, uvY, timer]: [
    rotation: THREE.Node,
    scale: THREE.Node,
    iPos: THREE.AttributeNode,
    iWPos: THREE.Node,
    uvY: THREE.Node,
    timer: THREE.Node,
  ]) => {
    const bigSway = sin(timer.add(iWPos.x.mul(0.1)).add(iWPos.z.mul(0.1)));
    const finalPos = rotation
      .mul(scale)
      .add(vec3(bigSway.mul(uvY), 0, 0))
      .add(iPos);

    return finalPos;
  }
);

const flatShade = Fn(() => {
  const upVec = vec3(0, 1, 0);
  const viewNormal = normalize(modelViewMatrix.mul(vec4(upVec, 0)).xyz);
  return viewNormal;
});

const playerPos = uniform(vec3());

eventBus.on("lateUpdate", (state) => {
  playerPos.value = state.playerPos;
});

class Base {
  private scene: THREE.Scene;
  private gui: GUI;
  private config!: TConfig;
  // 생성된 시각적 청크들을 ID를 키(Key)로 하여 저장할 Map
  private chunkVisuals: Map<string, ChunkMeshes> = new Map();

  matLOD1!: THREE.MeshLambertNodeMaterial;
  matLOD2!: THREE.MeshLambertNodeMaterial;

  baseMaterial!: THREE.MeshLambertNodeMaterial;

  protected options = {
    INSTANCES_PER_CHUNK: 8000,
    SCALE: { MIN: 0, MAX: 2 },
  };

  constructor(scene: THREE.Scene, gui: GUI, CONFIG: TConfig) {
    this.scene = scene;
    this.gui = gui;
    this.config = CONFIG;
    this.baseMaterial = new THREE.MeshLambertNodeMaterial();

    // this.setMaterial();
    // this.initMaterial();
    // this.init();
    // this.setupEvents();
  }

  createInstance(geoLOD: [THREE.BufferGeometry, THREE.BufferGeometry], matLOD: [THREE.NodeMaterial, THREE.NodeMaterial]) {
    const { chunkCell, chunkSize, offset } = lodManager;

    const halfX = (chunkCell.x * chunkSize) / 2;
    const halfZ = (chunkCell.z * chunkSize) / 2;

    const { INSTANCES_PER_CHUNK } = this.options;

    const { iPos, iData } = genInstanceAttributes(INSTANCES_PER_CHUNK, chunkSize);

    geoLOD[0].setAttribute("iPos", iPos);
    geoLOD[1].setAttribute("iPos", iPos);
    geoLOD[0].setAttribute("iData", iData);
    geoLOD[1].setAttribute("iData", iData);

    for (let x = 0; x < chunkCell.x; x++) {
      for (let z = 0; z < chunkCell.z; z++) {
        const chunkId = `chunk_${x}_${z}`;

        const meshLOD1 = new THREE.InstancedMesh(geoLOD[0], matLOD[0], INSTANCES_PER_CHUNK);
        const meshLOD2 = new THREE.InstancedMesh(geoLOD[1], matLOD[1], INSTANCES_PER_CHUNK);

        meshLOD1.receiveShadow = true;
        meshLOD1.frustumCulled = false;

        meshLOD2.receiveShadow = true;
        meshLOD2.frustumCulled = false;

        meshLOD1.visible = false;
        meshLOD2.visible = false;

        const posX = x * chunkSize - halfX + offset.x;
        const posZ = z * chunkSize - halfZ + offset.z;
        meshLOD1.position.set(posX, 0, posZ);
        meshLOD2.position.set(posX, 0, posZ);

        this.scene.add(meshLOD1, meshLOD2);

        this.chunkVisuals.set(chunkId, {
          level_1: meshLOD1,
          level_2: meshLOD2,
        });
      }
    }
  }

  protected init() {}

  protected setMaterial() {}

  initMaterial() {
    const { mask } = Assets.get();

    this.baseMaterial.transparent = false;
    this.baseMaterial.precision = "lowp";

    // ------- Normal Node -------
    this.baseMaterial.normalNode = flatShade();

    const iPos = attribute("iPos");
    const iData = attribute("iData");

    // instance World Position
    const iWPos = modelWorldMatrix.mul(vec4(iPos, 1.0)).xyz;

    const offset = uniform(vec2(0, 0.25));
    const mapSize = lodManager.chunkSize * (lodManager.chunkCell.x + 1.35);
    const maskTexture = texture(mask, vec2(iWPos.x.add(offset.x), iWPos.z.negate().add(offset.y)).div(mapSize).add(0.5)).r.toVar();

    // ------- Color Node -------
    const posY = positionLocal.y.toVar();
    const grassColor = mix(this.config.COLOR.GH, color("yellowgreen"), posY);
    this.baseMaterial.colorNode = mix(this.config.COLOR.GL, grassColor, maskTexture);

    const matLOD1 = this.baseMaterial.clone();
    const matLOD2 = this.baseMaterial.clone();

    this.gui.add(offset.value, "x", -40, 40, 0.01);
    this.gui.add(offset.value, "y", -40, 40, 0.01);

    // -------  Position Node -------
    // instance rotation
    const rotIndex = bitAnd(shiftRight(iData, 2), 255);
    const rotation = rotate(positionLocal, vec3(0, rotIndex, 0)).toVar();

    // instance scale
    const scaleIndex = bitAnd(shiftRight(iData, 10), 255);
    const scaleRatio = float(scaleIndex).div(255.0);
    const scale = maskTexture.greaterThan(0.4).mix(0, mix(this.options.SCALE.MIN, this.options.SCALE.MAX, maskTexture).mul(scaleRatio));
    // const scale = mix(this.options.SCALE.MIN, this.options.SCALE.MAX, scaleRatio);

    // timer
    const timer = time.mul(2);

    // UV y value
    const uvY = uv().y.toVar();

    // ----- LOD 1 -----
    matLOD1.positionNode = swayLevel1(rotation, scale, iPos, iWPos, uvY, timer, playerPos);

    // ----- LOD 2 -----
    matLOD2.positionNode = swayLevel2(rotation, scale, iPos, iWPos, uvY, timer);

    this.matLOD1 = matLOD1;
    this.matLOD2 = matLOD2;
  }

  setupEvents() {
    eventBus.on("lod_changed", (data: { chunkId: string; level: string }) => {
      const meshes = this.chunkVisuals.get(data.chunkId);

      if (!meshes) return;

      meshes.level_1.visible = false;
      meshes.level_2.visible = false;

      switch (data.level) {
        case "level_1":
          meshes.level_1.visible = true;
          break;
        case "level_2":
          meshes.level_2.visible = true;
          break;
        case "level_3":
          // 잔디의 경우 너무 멀면 아예 렌더링을 안 하는 것이 성능에 좋습니다.
          // meshes.level_3.visible = true;
          break;
      }
    });
  }
}

export class Grass extends Base {
  protected options: { INSTANCES_PER_CHUNK: number; SCALE: { MIN: number; MAX: number } } = {
    INSTANCES_PER_CHUNK: 8000,
    SCALE: { MIN: 3, MAX: 5 },
  };

  constructor(scene: THREE.Scene, gui: GUI, config: TConfig) {
    super(scene, gui, config);
    this.setMaterial();
    this.initMaterial();
    this.init();
    this.setupEvents();
  }

  protected init() {
    const assets = Assets.get();
    const { grass_lev_1, grass_lev_2 } = assets;

    const geoLOD1 = (grass_lev_1.scene.children[0] as THREE.Mesh).geometry;
    const geoLOD2 = (grass_lev_2.scene.children[0] as THREE.Mesh).geometry;

    this.createInstance([geoLOD1, geoLOD2], [this.matLOD1, this.matLOD2]);
  }

  protected setMaterial(): void {}
}

export class LongGrass extends Base {
  protected options: { INSTANCES_PER_CHUNK: number; SCALE: { MIN: number; MAX: number } } = {
    INSTANCES_PER_CHUNK: 1000,
    SCALE: { MIN: 1, MAX: 2 },
  };
  constructor(scene: THREE.Scene, gui: GUI, config: TConfig) {
    super(scene, gui, config);
    this.setMaterial();
    this.initMaterial();
    this.init();
    this.setupEvents();
  }

  init() {
    const geoLOD1 = new THREE.PlaneGeometry(1, 1, 3, 3);
    const geoLOD2 = new THREE.PlaneGeometry(1, 1);

    geoLOD1.translate(0, 0.5, 0);
    geoLOD2.translate(0, 0.5, 0);

    this.createInstance([geoLOD1, geoLOD2], [this.matLOD1, this.matLOD2]);
  }

  protected setMaterial(): void {
    const { long_grass } = Assets.get();
    const long = texture(long_grass, vec2(uv().x, uv().y.mul(0.6))).b.toVar();
    this.baseMaterial.opacityNode = step(0.5, long);
    this.baseMaterial.alphaTestNode = float(0.2);
  }
}
