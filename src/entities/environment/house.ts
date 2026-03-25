import * as THREE from "three/webgpu";
import { Assets } from "@/core/resources";
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { getModelSize, getWorldTransform } from "@/utils";
import RAPIER from "@dimforge/rapier3d-compat";
import { PhysicsSystem } from "@/systems/PhysicsSystem";
export class House {
  constructor(
    private scene: THREE.Scene,
    private gui: GUI
  ) {
    const { house, house_collider } = Assets.get();

    const model = house.scene;
    const colliderModel = house_collider.scene;

    model.scale.setScalar(0.9);
    colliderModel.scale.setScalar(0.9);

    model.rotateY(-Math.PI * 0.15);
    colliderModel.rotateY(-Math.PI * 0.15);

    model.traverse((v) => {
      if (v instanceof THREE.Object3D) {
        v.castShadow = true;
        v.receiveShadow = true;
      }
    });

    colliderModel.traverse((v) => {
      // Object3D 대신 Mesh를 확인해야 geometry에 접근하기 안전합니다.
      if (v instanceof THREE.Mesh) {
        const sizes = getModelSize(v);

        if (!sizes) return;

        // 3. z축에 곱해져 있던 0.5를 제거했습니다!
        if (!sizes) return;
        const colliderDesc = RAPIER.ColliderDesc.cuboid(sizes.localSize.x, sizes.localSize.y, sizes.localSize.z);

        const { position, quaternion } = getWorldTransform(v);

        sizes.centerOffset.applyQuaternion(quaternion); // 월드 회전값 적용

        // 최종 위치 = 오브젝트의 월드 위치 + 회전된 중심점 오프셋
        const finalPosition = position.clone().add(sizes.centerOffset);

        const collider = PhysicsSystem.World.createCollider(colliderDesc);
        collider.setTranslation(finalPosition);
        collider.setRotation(quaternion);
      }
    });

    this.scene.add(model);
  }
}
