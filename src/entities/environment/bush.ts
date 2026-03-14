import { eventBus } from "@/core/EventBus";
import { Assets } from "@/core/resources";
import { createDataTextureArray, rand, rotate2d } from "@/utils";
import { mulberry32 } from "@/utils/math";
import { type TConfig } from "@/world/World";
import { MeshSurfaceSampler } from "three/examples/jsm/Addons.js";
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  attribute,
  cameraProjectionMatrix,
  color,
  computeSkinning,
  float,
  instancedBufferAttribute,
  modelViewMatrix,
  normalLocal,
  texture,
  uv,
  vec2,
  vec3,
  vec4,
  normalize,
  positionLocal,
  bitAnd,
  shiftRight,
  mx_rotate2d,
  Fn,
  cos,
  sin,
  mat2,
  time,
  distance,
  step,
  modelWorldMatrix,
  int,
  uniform,
  normalFlat,
  mix,
  cameraViewMatrix,
  length,
  Loop,
  clamp,
  pow,
  instance,
  materialColor,
  materialAO,
  output,
  luminance,
  max,
  mat4,
  positionWorld,
  shadowPositionWorld,
} from "three/tsl";
import * as THREE from "three/webgpu";

export class Bush {
  private static sharedArrayTexture: THREE.DataArrayTexture | null = null;

  geometry!: THREE.BufferGeometry;
  material = new THREE.MeshLambertNodeMaterial({
    transparent: false,
  });
  mesh!: THREE.InstancedMesh;

  PLANE_COUNT = 100;
  INSTANCE_COUNT = 10;

  random = mulberry32(12345);

  constructor(
    private scene: THREE.Scene,
    private CONFIG: TConfig
  ) {
    this.init();
  }

  private init() {
    if (!Bush.sharedArrayTexture) {
      const { bush_alpha_1, bush_alpha_2, bush_alpha_3, bush_alpha_4 } = Assets.get();
      const images = [bush_alpha_1.image] as HTMLImageElement[];
      Bush.sharedArrayTexture = createDataTextureArray(images);
    }

    this.makeBushModel();

    const mesh = new THREE.InstancedMesh(this.geometry, this.material, this.INSTANCE_COUNT);

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    const uvIndx = new Uint32Array(this.INSTANCE_COUNT);

    for (let i = 0; i < this.INSTANCE_COUNT; i++) {
      position.set((this.random() - 0.5) * 30, 0.5, (this.random() - 0.5) * 30);

      // rotation.setFromAxisAngle(up, this.random() * Math.PI * 2);

      scale.setScalar(0.8 + this.random() * 0.4);

      matrix.compose(position, rotation, scale);

      mesh.setMatrixAt(i, matrix);

      uvIndx[i] = Math.floor(this.random() * 4);
    }

    const iUvIdx = instancedBufferAttribute(new THREE.InstancedBufferAttribute(uvIndx, 1));
    const alpha = texture(Bush.sharedArrayTexture, uv()).depth(iUvIdx).toVar();
    this.material.opacityNode = alpha;
    this.material.colorNode = this.CONFIG.COLOR.GH;
    this.material.alphaTestNode = float(0.5);

    this.mesh = mesh;
    this.scene.add(this.mesh);
  }

  makeBushModel() {
    const planes = [];

    for (let i = 0; i < this.PLANE_COUNT; i++) {
      const plane = new THREE.PlaneGeometry(1.5, 1.5);
      const spherical = new THREE.Spherical(0.5 - Math.pow(this.random(), 3), Math.PI * 2 * this.random(), Math.PI * this.random());
      const position = new THREE.Vector3().setFromSpherical(spherical);
      plane.rotateX(Math.PI * this.random());
      plane.rotateY(Math.PI * this.random());
      plane.rotateZ(Math.PI * this.random());

      plane.translate(position.x, position.z, position.y);

      planes[i] = plane;

      const normal = position.clone().normalize();
      const normalArray = new Float32Array(12);
      for (let i = 0; i < 4; i++) {
        const i3 = i * 3;
        const position = new THREE.Vector3(
          plane.attributes.position.array[13],
          plane.attributes.position.array[13 + 1],
          plane.attributes.position.array[13 + 2]
        );

        const mixedNormal = position.lerp(normal, 0.4);
        normalArray[i3] = mixedNormal.x;
        normalArray[i3 + 1] = mixedNormal.y;
        normalArray[i3 + 2] = mixedNormal.z;
      }
      plane.setAttribute("normal", new THREE.BufferAttribute(normalArray, 3));
    }

    this.geometry = mergeGeometries(planes);
  }
}

export class Bush2 {
  private scene: THREE.Scene;
  private gui: GUI;
  private material!: THREE.MeshLambertNodeMaterial;

  matLOD1!: THREE.MeshLambertNodeMaterial;
  matLOD2!: THREE.MeshLambertNodeMaterial;

  static maskTextures: THREE.DataArrayTexture;

  private chunkVisuals: Map<string, THREE.Mesh> = new Map();

  constructor(scene: THREE.Scene, gui: GUI) {
    this.scene = scene;
    this.gui = gui;
    this.init();
    this.initMaterial();
    this.createInstance();
  }

  initMaterial() {
    const material = new THREE.MeshLambertNodeMaterial({ transparent: false });
    material.precision = "lowp";
    const uvOffsetBase = uv().remap(0, 1, -1, 1);
    const uvOffset = vec2(uvOffsetBase.x.negate(), uvOffsetBase.y);

    const centerLocal = attribute("_center", "vec3");
    const metadata = attribute("iData", "uint");

    const typeIdx = bitAnd(shiftRight(metadata, 0), 3);
    const rotIdx = bitAnd(shiftRight(metadata, 2), 255);
    const angle = float(rotIdx);

    const centeredUv = uv().sub(0.5).mul(1.5);
    const disMaskSq = centeredUv.dot(centeredUv);

    const centerView = modelViewMatrix.mul(vec4(centerLocal, 1.0)).toVar();
    const timer = time.mul(2);

    const friquency = uniform(188);
    const amp = uniform(1.52);
    const size = uniform(0.8);

    this.gui.add(friquency, "value", 0, 1000, 0.01).name("friquency");
    this.gui.add(amp, "value", 0, 10, 0.01).name("amp");
    this.gui.add(size, "value", 0, 10, 0.01).name("size");
    const wind = sin(timer.add(positionLocal.x.mul(0.1)).add(positionLocal.z.mul(friquency)).mul(amp)).mul(0.2);

    const finalViewPos = centerView
      .add(vec4(uvOffset.mul(size), 0.0, 0.0))
      .add(vec4(wind, 0, 0, 0))
      .toVar();

    material.vertexNode = cameraProjectionMatrix.mul(finalViewPos);

    // Color Node
    material.colorNode = color("yellowgreen");

    // Opacity Node
    const vUv = uv().sub(0.5).mul(rotate2d(angle)).add(0.5);
    const maskT = texture(Bush2.maskTextures, vUv).depth(typeIdx).r.toVar();
    const mask = maskT.mul(step(disMaskSq, 0.5));
    material.opacityNode = mask.step(0.5);

    // Alpha Texst Node
    material.alphaTestNode = float(0.5);

    // Normal Node
    const bushCenterLocal = vec3(0.1, 1, 0.1);
    const bushCenterView = modelViewMatrix.mul(vec4(bushCenterLocal, 1.0)).xyz;
    const perfectViewNormal = normalize(centerView.add(vec4(uvOffset.mul(1.2), 0.0, 0.0)).xyz.sub(bushCenterView));
    material.normalNode = perfectViewNormal;

    this.material = material;

    this.matLOD1 = this.material;

    // --------- LOD2 -----------

    this.matLOD2 = new THREE.MeshLambertNodeMaterial({ transparent: false });

    // Normal Node
    const sphereCenterLocal = vec3(0.0, 0, 0.0);
    const localNormal = normalize(positionLocal.sub(sphereCenterLocal));
    const viewNormal = normalize(modelViewMatrix.mul(vec4(localNormal, 0.0)).xyz);
    this.matLOD2.normalNode = viewNormal;

    // Color Node
    this.matLOD2.colorNode = color("yellowgreen");

    // Opacity Node
    const lod2mask = texture(Bush2.maskTextures).depth(int(0)).r.toVar();
    this.matLOD2.opacityNode = lod2mask.step(0.5);
    this.matLOD2.alphaTestNode = float(0.5);
  }

  init() {
    if (!Bush2.maskTextures) {
      const { bush_alpha_1, bush_alpha_2, bush_alpha_3, bush_alpha_4 } = Assets.get();
      const images = [bush_alpha_2.image, bush_alpha_3.image, bush_alpha_4.image] as HTMLImageElement[];
      Bush2.maskTextures = createDataTextureArray(images);
    }
  }

  createInstance() {
    const { bush_test, bush_test2, foreign } = Assets.get();
    const geoLOD1 = (bush_test.scene.children[0] as THREE.Mesh).geometry.clone();

    const geoLOD2 = new THREE.PlaneGeometry(4, 4);

    const countLOD1 = geoLOD1.attributes.position.count;

    const metaarr = new Uint32Array(countLOD1);

    for (let i = 0; i < countLOD1; i++) {
      const type = Math.floor(rand() * 3); // 2byte
      const rot = Math.floor(rand() * 256); //
      metaarr[i] = type | (rot << 2);
    }

    const metadata1 = new THREE.BufferAttribute(metaarr, 1);

    geoLOD1.setAttribute("iData", metadata1);

    const foreignMesh = foreign.scene;
    foreignMesh.children[0].material = this.material;
    foreignMesh.children[1].material = this.material;
    foreignMesh.children[2].material = this.material;
    foreignMesh.children[0].castShadow = true;
    foreignMesh.children[1].castShadow = true;
    foreignMesh.children[2].castShadow = true;

    (foreignMesh.children[0] as THREE.Mesh).customDepthMaterial = this.matLOD1;

    this.scene.add(foreignMesh);

    // 0~3 (2비트)

    const lod = new THREE.LOD();
    lod.autoUpdate = false;

    const meshLOD1 = new THREE.Mesh(geoLOD1, this.material);
    meshLOD1.castShadow = true;
    const meshLOD2 = new THREE.Mesh(geoLOD2, this.matLOD2);
    meshLOD2.castShadow = false;

    meshLOD1.position.set(0, 3, 0);
    meshLOD2.position.set(0, 3, 0);

    meshLOD1.scale.setScalar(0.5);

    // this.material.shadowSide = THREE.DoubleSide;
    // meshLOD1.receiveShadow = true;

    // meshLOD2.castShadow = true;

    lod.addLevel(meshLOD1, 0);
    lod.addLevel(meshLOD2, 10);

    this.scene.add(lod);
  }
}

const uniforms = {
  x: uniform(0.66),
  y: uniform(0.64),
  z: uniform(0.76),
};

const flatShade = Fn(() => {
  const upVec = vec3(uniforms.x, uniforms.y, uniforms.z);
  const viewNormal = normalize(modelViewMatrix.mul(vec4(upVec, 0)).xyz);
  const fianlNormal = mix(normalLocal, viewNormal, 0.5).step(0.3);
  return fianlNormal;
});

// export class Bush3 {
//   constructor(
//     private scene: THREE.Scene,
//     private gui: GUI,
//     private config: TConfig
//   ) {
//     const { bush_test3, bush_alpha_2, bush_alpha_3, bush_alpha_4 } = Assets.get();

//     const masks = createDataTextureArray([
//       bush_alpha_2.image as HTMLImageElement,
//       bush_alpha_3.image as HTMLImageElement,
//       bush_alpha_4.image as HTMLImageElement,
//     ]);
//     const geo = (bush_test3.scene.children[0] as THREE.Mesh).geometry;
//     const planegeo = new THREE.PlaneGeometry(2, 2);

//     const bushGUI = gui.addFolder("bush");
//     bushGUI.add(uniforms.x, "value", 0, 1, 0.01);
//     bushGUI.add(uniforms.y, "value", 0, 1, 0.01);
//     bushGUI.add(uniforms.z, "value", 0, 1, 0.01);

//     const ballMat = new THREE.MeshLambertNodeMaterial({ transparent: false });

//     ballMat.normalNode = flatShade();

//     ballMat.colorNode = this.config.COLOR.GH;
//     const leafMat = new THREE.MeshLambertNodeMaterial({ transparent: false, side: THREE.DoubleSide });

//     const mesh = new THREE.Mesh(geo, ballMat);
//     const sampler = new MeshSurfaceSampler(mesh).build();

//     const planes = [];

//     const count = 90;

//     const positionL = new THREE.Vector3();
//     const normal = new THREE.Vector3();

//       const vertexCount = planegeo.attributes.position.count;
// const instanceCount= 10;

//       const normalArray = new Float32Array(vertexCount* 3 * 90 );
//       const centerArray = new Float32Array(vertexCount* 3 * 90 );
//       const scaleArray = new Float32Array(vertexCount * 90);
//       const maskArray = new Float32Array(vertexCount * 90);

//     for (let i = 0; i < count; i++) {
//       const geo = planegeo.clone();
//       sampler.sample(positionL, normal);

//       const s = Math.random() * 0.3 + 0.7;
//       // geo.scale(s, s, s);
//       // geo.translate(positionL.x, positionL.y, positionL.z);

//       const vertexCount = geo.attributes.position.count;

//       const idx = Math.floor(Math.random() * 4);

//       for (let j = 0; j < vertexCount; j++) {
//         normalArray[j * 3 + 0] = normal.x;
//         normalArray[j * 3 + 1] = normal.y;
//         normalArray[j * 3 + 2] = normal.z;

//         centerArray[j * 3 + 0] = positionL.x;
//         centerArray[j * 3 + 1] = positionL.y;
//         centerArray[j * 3 + 2] = positionL.z;

//         scaleArray[j] = s;
//         maskArray[j] = idx;
//       }

//       planes.push(geo);
//     }

//     const bushgeo = mergeGeometries(planes);

//     const bush = new THREE.InstancedMesh(bushgeo, leafMat, 10);

//     const dummy = new THREE.Object3D();

//     for (let i = 0; i < 10; i++) {
//       const x = (Math.random() - 0.5) * 30;
//       const y = (Math.random() - 0.5) * 2;
//       const z = (Math.random() - 0.5) * 30;

//       dummy.position.set(x, y, z);

//       dummy.scale.setScalar(Math.random() * 0.5 + 0.5);

//       // dummy.rotateY(Math.random() * 400);

//       dummy.updateMatrix();

//       bush.setMatrixAt(i, dummy.matrix);
//       bush.instanceMatrix.needsUpdate = true;
//     }

//     const aCenter = attribute("aCenter");
//     const aSurfaceNormal = attribute("aSurfaceNormal");
//     const aScale = attribute("aScale");
//     const aMask = attribute("aMask");

//     const alpha = texture(masks, uv()).depth(aMask).step(0.5).toVar();
//     leafMat.opacityNode = alpha;
//     leafMat.alphaTestNode = float(0.5);

//     // ------------ normal node -------------------
//     const upVec = vec3(uniforms.x, uniforms.y, uniforms.z);
//     const viewNormal = normalize(modelViewMatrix.mul(vec4(upVec, 0)).xyz);
//     const fianlNormal = mix(aSurfaceNormal, viewNormal, 0.5);
//     leafMat.normalNode = fianlNormal;

//     // ------------- position node ----------------
//     // 💡 1. 잎사귀의 진짜 중심점을 월드 좌표에 단단히 고정합니다.
//     // (덤불 인스턴스 전체의 위치/회전이 100% 반영됩니다)
//     const leafCenterWorld = modelWorldMatrix.mul(vec4(aCenter, 1.0)).xyz;

//     // 💡 2. 카메라의 가로(Right)/세로(Up) 벡터 추출 (절대적인 빌보드 방향)
//     const cameraRight = vec3(cameraViewMatrix[0].x, cameraViewMatrix[1].x, cameraViewMatrix[2].x);
//     const cameraUp = vec3(cameraViewMatrix[0].y, cameraViewMatrix[1].y, cameraViewMatrix[2].y);

//     // 💡 3. 스케일 결합 (개별 잎사귀 크기 * 덤불 전체 크기)
//     const bushScaleX = length(modelWorldMatrix[0].xyz);
//     const bushScaleY = length(modelWorldMatrix[1].xyz);
//     const finalScaleX = aScale.mul(bushScaleX);
//     const finalScaleY = aScale.mul(bushScaleY);

//     // 💡 4. 고정된 중심점(leafCenterWorld)에서, 카메라 방향으로 잎사귀 면(positionLocal)을 쫙 펼쳐줍니다!
//     // positionLocal이 오염되지 않은 순수한 면적 값이므로 완벽하게 개별 동작합니다.
//     const vertexWorldPos = leafCenterWorld.add(cameraRight.mul(positionLocal.x).mul(finalScaleX)).add(cameraUp.mul(positionLocal.y).mul(finalScaleY));

//     // 💡 5. 최종 화면 투영
//     leafMat.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix).mul(vec4(vertexWorldPos, 1.0));

//     // ---------- color node ------------
//     const brightness = luminance(output);
//     const mixFactor = brightness.clamp(0.0, 1.0);

//     //@ts-ignore
//     leafMat.emissiveNode = output;

//     const customColor = mix(this.config.COLOR.GH, color("yellowgreen"), output);

//     leafMat.colorNode = customColor;

//     this.scene.add(bush);
//   }
// }
export class Bush3 {
  constructor(
    private scene: THREE.Scene,
    private gui: GUI,
    private config: TConfig
  ) {
    const { bush_test3, bush_alpha_2, bush_alpha_3, bush_alpha_4 } = Assets.get();

    const masks = createDataTextureArray([
      bush_alpha_2.image as HTMLImageElement,
      bush_alpha_3.image as HTMLImageElement,
      bush_alpha_4.image as HTMLImageElement,
    ]);

    const mesh = bush_test3.scene.children[0] as THREE.Mesh;
    const planegeo = new THREE.PlaneGeometry(2, 2);
    const leafMat = new THREE.MeshLambertNodeMaterial({ transparent: false });

    const sampler = new MeshSurfaceSampler(mesh).build();
    const countPerBush = 80;
    const bushCount = 10;
    const totalCount = countPerBush * bushCount;

    // 💡 지오메트리 병합 없이, 순수 Plane 1개만 사용합니다!
    const instancedBush = new THREE.InstancedMesh(planegeo, leafMat, totalCount);

    const iPosArray = new Float32Array(totalCount * 3);
    const iScaleArray = new Float32Array(totalCount);
    const iNormalArray = new Float32Array(totalCount * 3);
    const iMaskArray = new Float32Array(totalCount * 3);

    const dummyBush = new THREE.Object3D();
    const positionL = new THREE.Vector3();
    const normal = new THREE.Vector3();
    let globalIndex = 0;

    const bushes = [
      { x: 30, y: 0, z: 20, s: 0.5 },
      { x: 20, y: 0, z: 10, s: 0.75 },
      { x: -10, y: 0, z: -30, s: 1 },
      { x: 10, y: 0, z: -30, s: 1.25 },
      { x: -20, y: 0, z: -30, s: 1.5 },
      { x: -40, y: 0, z: -30, s: 1.75 },
      { x: 60, y: 0, z: -40, s: 2 },
      { x: 70, y: 0, z: -50, s: 2.25 },
      { x: -40, y: 0, z: -60, s: 2.5 },
      { x: -40, y: 0, z: -22, s: 2.75 },
    ];

    // 1. 10개의 덤불을 만듭니다.
    for (let b = 0; b < bushCount; b++) {
      dummyBush.position.set(bushes[b].x, bushes[b].y, bushes[b].z);
      dummyBush.scale.setScalar(bushes[b].s);
      dummyBush.updateMatrix(); // 이 덤불의 매트릭스 완성

      // 2. 각 덤불 안에 80개의 잎사귀를 뿌립니다.
      for (let l = 0; l < countPerBush; l++) {
        sampler.sample(positionL, normal);

        // 💡 핵심: 잎사귀의 로컬 위치를 덤불의 매트릭스에 곱해 '최종 위치'를 알아냅니다.
        const leafPos = positionL.clone().applyMatrix4(dummyBush.matrix);
        const leafNorm = normal.clone().transformDirection(dummyBush.matrix);

        // 개별 잎사귀 스케일 * 덤불 스케일
        const leafScale = (Math.random() * 0.5 + 0.6) * dummyBush.scale.x;

        iPosArray[globalIndex * 3 + 0] = leafPos.x;
        iPosArray[globalIndex * 3 + 1] = leafPos.y;
        iPosArray[globalIndex * 3 + 2] = leafPos.z;

        iNormalArray[globalIndex * 3 + 0] = leafNorm.x;
        iNormalArray[globalIndex * 3 + 1] = leafNorm.y;
        iNormalArray[globalIndex * 3 + 2] = leafNorm.z;

        iScaleArray[globalIndex] = leafScale;
        iMaskArray[globalIndex] = Math.floor(Math.random() * 4);

        globalIndex++;
      }
    }

    // 3. 완성된 데이터를 InstancedBufferAttribute로 꽂아줍니다!
    planegeo.setAttribute("iPos", new THREE.InstancedBufferAttribute(iPosArray, 3));
    planegeo.setAttribute("iScale", new THREE.InstancedBufferAttribute(iScaleArray, 1));
    planegeo.setAttribute("iNormal", new THREE.InstancedBufferAttribute(iNormalArray, 3));
    planegeo.setAttribute("iMask", new THREE.InstancedBufferAttribute(iMaskArray, 1));

    this.scene.add(instancedBush);
    const iPos = attribute("iPos", "vec3");
    const iScale = attribute("iScale", "float");
    const iNormal = attribute("iNormal", "vec3");
    const iMask = attribute("iMask", "float");

    const alpha = texture(masks, uv()).depth(iMask).step(0.5).toVar();
    leafMat.opacityNode = alpha;
    leafMat.alphaTestNode = float(0.5);

    // ------------ normal node -------------------
    const upVec = vec3(uniforms.x, uniforms.y, uniforms.z);
    const viewNormal = normalize(modelViewMatrix.mul(vec4(upVec, 0)).xyz);
    const fianlNormal = mix(iNormal, viewNormal, 0.5);
    leafMat.normalNode = fianlNormal;

    //@ts-ignore
    leafMat.emissiveNode = output;

    const customColor = mix(this.config.COLOR.GH, color("yellowgreen"), output);
    leafMat.colorNode = customColor;

    // --------- Position Node -----------

    // 💡 2. 잎사귀의 진짜 중심점 (월드 좌표)
    // iPos는 이미 덤불 단위의 위치 계산이 끝난 값입니다.
    // 여기에 InstancedMesh 덩어리 자체의 위치(modelMatrix)만 곱해주면 완벽한 월드 좌표가 됩니다.
    const baseLeafCenter = modelWorldMatrix.mul(vec4(iPos, 1.0)).xyz;

    const windSpeed = time;
    const wave1 = sin(windSpeed.add(baseLeafCenter.x.mul(0.5)).add(baseLeafCenter.z.mul(0.5)));
    const wave2 = cos(windSpeed.mul(5).add(baseLeafCenter.x.mul(2.0)));
    const windNoise = wave1.mul(0.7).add(wave2.mul(0.3));

    const heightMask = iPos.y;

    const windDirection = vec3(1.0, 0.2, 0.5).normalize();
    const windForce = windDirection.mul(windNoise).mul(heightMask).mul(0.2);

    const leafCenterWorld = baseLeafCenter.add(windForce);

    // 💡 3. 카메라 Right / Up 벡터 추출 (무조건 카메라를 향하는 십자가 화살표)
    const cameraRight = vec3(cameraViewMatrix[0].x, cameraViewMatrix[1].x, cameraViewMatrix[2].x);
    const cameraUp = vec3(cameraViewMatrix[0].y, cameraViewMatrix[1].y, cameraViewMatrix[2].y);

    // 💡 4. 월드 중심점(leafCenterWorld)에서, 카메라 방향으로 잎사귀 면(positionLocal)을 개별 스케일에 맞게 펼칩니다!
    const vertexWorldPos = leafCenterWorld.add(cameraRight.mul(positionLocal.x).mul(iScale)).add(cameraUp.mul(positionLocal.y).mul(iScale));

    // 💡 5. 최종 화면 투영 (월드 -> 뷰 -> 클립)
    leafMat.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix).mul(vec4(vertexWorldPos, 1.0));

    instancedBush.frustumCulled = false;
    // 4. 그림자 캐스팅 및 리시브 활성화
    const depthMat = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });

    const proxyMat = new THREE.MeshBasicNodeMaterial({
      colorWrite: false, // 💡 핵심: 화면에 색을 그리지 않음
      depthWrite: false, // 💡 핵심: 깊이 버퍼에 쓰지 않음 (완전 투명화)
    });

    proxyMat.positionNode = positionLocal.add(vec3(sin(time.add(positionLocal.y.mul(20))), 0, 0));

    const shadowProxyMesh = new THREE.InstancedMesh(mesh.geometry, proxyMat, bushCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < bushCount; i++) {
      dummy.position.set(bushes[i].x, bushes[i].y, bushes[i].z);
      dummy.scale.setScalar(bushes[i].s);
      dummy.updateMatrix();
      shadowProxyMesh.setMatrixAt(i, dummy.matrix);
    }

    shadowProxyMesh.castShadow = true;

    this.scene.add(shadowProxyMesh);
  }
}
