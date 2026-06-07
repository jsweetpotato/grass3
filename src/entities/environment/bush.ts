import { InstancedBufferAttribute, InstancedMesh, Mesh, MeshBasicNodeMaterial, MeshLambertNodeMaterial, NearestFilter, Object3D, PlaneGeometry, Sphere, Vector3, type Scene } from "three/webgpu";
import {
  attribute,
  cameraProjectionMatrix,
  color,
  float,
  modelViewMatrix,
  texture,
  uv,
  vec3,
  vec4,
  normalize,
  positionLocal,
  sin,
  time,
  modelWorldMatrix,
  uniform,
  mix,
  cameraViewMatrix,
  output,
  round
} from "three/tsl";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

// managers
import { eventBus } from "@/core/EventBus";
import { Assets } from "@/core/resources";

import { createDataTextureArray } from "@/utils";

// types
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import type { TConfig } from "@/world/World";

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
    private scene: Scene,
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
    masks.generateMipmaps = false;
    masks.minFilter = NearestFilter; // 또는 NearestFilter
    masks.magFilter = NearestFilter;
    masks.needsUpdate = true;

    const mesh = bush_test3.scene.children[0] as Mesh;
    const planegeo = new PlaneGeometry(2, 2);
    const leafMat = new MeshLambertNodeMaterial();

    leafMat.alphaTest = 0.5;
    leafMat.transparent = false;
    leafMat.precision = "lowp";
    // leafMat.side = DoubleSide;

    const sampler = new MeshSurfaceSampler(mesh).build();

    const countPerBush = 500;
    const bushCount = Math.floor(treesData.length / 4);
    const totalCount = countPerBush * bushCount;

    const instancedBush = new InstancedMesh(planegeo, leafMat, totalCount);

    const iPosArray = new Float32Array(totalCount * 3);
    const iNormalArray = new Float32Array(totalCount * 3);
    // (x: scale, y: mask, z: randomDepth)
    const iDataArray = new Float32Array(totalCount * 3);

    const basePositions = new Float32Array(countPerBush * 3);
    const baseNormals = new Float32Array(countPerBush * 3);

    const _tempPos = new Vector3();
    const _tempNormal = new Vector3();

    for (let i = 0; i < countPerBush; i++) {
      sampler.sample(_tempPos, _tempNormal);

      basePositions[i * 3 + 0] = _tempPos.x;
      basePositions[i * 3 + 1] = _tempPos.y;
      basePositions[i * 3 + 2] = _tempPos.z;

      baseNormals[i * 3 + 0] = _tempNormal.x;
      baseNormals[i * 3 + 1] = _tempNormal.y;
      baseNormals[i * 3 + 2] = _tempNormal.z;
    }

    let globalIndex = 0;

    for (let b = 0; b < bushCount; b++) {
      const b4 = b * 4;

      const bushX = treesData[b4 + 0];
      const bushY = treesData[b4 + 1];
      const bushZ = treesData[b4 + 2];
      const bushScale = treesData[b4 + 3] * 0.4;

      let addNum = 1;

      for (let l = 0; l < countPerBush; l += addNum) {
        addNum = Math.floor(Math.random() * 3) + 1;
        if (l >= countPerBush) break;

        const px = basePositions[l * 3 + 0];
        const py = basePositions[l * 3 + 1];
        const pz = basePositions[l * 3 + 2];

        const nx = baseNormals[l * 3 + 0];
        const ny = baseNormals[l * 3 + 1];
        const nz = baseNormals[l * 3 + 2];

        iPosArray[globalIndex * 3 + 0] = px * bushScale + bushX;
        iPosArray[globalIndex * 3 + 1] = py * bushScale + bushY;
        iPosArray[globalIndex * 3 + 2] = pz * bushScale + bushZ;

        iNormalArray[globalIndex * 3 + 0] = nx;
        iNormalArray[globalIndex * 3 + 1] = ny;
        iNormalArray[globalIndex * 3 + 2] = nz;

        iDataArray[globalIndex * 3 + 0] = (Math.random() * 0.4 + 0.4) * bushScale;
        iDataArray[globalIndex * 3 + 1] = Math.floor(Math.random() * 4);
        iDataArray[globalIndex * 3 + 2] = (Math.random() - 0.5) * 0.5;

        globalIndex++;
      }
    }

    const finalPosArray = iPosArray.slice(0, globalIndex * 3);
    const finalDataArray = iDataArray.slice(0, globalIndex * 3);
    const finalNormalArray = iNormalArray.slice(0, globalIndex * 3);

    instancedBush.boundingSphere = new Sphere(new Vector3(0, 0, 0), 70);
    instancedBush.frustumCulled = true;

    instancedBush.castShadow = false;
    instancedBush.receiveShadow = false;
    instancedBush.count = globalIndex;

    planegeo.setAttribute("iPos", new InstancedBufferAttribute(finalPosArray, 3));
    planegeo.setAttribute("iData", new InstancedBufferAttribute(finalDataArray, 3));
    planegeo.setAttribute("iNormal", new InstancedBufferAttribute(finalNormalArray, 3));

    this.scene.add(instancedBush);
    const iPos = attribute("iPos", "vec3");
    const iData = attribute("iData", "vec3");
    const iNormal = attribute("iNormal", "vec3");
    const iScale = iData.x;
    const iMask = iData.y;
    const iDepthOffset = iData.z;

    const safeMaskIndex = round(iMask);

    const alpha = texture(masks, uv()).depth(safeMaskIndex).toVar();
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

    const windSpeed = time;
    const posOffset = iPos.x.add(iPos.z).mul(0.5);
    const windNoise = sin(windSpeed.add(posOffset))
      .mul(0.4)
      .add(sin(windSpeed.mul(3.0).add(iPos.x)).mul(0.3));

    const heightMask = iPos.y;
    const windDirection = vec3(1.0, 0.2, 0.5).normalize();
    const windForce = windDirection.mul(windNoise).mul(heightMask).mul(0.2);

    const leafCenterLocal = iPos.add(windForce);
    const depthAdjustedCenter = leafCenterLocal.add(iNormal.mul(iDepthOffset));

    const centerWorld = modelWorldMatrix.mul(vec4(depthAdjustedCenter, 1.0));
    const centerView = cameraViewMatrix.mul(centerWorld);

    const billboardViewPos = centerView.xyz.add(vec3(positionLocal.x.mul(iScale), positionLocal.y.mul(iScale), 0.0));

    leafMat.vertexNode = cameraProjectionMatrix.mul(vec4(billboardViewPos, 1.0));

    const shadowProxyMesh = this.createShadowProxyMesh(mesh, bushCount, treesData);

    this.scene.add(shadowProxyMesh);
  }

  createShadowProxyMesh(mesh: Mesh, bushCount: number, treesData: number[]) {
    const proxyMat = new MeshBasicNodeMaterial({
      colorWrite: false, // 💡 핵심: 화면에 색을 그리지 않음
      depthWrite: false // 💡 핵심: 깊이 버퍼에 쓰지 않음 (완전 투명화)
    });

    proxyMat.positionNode = positionLocal.add(vec3(sin(time.add(positionLocal.y.mul(20))), 0, 0));

    const shadowProxyMesh = new InstancedMesh(mesh.geometry, proxyMat, bushCount);
    const dummy = new Object3D();
    for (let i = 0; i < bushCount; i++) {
      dummy.position.set(treesData[i * 4], treesData[i * 4 + 1], treesData[i * 4 + 2]);
      dummy.scale.setScalar(treesData[i * 4 + 3] * 0.3);
      dummy.updateMatrix();
      shadowProxyMesh.setMatrixAt(i, dummy.matrix);
    }
    // shadowProxyMesh.visible = false;
    shadowProxyMesh.castShadow = true;
    return shadowProxyMesh;
  }
}
