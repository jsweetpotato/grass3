import * as THREE from "three/webgpu";

import { Assets } from "@/core/resources";
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import {
  cameraProjectionMatrix,
  cameraViewMatrix,
  color,
  float,
  mix,
  modelWorldMatrix,
  positionLocal,
  sin,
  texture,
  time,
  uv,
  vec3,
  vec4,
} from "three/tsl";
import type { TConfig } from "@/world/World";

export class AGrass {
  constructor(
    private scene: THREE.Scene,
    private gui: GUI,
    private config: TConfig
  ) {
    const { arround_wood_grass } = Assets.get();
    const material = new THREE.MeshLambertNodeMaterial();
    material.colorNode = mix(config.COLOR.GH, color("yellowgreen"), uv().y);

    // 💡 1. 덤불 인스턴스의 '월드 기준 중심 위치'를 가져옵니다.
    // (modelWorldMatrix의 4번째 열[3]이 바로 해당 인스턴스의 월드 x, y, z 좌표입니다)
    const instanceWorldPos = modelWorldMatrix[3];

    // 💡 2. 파동(Sine) 계산 시 positionLocal이 아닌 '월드 위치'를 사용합니다!
    // positionLocal을 쓰면 풀잎의 왼쪽과 오른쪽이 다르게 흔들려서 찌그러집니다.
    const timer = time.mul(2.0);
    const swayAmount = sin(timer.add(instanceWorldPos.x.mul(0.2)).add(instanceWorldPos.z.mul(0.2))).mul(float(1).sub(uv().y).pow(3));

    // 3. 한 방향(월드 기준 무조건 X축)으로 향하는 글로벌 바람 벡터 생성
    const globalWind = vec3(swayAmount, 0, 0);

    // 4. 현재 정점의 원래 '월드 좌표' 계산 (회전, 스케일, 위치가 모두 적용된 상태)
    const worldPos = modelWorldMatrix.mul(vec4(positionLocal, 1.0));

    // 5. 원래 월드 좌표에 글로벌 바람을 더해줍니다!
    const finalWorldPos = worldPos.add(vec4(globalWind, 0.0));

    // 💡 6. positionNode를 버리고, 최종 렌더링 노드인 vertexNode에 카메라 투영을 거쳐 할당합니다.
    material.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix).mul(finalWorldPos);
    // console.log(arround_wood_grass);

    const meshs = arround_wood_grass.scene;
    meshs.children.forEach((v) => {
      if (v instanceof THREE.Mesh || v instanceof THREE.InstancedMesh) {
        v.material = material;
        v.castShadow = true;
      }
    });

    this.scene.add(arround_wood_grass.scene);
  }
}

export class Flowers {
  constructor(
    private scene: THREE.Scene,
    private gui: GUI
  ) {
    const { flowers, flower_alpha } = Assets.get();
    // console.log("flowers", flowers);
    const material = new THREE.MeshLambertNodeMaterial({ transparent: false });
    const map = texture(flower_alpha, uv()).b.toVar();
    material.opacityNode = map.step(0.4);
    material.alphaTestNode = float(0.5);
    material.colorNode = color("purple");

    const meshs = flowers.scene;

    meshs.children.forEach((v) => {
      if (v instanceof THREE.Mesh || v instanceof THREE.InstancedMesh) {
        v.material = material;
        v.castShadow = true;
        material.castShadowNode = map;
      }
    });
    this.scene.add(flowers.scene);
  }
}
