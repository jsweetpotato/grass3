import { eventBus } from "@/core/EventBus";
import { Assets } from "@/core/resources";
import { createDataTextureArray } from "@/utils";
import { type TConfig } from "@/world/World";
import { MeshSurfaceSampler } from "three/examples/jsm/Addons.js";
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import {
  attribute,
  cameraProjectionMatrix,
  color,
  float,
  modelViewMatrix,
  normalLocal,
  texture,
  uv,
  vec3,
  vec4,
  normalize,
  positionLocal,
  Fn,
  cos,
  sin,
  time,
  modelWorldMatrix,
  uniform,
  mix,
  cameraViewMatrix,
  output
} from "three/tsl";
import * as THREE from "three/webgpu";

const uniforms = {
  x: uniform(0.66),
  y: uniform(0.64),
  z: uniform(0.76)
};

// const flatShade = Fn(() => {
//   const upVec = vec3(uniforms.x, uniforms.y, uniforms.z);
//   const viewNormal = normalize(modelViewMatrix.mul(vec4(upVec, 0)).xyz);
//   const fianlNormal = mix(normalLocal, viewNormal, 0.5).step(0.3);
//   return fianlNormal;
// });

export class Bush3 {
  constructor(
    private scene: THREE.Scene,
    private gui: GUI,
    private config: TConfig
  ) {
    eventBus.on("trees:update", (treesData: number[]) => {
      this.init(treesData);
    });
  }

  init(treesData: number[]) {
    const { bush_test3, bush_alpha_2, bush_alpha_3, bush_alpha_4 } = Assets.get();

    const masks = createDataTextureArray([bush_alpha_2.image as HTMLImageElement, bush_alpha_3.image as HTMLImageElement, bush_alpha_4.image as HTMLImageElement]);

    const mesh = bush_test3.scene.children[0] as THREE.Mesh;
    const planegeo = new THREE.PlaneGeometry(2, 2);
    const leafMat = new THREE.MeshLambertNodeMaterial({ transparent: false });

    const sampler = new MeshSurfaceSampler(mesh).build();

    const countPerBush = 200;
    const bushCount = Math.floor(treesData.length / 4);

    const totalCount = countPerBush * bushCount;

    const instancedBush = new THREE.InstancedMesh(planegeo, leafMat, totalCount);

    const iPosArray = new Float32Array(totalCount * 3);
    const iScaleArray = new Float32Array(totalCount);
    const iNormalArray = new Float32Array(totalCount * 3);
    const iMaskArray = new Float32Array(totalCount * 3);

    const dummyBush = new THREE.Object3D();
    const positionL = new THREE.Vector3();
    const normal = new THREE.Vector3();

    let globalIndex = 0;

    for (let b = 0; b < bushCount; b++) {
      const b4 = b * 4;

      // trees.ts의 instancedTree 여러개 데이터 추출해서 dummyBush 포지션과 스케일링 적용
      dummyBush.position.set(treesData[b4], treesData[b4 + 1], treesData[b4 + 2]);
      dummyBush.scale.setScalar(treesData[b4 + 3] * 0.4);
      dummyBush.updateMatrix();

      // 2. 각 덤불 안에 80개의 잎사귀를 뿌립니다.
      for (let l = 0; l < countPerBush; l++) {
        sampler.sample(positionL, normal);
        // 💡 핵심: 잎사귀의 로컬 위치를 덤불의 매트릭스에 곱해 '최종 위치'를 알아냅니다.
        const leafPos = positionL.clone().applyMatrix4(dummyBush.matrix);
        const leafNorm = normal.clone().transformDirection(dummyBush.matrix);

        // 개별 잎사귀 스케일 * 덤불 스케일
        const leafScale = (Math.random() * 0.3 + 0.5) * dummyBush.scale.x;

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
    const wave2 = cos(windSpeed.mul(5).add(baseLeafCenter.x.mul(2)));
    const windNoise = wave1.mul(0.4).add(wave2.mul(0.3));

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

    const proxyMat = new THREE.MeshBasicNodeMaterial({
      colorWrite: false, // 💡 핵심: 화면에 색을 그리지 않음
      depthWrite: false // 💡 핵심: 깊이 버퍼에 쓰지 않음 (완전 투명화)
    });

    proxyMat.positionNode = positionLocal.add(vec3(sin(time.add(positionLocal.y.mul(20))), 0, 0));

    const shadowProxyMesh = new THREE.InstancedMesh(mesh.geometry, proxyMat, bushCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < bushCount; i++) {
      dummy.position.set(treesData[i * 4], treesData[i * 4 + 1], treesData[i * 4 + 2]);
      dummy.scale.setScalar(treesData[i * 4 + 3] * 0.3);
      dummy.updateMatrix();
      shadowProxyMesh.setMatrixAt(i, dummy.matrix);
    }

    shadowProxyMesh.castShadow = true;

    this.scene.add(shadowProxyMesh);
  }
}
