import * as THREE from "three/webgpu";

import {
  attribute,
  bitAnd,
  color,
  cos,
  float,
  Fn,
  length,
  materialColor,
  mix,
  modelViewMatrix,
  modelWorldMatrix,
  mul,
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
  vec4
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

const swayLevel1 = Fn(([rotation, scale, iWPos, uvY, timer, playerPos]: [rotation: THREE.Node, scale: THREE.Node, iWPos: THREE.Node, uvY: THREE.Node, timer: THREE.Node, playerPos: THREE.Node]) => {
  const bigSway = sin(timer.add(iWPos.x.mul(0.1)).add(iWPos.z.mul(0.1)));
  const microSway = sin(timer.mul(3.0).add(iWPos.x.mul(2.0))).mul(0.01);
  const totalWind = bigSway.add(microSway).mul(uvY);
  const wind = vec3(totalWind, 0, 0);

  // 1. 플레이어에서 풀까지의 방향 벡터 구하기
  const forceVec = iWPos.sub(playerPos);
  const distSq = forceVec.dot(forceVec);

  // 2. 영향력 계산 (가까울수록 세게, 멀어지면 0)
  // 2유닛 안으로 들어오면 밀어내기 시작합니다.
  const influence = distSq.smoothstep(0.0, 2.5).oneMinus();

  // 3. 옆으로 눕히는 힘 계산 (바닥 방향으로 살짝 누르기 위해 y값을 조절할 수도 있음)
  const pushOffset = forceVec.mul(influence).mul(uv().y);

  // 최종 위치 = 원래위치 + 바람 + 플레이어가 미는 힘
  const finalPos = rotation.mul(scale).add(wind).add(pushOffset);

  return finalPos;
});

const swayLevel3 = Fn(
  ([rotation, scale, noiseTexture, uvY, amp, pow, freq]: [
    rotation: THREE.Node,
    scale: THREE.Node,
    noiseTexture: THREE.Node,
    uvY: THREE.Node,
    amp: THREE.Node,
    pow: THREE.Node,
    freq: THREE.Node,
    playerPos: THREE.Node
  ]) => {
    const sway1 = sin(positionLocal.x.add(noiseTexture.mul(amp)))
      .mul(freq)
      .mul(uvY.pow(pow));
    const swayvec = vec3(sway1.mul(-1), 0, 0);
    const finalPos = rotation.mul(scale).add(swayvec);

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
  protected scene: THREE.Scene;
  static gui: GUI;

  static uniforms = {
    grassScale: uniform(1.6),

    speedX: uniform(4.2),
    speedZ: uniform(2),
    freq: uniform(0.7),
    amp: uniform(3.5),
    pow: uniform(1.2),
    emissiveRemap: { x: uniform(0.3), y: uniform(1), z: uniform(0), w: uniform(1) },
    pushStrength: uniform(0.8)
  };
  protected config!: TConfig;
  // 생성된 시각적 청크들을 ID를 키(Key)로 하여 저장할 Map
  chunkVisuals: Map<string, ChunkMeshes> = new Map();

  matLOD1!: THREE.NodeMaterial;
  matLOD2!: THREE.NodeMaterial;

  baseMaterial!: THREE.MeshLambertNodeMaterial;

  protected options = {
    INSTANCES_PER_CHUNK: 40,
    SCALE: { MIN: 1, MAX: 1.5 }
  };

  constructor(
    scene: THREE.Scene,
    private gui: GUI,
    CONFIG: TConfig
  ) {
    this.scene = scene;
    this.config = CONFIG;
    this.baseMaterial = new THREE.MeshLambertNodeMaterial();

    if (!Base.gui) {
      Base.gui = this.gui;

      const grassGUI = Base.gui.addFolder("grass");

      const uniforms = Base.uniforms;

      grassGUI.add(uniforms.grassScale, "value", 0, 10, 0.01).name("grass scale");

      grassGUI.add(uniforms.speedX, "value", 0, 20, 0.1).name("speedX");
      grassGUI.add(uniforms.speedZ, "value", 0, 20, 0.1).name("speedZ");
      grassGUI.add(uniforms.freq, "value", 0, 20, 0.1).name("freq");
      grassGUI.add(uniforms.amp, "value", 0, 20, 0.1).name("amp");
      grassGUI.add(uniforms.pow, "value", 0, 20, 0.1).name("pow");
      grassGUI.add(uniforms.emissiveRemap.x, "value", -4, 4, 0.01).name("emissive x");
      grassGUI.add(uniforms.emissiveRemap.y, "value", -4, 4, 0.01).name("emissive y");
      grassGUI.add(uniforms.emissiveRemap.z, "value", -4, 4, 0.01).name("emissive z");
      grassGUI.add(uniforms.emissiveRemap.w, "value", -4, 4, 0.01).name("emissive w");
      grassGUI.add(uniforms.pushStrength, "value", 0, 2, 0.01).name("epushStrength");
    }
  }

  createInstance(geoLOD: [THREE.BufferGeometry, THREE.BufferGeometry], matLOD: [THREE.NodeMaterial, THREE.NodeMaterial], genType: 1 | 2) {
    const { chunkCell, chunkSize, offset } = lodManager;

    const halfX = (chunkCell.x * chunkSize) / 2;
    const halfZ = (chunkCell.z * chunkSize) / 2;

    const { INSTANCES_PER_CHUNK } = this.options;

    const { iPos, iData } = genType < 2 ? genInstanceAttributes(INSTANCES_PER_CHUNK, chunkSize) : genInstanceAttributes2(INSTANCES_PER_CHUNK, chunkSize);

    const chunkRadius = (chunkSize / 2) * Math.SQRT2 + 5.0;

    // 💡 2. 로컬 기준(0,0,0)으로 거대한 바운딩 스피어(경계 구) 생성

    geoLOD[0].setAttribute("iPos", iPos);
    geoLOD[1].setAttribute("iPos", iPos);
    geoLOD[0].setAttribute("iData", iData);
    geoLOD[1].setAttribute("iData", iData);

    // const customBoundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), chunkRadius);

    for (let x = 0; x < chunkCell.x; x++) {
      for (let z = 0; z < chunkCell.z; z++) {
        const chunkId = `chunk_${x}_${z}`;

        const meshLOD1 = new THREE.InstancedMesh(geoLOD[0], matLOD[0], INSTANCES_PER_CHUNK);
        const meshLOD2 = new THREE.InstancedMesh(geoLOD[1], matLOD[1], INSTANCES_PER_CHUNK);

        meshLOD1.castShadow = false;
        meshLOD1.receiveShadow = true;

        meshLOD2.castShadow = false;
        meshLOD2.receiveShadow = true;

        // meshLOD1.boundingSphere = customBoundingSphere;
        // meshLOD2.boundingSphere = customBoundingSphere;

        const posX = x * chunkSize - halfX + offset.x;
        const posZ = z * chunkSize - halfZ + offset.z;

        meshLOD1.position.set(posX, 0, posZ);
        meshLOD2.position.set(posX, 0, posZ);

        meshLOD1.visible = true;
        meshLOD2.visible = true;

        meshLOD1.frustumCulled = false;
        meshLOD2.frustumCulled = false;

        this.scene.add(meshLOD1, meshLOD2);

        this.chunkVisuals.set(chunkId, {
          level_1: meshLOD1,
          level_2: meshLOD2
        });
      }
    }
  }

  protected init() {}

  protected setMaterial() {}

  initMaterial(col1: THREE.ConstNode<THREE.Color> | THREE.UniformNode<THREE.Color>, col2: THREE.ConstNode<THREE.Color> | THREE.UniformNode<THREE.Color>) {
    const { mask, depth, perlin_noise } = Assets.get();

    this.baseMaterial.transparent = false;
    this.baseMaterial.precision = "lowp";

    // timer
    const timer = time.mul(2);

    // UV y value
    const uvY = uv().y.toVar();

    // ------- Normal Node -------
    this.baseMaterial.normalNode = flatShade();

    const iPos = attribute("iPos");
    const iData = attribute("iData");

    // instance World Position
    const iWPos = modelWorldMatrix.mul(vec4(iPos, 1.0)).xyz;

    const offset = uniform(vec2(0, 0.25));

    const mapSize = lodManager.chunkSize * (lodManager.chunkCell.x + 1.35);
    const scaledUV = vec2(iWPos.x.add(offset.x), iWPos.z.negate().add(offset.y)).div(mapSize).add(0.5).toVar();
    const maskTexture = texture(mask, scaledUV).r.toVar();
    const depthTexture = texture(depth, scaledUV).b.toVar();

    perlin_noise.wrapS = THREE.RepeatWrapping;
    perlin_noise.wrapT = THREE.RepeatWrapping;

    const uniforms = Base.uniforms;

    const length1 = sin(
      iWPos.xz
        .div(20)
        .dot(iWPos.xz.add(vec2(-130, -60)).div(20))
        .sub(time.mul(uniforms.speedX))
    ).remapClamp(-1, 1, 0.7, 1);
    const noise1 = texture(perlin_noise, iWPos.xz.add(timer).div(10)).g;
    const noiseTexture = noise1.mul(length1).toVar();

    // ------- Color Node -------
    const top = uv().y.remapClamp(0.5, 1, 0, 1).toVar();
    const grassColor = mix(col1, col2, top);
    const finalColor = mix(this.config.COLOR.GL, grassColor, maskTexture);
    this.baseMaterial.colorNode = finalColor;

    // -------- Emissive Node -------
    const emissive = maskTexture
      .remapClamp(0.8, 1, 0, 1)
      .mul(noiseTexture.remapClamp(uniforms.emissiveRemap.x, uniforms.emissiveRemap.y, uniforms.emissiveRemap.z, uniforms.emissiveRemap.w))
      .mul(color("yellowgreen"))
      .mul(uvY)
      .toVar();

    const matLOD1 = this.baseMaterial.clone();
    const matLOD2 = this.baseMaterial.clone();

    //@ts-ignore
    matLOD1.emissiveNode = matLOD2.emissiveNode = emissive;

    // -------  Position Node -------

    const isVisible = maskTexture.greaterThan(0.4).toInt().toVar();

    // instance rotation
    const rotIndex = bitAnd(shiftRight(iData, 2), 255);
    const rotation = rotate(positionLocal, vec3(0, rotIndex, 0)).toVar();

    // instance scale
    const scaleIndex = bitAnd(shiftRight(iData, 10), 255);
    const scaleRatio = float(scaleIndex).div(31.0);
    const scale = scaleRatio.mul(this.options.SCALE.MIN).mul(uniforms.grassScale).mul(maskTexture).mul(isVisible);

    // instance position
    const pos = vec3(iPos.x, depthTexture.mul(-3.5), iPos.z);

    // grass sway animation
    const noiseSwayX = sin(positionLocal.x.add(noiseTexture.mul(uniforms.amp)))
      .mul(uniforms.freq)
      .mul(uvY.pow(uniforms.pow));
    const noiseSwayZ = sin(positionLocal.z.add(noiseTexture.mul(uniforms.freq)))
      .mul(uniforms.amp)
      .mul(uvY);
    const sway = vec3(noiseSwayX.mul(-1), 0, noiseSwayZ.mul(0.5)).mul(isVisible);

    // player push grass
    const flatForceVec = vec2(iWPos.x.sub(playerPos.x), iWPos.z.sub(playerPos.z));
    const dist = flatForceVec.dot(flatForceVec);
    const influence = dist.smoothstep(0.0, 2.5).oneMinus();
    const safeDir = flatForceVec.add(vec3(0.001, 0.0, 0.001)).normalize();
    const pushOffset = safeDir.mul(influence).mul(uniforms.pushStrength).mul(uvY);

    matLOD1.positionNode = rotation.mul(scale).add(sway).add(pushOffset).add(pos);
    matLOD2.positionNode = rotation.mul(scale).add(sway).add(pos);

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
    INSTANCES_PER_CHUNK: 10000,
    SCALE: { MIN: 3, MAX: 3.5 }
  };

  constructor(scene: THREE.Scene, gui: GUI, config: TConfig) {
    super(scene, gui, config);
    this.setMaterial();
    this.initMaterial(this.config.COLOR.GH, color("yellowgreen"));
    this.init();
    this.setupEvents();
  }

  protected init() {
    const assets = Assets.get();
    const { grass_lev_1, grass_lev_2 } = assets;

    const geoLOD1 = (grass_lev_1.scene.children[0] as THREE.Mesh).geometry;
    const geoLOD2 = (grass_lev_2.scene.children[0] as THREE.Mesh).geometry;

    this.createInstance([geoLOD1, geoLOD2], [this.matLOD1, this.matLOD2], 1);
  }

  protected setMaterial(): void {}
}

export class LongGrass extends Base {
  protected options: { INSTANCES_PER_CHUNK: number; SCALE: { MIN: number; MAX: number } } = {
    INSTANCES_PER_CHUNK: 1000,
    SCALE: { MIN: 1, MAX: 2 }
  };

  constructor(scene: THREE.Scene, gui: GUI, config: TConfig) {
    super(scene, gui, config);
    this.setMaterial();
    this.initMaterial(this.config.COLOR.GH, color("pink"));
    this.init();
    this.setupEvents();
  }

  init() {
    const geoLOD1 = new THREE.PlaneGeometry(1, 1, 5, 1);
    const geoLOD2 = new THREE.PlaneGeometry(1, 1);

    geoLOD1.translate(0, 0.5, 0);
    geoLOD2.translate(0, 0.5, 0);

    this.createInstance([geoLOD1, geoLOD2], [this.matLOD1, this.matLOD2], 2);
  }

  protected setMaterial(): void {
    const { long_grass } = Assets.get();
    const long = texture(long_grass, vec2(uv().x, uv().y.mul(0.6))).b.toVar();

    this.baseMaterial.opacityNode = step(0.5, long);
    this.baseMaterial.alphaTestNode = float(0.2);
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

        default:
          break;
      }
    });
  }
}

export class LongGrass2 extends Base {
  protected options: { INSTANCES_PER_CHUNK: number; SCALE: { MIN: number; MAX: number } } = {
    INSTANCES_PER_CHUNK: 1000,
    SCALE: { MIN: 1, MAX: 2 }
  };
  constructor(scene: THREE.Scene, gui: GUI, config: TConfig) {
    super(scene, gui, config);
    this.setMaterial();
    this.initMaterial(this.config.COLOR.GH, color("pink"));
    this.init();
    this.setupEvents();
  }

  init() {
    const geoLOD1 = new THREE.PlaneGeometry(1, 1, 5, 1);
    const geoLOD2 = new THREE.PlaneGeometry(1, 1);

    geoLOD1.translate(0, 0.5, 0);
    geoLOD2.translate(0, 0.5, 0);

    this.createInstance([geoLOD1, geoLOD2], [this.matLOD1, this.matLOD2], 2);
  }

  protected setMaterial(): void {
    const { long_grass } = Assets.get();
    const long = texture(long_grass, vec2(uv().x, uv().y.mul(0.6))).g.toVar();
    this.baseMaterial.opacityNode = step(0.5, long);
    this.baseMaterial.alphaTestNode = float(0.2);
    this.baseMaterial.wireframe = true;
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
        default:
          break;
      }
    });
  }
}
