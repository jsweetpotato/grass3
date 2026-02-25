import { Assets } from "@/core/resources";
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import {
  round,
  attribute,
  float,
  div,
  uv,
  vec2,
  mod,
  mul,
  sub,
  add,
  texture,
  cameraProjectionMatrix,
  modelViewMatrix,
  vec3,
  vec4,
  normalize,
  positionLocal,
  color,
} from "three/tsl";
import * as THREE from "three/webgpu";

export class WillowTree {
  constructor(
    private scene: THREE.Scene,
    gui: GUI
  ) {
    const { willow_tree, willow_leaf } = Assets.get();

    const alphaTexture = willow_leaf;
    alphaTexture.wrapS = THREE.RepeatWrapping;
    alphaTexture.wrapT = THREE.RepeatWrapping;

    const model = willow_tree.scene;

    const foliages = model.children.splice(1, model.children.length);
    const group = new THREE.Group();
    group.add(...foliages);

    const scale = {
      scalar: 1,
    };
    gui.add(scale, "scalar", 0, 1, 0.01).onFinishChange((v) => group.scale.setScalar(v));

    group.position.set(-32, -0.8, -12);
    gui.add(group.position, "x", -100, 100, 0.1).name("treeX");
    gui.add(group.position, "y", -100, 100, 0.1).name("treeY");
    gui.add(group.position, "z", -100, 100, 0.1).name("treeZ");

    scene.add(group);

    const material = new THREE.MeshLambertNodeMaterial({ transparent: false, side: THREE.BackSide });

    // 나뭇잎 최적화 필수
    const indexNode = round(attribute("aUVIndex"));
    const gridSize = float(3.0); // 3x3 그리드
    const gridCols = float(1.5);
    const gridRows = float(2);

    const cellWidth = div(1.0, gridCols);
    const cellHeight = div(1.0, gridRows);

    const scaledUV = uv().mul(vec2(cellWidth, cellHeight));

    const rowIndex = round(div(indexNode, gridSize));
    const colIndex = mod(indexNode, gridCols);

    const uOffset = mul(colIndex, cellWidth);
    const rowInverted = sub(sub(gridRows, 1.0), rowIndex);
    const vOffset = mul(rowInverted, cellHeight);

    const finalUV = add(scaledUV, vec2(uOffset, vOffset));
    const alpha = texture(alphaTexture, finalUV).r.step(0.4).toVar();
    material.opacityNode = alpha;

    // Position
    const size = 1.5;
    const uvOffsetBase = uv().remap(0, 1, -1, 1);
    const uvOffset = vec2(uvOffsetBase.x, uvOffsetBase.y);

    const centerLocal = attribute("aCenter", "vec3");

    const centerView = modelViewMatrix.mul(vec4(centerLocal, 1.0)).toVar();

    // const inflation = normalLocal.mul(uniforms.inflate);

    const finalViewPos = centerView.add(vec4(vec3(uvOffset.mul(size).add(0.5 /** inflation */), 0.0), 0.0)).toVar();

    // E. 최종 위치를 프로젝션 매트릭스로 변환하여 반환
    material.vertexNode = cameraProjectionMatrix.mul(finalViewPos);

    material.colorNode = color("yellowgreen");
    material.alphaTestNode = float(0.5);

    const sphericalNormal = normalize(positionLocal);
    material.normalNode = sphericalNormal;

    foliages.forEach((v) => {
      const foliage = v as THREE.Mesh;
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      foliage.geometry = foliage.geometry.toNonIndexed();

      addCenterAttribute(foliage.geometry);
      addUVIndex(foliage.geometry);

      foliage.material = material;
    });
  }
}

function addCenterAttribute(geometry: THREE.BufferGeometry) {
  const posAttr = geometry.attributes.position;
  const count = posAttr.count;

  const centers = new Float32Array(count * 3);

  // Quad = 4, Non-indexed = 6
  const stride = 6;

  for (let i = 0; i < count; i += stride) {
    let cx = 0,
      cy = 0,
      cz = 0;

    for (let j = 0; j < stride; j++) {
      cx += posAttr.getX(i + j);
      cy += posAttr.getY(i + j);
      cz += posAttr.getZ(i + j);
    }

    cx /= stride;
    cy /= stride;
    cz /= stride;

    for (let j = 0; j < stride; j++) {
      const idx = (i + j) * 3;
      centers[idx] = cx;
      centers[idx + 1] = cy;
      centers[idx + 2] = cz;
    }
  }

  geometry.setAttribute("aCenter", new THREE.Float32BufferAttribute(centers, 3));
}

function addUVIndex(geometry: THREE.BufferGeometry) {
  const count = geometry.attributes.position.count;

  const atlasIndices = new Float32Array(count);

  for (let i = 0; i < count; i += 6) {
    const randomIndex = Math.floor(Math.random() * 9);

    for (let j = 0; j < 6; j++) {
      if (i + j < count) {
        atlasIndices[i + j] = randomIndex;
      }
    }
  }
  geometry.setAttribute("aUVIndex", new THREE.Float32BufferAttribute(atlasIndices, 1));
}
