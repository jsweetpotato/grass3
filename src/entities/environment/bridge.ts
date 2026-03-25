import { data } from "@/core/Data";
import { Assets } from "@/core/resources";
import { PhysicsSystem } from "@/systems/PhysicsSystem";
import { getModelSize, getWorldTransform } from "@/utils";
import RAPIER from "@dimforge/rapier3d-compat";

import * as THREE from "three/webgpu";

export class Bridge {
  // private zonePos = new THREE.Vector3();
  private center = new THREE.Vector3();

  constructor(private scene: THREE.Scene) {
    const { bridge, bridge_collider } = Assets.get();

    const model = bridge.scene;

    scene.add(model);

    model.traverse((v) => {
      if (v instanceof THREE.Mesh) {
        v.castShadow = true;
        v.receiveShadow = true;
      }
    });

    bridge_collider.scene.traverse((v) => {
      if (v instanceof THREE.Mesh) {
        const sizes = getModelSize(v);

        if (!sizes) return;

        const colliderDesc = RAPIER.ColliderDesc.cuboid(sizes.localSize.x, sizes.localSize.y, sizes.localSize.z);

        const { position, quaternion } = getWorldTransform(v);

        sizes.centerOffset.applyQuaternion(quaternion);

        const finalPosition = position.clone().add(sizes.centerOffset);

        const collider = PhysicsSystem.World.createCollider(colliderDesc);
        collider.setTranslation(finalPosition);
        collider.setRotation(quaternion);
      }
    });

    const pillarData = data.BRIDGE.pillars;
    const pillarCount = pillarData.length / 3;

    for (let i = 0; i < pillarCount; i++) {
      const i3 = i * 3;
      const colliderDesc = RAPIER.ColliderDesc.cylinder(2.55, 0.3).setTranslation(pillarData[i3], pillarData[i3 + 1], pillarData[i3 + 2]);

      PhysicsSystem.World.createCollider(colliderDesc);
    }
  }
}
