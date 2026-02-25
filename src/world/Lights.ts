import { eventBus } from "@/core/EventBus";
import type { Player } from "@/entities/player/player";
import type { State } from "@/main";
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import * as THREE from "three/webgpu";
export class Lights {
  private directionLight: THREE.DirectionalLight;
  private offset = { x: 50, y: 50, z: 50 };

  constructor(
    private scene: THREE.Scene,
    private gui: GUI
  ) {
    // Lights
    this.scene.add(new THREE.AmbientLight(0xffffff, 1));

    const direcLight = new THREE.DirectionalLight("#fffbbd", 4);
    const dirLHelper = new THREE.DirectionalLightHelper(direcLight);
    const shadowHelper = new THREE.CameraHelper(direcLight.shadow.camera);
    this.directionLight = direcLight;

    direcLight.position.set(this.offset.x, this.offset.y, this.offset.z);
    direcLight.castShadow = true;

    const d = 70;
    direcLight.shadow.camera.left = -d;
    direcLight.shadow.camera.right = d;
    direcLight.shadow.camera.top = d;
    direcLight.shadow.camera.bottom = -d;

    direcLight.shadow.radius = 4;

    // 3. 깊이 설정 (중요)
    direcLight.shadow.camera.near = 0.1;
    direcLight.shadow.camera.far = 200; // 조명 위치로부터 200만큼의 거리까지 계산

    direcLight.shadow.bias = -0.0001;
    direcLight.shadow.normalBias = 0.336;
    direcLight.shadow.mapSize.set(4096, 4096);
    direcLight.shadow.autoUpdate = true;
    direcLight.shadow.blurSamples = 4;

    this.scene.add(direcLight, dirLHelper, shadowHelper);

    const DirectionalLightGUI = this.gui.addFolder("DirectionalLight");
    DirectionalLightGUI.add(direcLight, "intensity", 0, 10, 0.01);
    DirectionalLightGUI.add(direcLight.position, "x", 0, 100, 0.01);
    DirectionalLightGUI.add(direcLight.position, "y", 0, 100, 0.01);
    DirectionalLightGUI.add(direcLight.position, "z", 0, 100, 0.01);
    DirectionalLightGUI.addColor(direcLight, "color");
    DirectionalLightGUI.add(direcLight.shadow, "bias", -1, 1, 0.001);
    DirectionalLightGUI.add(direcLight.shadow, "normalBias", 0, 1, 0.001);

    eventBus.on("lateUpdate", this.update.bind(this));
  }

  update({ delta, playerPos }: State) {
    if (!this.directionLight) return;

    // 1. 조명의 위치 업데이트 (플레이어 대비 항상 일정 거리 유지)
    this.directionLight.position.x = playerPos.x + this.offset.x;
    this.directionLight.position.z = playerPos.z + this.offset.z;

    // 2. 조명의 타겟 위치 업데이트 (플레이어의 현재 위치를 바라보게 함)
    // DirectionalLight의 target은 별도의 Object3D이므로 위치를 직접 수정해야 합니다.
    this.directionLight.target.position.set(playerPos.x, playerPos.y, playerPos.z);

    // 3. Three.js에서 target의 위치 변화를 반영하기 위해 matrix를 업데이트해야 할 때가 있습니다.
    this.directionLight.target.updateMatrixWorld();
  }
}
