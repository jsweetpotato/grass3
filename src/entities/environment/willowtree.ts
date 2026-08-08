import {
  BackSide,
  BufferGeometry,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshLambertNodeMaterial,
  RepeatWrapping,
  type Scene,
} from "three/webgpu";
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

// managers
import { Assets } from "@/core/resources";

// types
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

export class WillowTree {
  constructor(
    private scene: Scene,
    gui: GUI,
  ) {
    const { willow_tree, willow_leaf } = Assets.get();

    const alphaTexture = willow_leaf;
    alphaTexture.wrapS = RepeatWrapping;
    alphaTexture.wrapT = RepeatWrapping;

    const model = willow_tree.scene;

    const foliages = model.children.splice(1, model.children.length);
    const group = new Group();
    group.add(...foliages);

    const scale = {
      scalar: 1,
    };
    gui
      .add(scale, "scalar", 0, 1, 0.01)
      .onFinishChange((v) => group.scale.setScalar(v));

    group.position.set(-32, -0.8, -12);
    gui.add(group.position, "x", -100, 100, 0.1).name("treeX");
    gui.add(group.position, "y", -100, 100, 0.1).name("treeY");
    gui.add(group.position, "z", -100, 100, 0.1).name("treeZ");

    scene.add(group);

    const material = new MeshLambertNodeMaterial({
      transparent: false,
      side: BackSide,
    });

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

    const finalViewPos = centerView
      .add(vec4(vec3(uvOffset.mul(size).add(0.5 /** inflation */), 0.0), 0.0))
      .toVar();

    material.vertexNode = cameraProjectionMatrix.mul(finalViewPos);

    material.colorNode = color("yellowgreen");
    material.alphaTestNode = float(0.5);

    const sphericalNormal = normalize(positionLocal);
    material.normalNode = sphericalNormal;
    // 1. Geometry 캐싱용 Map (중복된 toNonIndexed 및 연산 방지)
    const processedGeometries = new Map<BufferGeometry, BufferGeometry>();

    foliages.forEach((v) => {
      const foliage = v as Mesh;
      foliage.castShadow = true;
      foliage.receiveShadow = true;

      // 2. 이미 처리된 Geometry인지 확인하고, 처음 보는 거라면 처리 후 캐싱
      let optimizedGeo = processedGeometries.get(foliage.geometry);

      if (!optimizedGeo) {
        optimizedGeo = foliage.geometry.toNonIndexed();
        this.processFoliageGeometry(optimizedGeo); // 통합된 고속 연산 함수
        processedGeometries.set(foliage.geometry, optimizedGeo);
      }

      foliage.geometry = optimizedGeo;
      foliage.material = material;
    });
  }

  // 3. 두 개의 무거운 루프를 하나로 합치고, 함수 호출을 제거한 초고속 연산 메서드
  private processFoliageGeometry(geometry: BufferGeometry) {
    const posAttr = geometry.attributes.position;
    const posArray = posAttr.array; // 원시 Float32Array에 직접 접근
    const count = posAttr.count;

    const centers = new Float32Array(count * 3);
    const uvIndices = new Float32Array(count);

    const stride = 6; // Quad = 4, Non-indexed = 6

    for (let i = 0; i < count; i += stride) {
      let cx = 0,
        cy = 0,
        cz = 0;

      // A. Center 계산을 위해 원시 배열 인덱스 직접 조회
      for (let j = 0; j < stride; j++) {
        const vIdx = (i + j) * 3;
        cx += posArray[vIdx + 0];
        cy += posArray[vIdx + 1];
        cz += posArray[vIdx + 2];
      }

      cx /= stride;
      cy /= stride;
      cz /= stride;

      // B. 랜덤 인덱스 1회만 계산 (stride 단위로 동일하게 적용)
      const randomIndex = Math.floor(Math.random() * 9);

      // C. 계산된 Center와 UV Index를 한 번에 배열에 삽입
      for (let j = 0; j < stride; j++) {
        if (i + j < count) {
          const vIdx = (i + j) * 3;
          centers[vIdx + 0] = cx;
          centers[vIdx + 1] = cy;
          centers[vIdx + 2] = cz;

          uvIndices[i + j] = randomIndex;
        }
      }
    }

    // 최종적으로 한 번만 Attribute 등록
    geometry.setAttribute("aCenter", new Float32BufferAttribute(centers, 3));
    geometry.setAttribute("aUVIndex", new Float32BufferAttribute(uvIndices, 1));
  }
}
