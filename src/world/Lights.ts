import { AmbientLight, Camera, Color, Vector3, type Scene } from "three/webgpu";
import { CSM } from "three/examples/jsm/csm/CSM.js";

import { eventBus } from "@/core/EventBus";

import type { State } from "@/main";
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

export class Lights {
  // private directionLight: DirectionalLight;
  private shadowMapSize = 4096;
  private csm!: CSM;

  private d = 15;
  private offset = { x: 50, y: 50, z: 50 };

  constructor(
    private scene: Scene,
    private camera: Camera,
    private gui: GUI,
  ) {
    // Lights

    const lightGUI = gui.addFolder("Lights");

    const ambientGUI = lightGUI.addFolder("Ambient Light");
    const ambientLight = new AmbientLight("#FFFDEC", 1);
    ambientGUI.add(ambientLight, "intensity", 0, 2, 0.01);
    ambientGUI.addColor(ambientLight, "color");

    this.scene.add(ambientLight);

    // const direcLight = new DirectionalLight("#fffbbd", 4);
    // const dirLHelper = new DirectionalLightHelper(direcLight);
    // const shadowHelper = new CameraHelper(direcLight.shadow.camera);
    // this.directionLight = direcLight;

    // direcLight.position.set(this.offset.x, this.offset.y, this.offset.z);
    // direcLight.castShadow = true;

    // const d = 35;
    // direcLight.shadow.camera.left = -d;
    // direcLight.shadow.camera.right = d;
    // direcLight.shadow.camera.top = d;
    // direcLight.shadow.camera.bottom = -d;

    // direcLight.shadow.radius = 2;

    // // 3. 깊이 설정 (중요)
    // direcLight.shadow.camera.near = 0.001;
    // direcLight.shadow.camera.far = 200; // 조명 위치로부터 200만큼의 거리까지 계산

    // direcLight.shadow.bias = -0.001;
    // direcLight.shadow.normalBias = 0.001;
    // direcLight.shadow.mapSize.set(4096, 4096);
    // direcLight.shadow.autoUpdate = true;
    // direcLight.shadow.blurSamples = 32;

    // this.scene.add(direcLight);

    // const DirectionalLightGUI = this.gui.addFolder("DirectionalLight");
    // DirectionalLightGUI.add(direcLight, "intensity", 0, 10, 0.01);
    // DirectionalLightGUI.add(direcLight.position, "x", 0, 100, 0.01);
    // DirectionalLightGUI.add(direcLight.position, "y", 0, 100, 0.01);
    // DirectionalLightGUI.add(direcLight.position, "z", 0, 100, 0.01);
    // DirectionalLightGUI.addColor(direcLight, "color");
    // DirectionalLightGUI.add(direcLight.shadow, "bias", -1, 1, 0.001);
    // DirectionalLightGUI.add(direcLight.shadow, "normalBias", 0, 1, 0.001);

    const lightDir = new Vector3();

    const config = {
      lightFar: 1000,
      lightNear: 0.1,
      shadowBias: 0.01,
      lightDirection: new Vector3(-4.06, -8.44, -4.92),
    };

    this.csm = new CSM({
      maxFar: 90,
      cascades: 3,
      mode: "practical",
      parent: scene,
      shadowMapSize: 2048,
      lightDirection: lightDir.copy(config.lightDirection).normalize(), // 태양의 방향
      camera: camera, // 메인 카메라 기준,
      shadowBias: -0.00004,
      lightNear: 0.1,
      lightFar: 3000,
      lightIntensity: 0.8,
    });

    this.csm.fade = true;

    eventBus.on("update", () => {
      this.csm.update();
    });

    const CSMGUI = lightGUI.addFolder("CSM Light");

    CSMGUI.add(config.lightDirection, "x", -10, 10, 0.01).onFinishChange(
      (v) => {
        config.lightDirection.x = v;
        this.csm.lightDirection = lightDir
          .copy(config.lightDirection)
          .normalize();
      },
    );
    CSMGUI.add(config.lightDirection, "y", -10, 10, 0.01).onFinishChange(
      (v) => {
        config.lightDirection.y = v;
        this.csm.lightDirection = lightDir
          .copy(config.lightDirection)
          .normalize();
      },
    );
    CSMGUI.add(config.lightDirection, "z", -10, 10, 0.01).onFinishChange(
      (v) => {
        config.lightDirection.z = v;
        this.csm.lightDirection = lightDir
          .copy(config.lightDirection)
          .normalize();
      },
    );
    CSMGUI.addColor(this.csm.lights[0], "color").name("light 1");
    CSMGUI.addColor(this.csm.lights[1], "color").name("light 2");
    CSMGUI.addColor(this.csm.lights[2], "color").name("light 3");
  }

  update({ delta, playerPos }: State) {
    // if (!this.directionLight) return;
    // // 1. 그림자 맵 픽셀 1개가 실제 월드에서 차지하는 크기(크기)를 계산합니다.
    // // 카메라 너비(d * 2) / 해상도(mapSize)
    // const shadowTexelSize = (this.d * 2) / this.shadowMapSize;
    // // 2. 플레이어 위치에 맞춰 이상적인 조명 위치를 구합니다.
    // let idealX = playerPos.x + this.offset.x;
    // let idealZ = playerPos.z + this.offset.z;
    // // 3. (핵심) 이상적인 위치를 shadowTexelSize 배수로 스냅핑(반올림)하여 떨림을 막습니다!
    // idealX = Math.round(idealX / shadowTexelSize) * shadowTexelSize;
    // idealZ = Math.round(idealZ / shadowTexelSize) * shadowTexelSize;
    // this.directionLight.position.x = idealX;
    // this.directionLight.position.z = idealZ;
    // // 타겟 위치도 똑같이 스냅핑 해주는 것이 좋습니다.
    // const targetIdealX = Math.round(playerPos.x / shadowTexelSize) * shadowTexelSize;
    // const targetIdealZ = Math.round(playerPos.z / shadowTexelSize) * shadowTexelSize;
    // // (y축은 보통 떨림에 큰 영향을 안 주므로 플레이어 y를 그대로 써도 무방)
    // this.directionLight.target.position.set(targetIdealX, playerPos.y, targetIdealZ);
    // this.directionLight.target.updateMatrixWorld();
  }
}
