import type { Player } from "@/entities/player/player";
import { lerpAngle, smoothDampAngle } from "@/utils/math";
import * as THREE from "three";
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { inputManager } from "./InputSystem";
import { eventBus } from "@/core/EventBus";
import type { State } from "@/main";

export class CameraSystem {
  private static _camera: THREE.PerspectiveCamera;
  private static _currentYaw: number = 0;
  private static _yawVelocity = { value: 0 };
  private static _currentPitch: number = 0;
  private static _targetYaw = 0;

  private static CONFIG = {
    DISTANCE: 6, // 캐릭터와의 거리 (고정)
    HEIGHT_OFFSET: 3, // 캐릭터 머리 위 얼마나 높게 있을지
    LOOK_AT_OFFSET: 1.5, // 캐릭터 발이 아니라 가슴/머리를 보게 함 (중요!)

    // ✨ [수정] 이제 Damping 대신 '도달 시간'을 씁니다.
    // 0.1초 만에 목표에 도달하라는 뜻 (아주 빠릿함)
    // 부드럽게 하고 싶으면 0.2 ~ 0.3으로 늘리세요.
    ROTATION_SMOOTH_TIME: 0.08,

    // 최대 회전 속도 (너무 획 돌아가서 어지러운 것 방지)
    MAX_ROTATION_SPEED: Infinity,

    HEIGHT_DAMPING: 3.0,
  };

  private constructor() {}

  public static init(scene: THREE.Scene, gui: GUI) {
    this._camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this._camera.position.set(0, 100, 0);
    this._camera.lookAt(0, 0, 0);
    scene.add(this._camera);

    const cameraGUI = gui.addFolder("camera");
    cameraGUI.add(this.CONFIG, "DISTANCE", 0, 20, 0.01);
    cameraGUI.add(this.CONFIG, "HEIGHT_OFFSET", 0, 20, 0.01);

    eventBus.on("lateUpdate", CameraSystem.update.bind(this));
  }

  public static get camera(): THREE.PerspectiveCamera {
    return this._camera;
  }

  public static get cameraRotation(): number {
    return this._currentYaw;
  }

  public static resize() {
    this._camera.aspect = window.innerWidth / window.innerHeight;
    this._camera.updateProjectionMatrix();
  }

  public static update({ delta, playerPos }: State) {
    if (!this._camera) return;

    if (inputManager.isLeftRot()) this._targetYaw += 2.0 * delta; // 왼쪽 회전
    if (inputManager.isRightRot()) this._targetYaw -= 2.0 * delta;

    // 1. 각도 부드럽게 만들기 (Exponential Smoothing)
    // 프레임율이 변해도 똑같은 부드러움을 유지하는 공식입니다.
    const lerpFactor = 1 - Math.exp(-4 * delta);
    this._currentYaw = lerpAngle(this._currentYaw, this._targetYaw, lerpFactor);

    // 2. 위치 계산 (삼각함수로 '원' 둘레 좌표 구하기)
    // lerp를 쓰지 않고 sin/cos로 직접 꽂아버리기 때문에 절대 가까워지지 않습니다.
    const offsetX = Math.sin(this._currentYaw) * this.CONFIG.DISTANCE;
    const offsetZ = Math.cos(this._currentYaw) * this.CONFIG.DISTANCE;

    // 3. 목표 위치 설정
    const targetX = playerPos.x + offsetX;
    const targetZ = playerPos.z + offsetZ;
    const targetY = playerPos.y + this.CONFIG.HEIGHT_OFFSET;

    // 4. 실제 카메라 이동
    this._camera.position.x = targetX; // X는 즉시 이동 (반응성)
    this._camera.position.z = targetZ; // Z는 즉시 이동 (반응성)

    this._camera.position.y = targetY;

    // 5. 시선 처리 (발끝이 아니라 캐릭터 몸통을 바라보게)
    // lookAt은 매 프레임 해도 비용이 싸니까 걱정 마세요.
    this._camera.lookAt(playerPos.x, playerPos.y + this.CONFIG.LOOK_AT_OFFSET, playerPos.z);
  }
}
