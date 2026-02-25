import { eventBus } from "@/core/EventBus";
import { Assets } from "@/core/resources";
import { mulberry32 } from "@/utils";
import { type TConfig } from "@/world/World";
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
  const ctx = canvas.getContext("2d");

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

export class Bush2 {
  private scene: THREE.Scene;
  private gui: GUI;
  private material!: THREE.MeshLambertNodeMaterial;

  private chunkVisuals: Map<string, THREE.Mesh> = new Map();
  constructor(scene: THREE.Scene, gui: GUI) {
    this.scene = scene;
    this.gui = gui;

    const material = new THREE.MeshLambertNodeMaterial({ side: THREE.DoubleSide });

    const size = 1;
    const uvOffsetBase = uv().remap(0, 1, -1, 1);
    const uvOffset = vec2(uvOffsetBase.x, uvOffsetBase.y);

    const centerLocal = attribute("_center", "vec3");

    const centerView = modelViewMatrix.mul(vec4(centerLocal, 1.0)).toVar();

    const finalViewPos = centerView.add(vec4(vec3(uvOffset.mul(size).add(0.1 /** inflation */), 0.0), 0.0)).toVar();

    material.colorNode = color("red");
    material.vertexNode = cameraProjectionMatrix.mul(finalViewPos);

    const sphericalNormal = normalize(positionLocal);
    material.normalNode = sphericalNormal;

    this.material = material;

    this.createInstance();
  }

  createInstance() {
    const { bush_test, bush_test2 } = Assets.get();
    const geoLOD1 = (bush_test.scene.children[0] as THREE.Mesh).geometry.clone().toNonIndexed();
    const geoLOD2 = (bush_test2.scene.children[0] as THREE.Mesh).geometry.clone().toNonIndexed();

    const lod = new THREE.LOD();
    const meshLOD1 = new THREE.Mesh(geoLOD1, this.material);
    const meshLOD2 = new THREE.Mesh(geoLOD2, this.material);

    meshLOD1.position.set(0, 3, 0);
    meshLOD2.position.set(0, 3, 0);

    lod.addLevel(meshLOD1, 0);
    lod.addLevel(meshLOD2, 40);

    this.scene.add(lod);
  }
}
