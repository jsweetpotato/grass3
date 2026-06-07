import { Assets } from "@/core/resources";
import { PhysicsSystem } from "@/systems/PhysicsSystem";

import { getModelSize, getWorldTransform } from "@/utils";
import RAPIER from "@dimforge/rapier3d-compat";
import type { Scene, Vector3 } from "three/webgpu";

export class Log {
  constructor(
    private scene: Scene,
    private zonePos: Vector3
  ) {
    //   const { log } = Assets.get();
    //   const model = log.scene.children[0];
    //   model.position.add(this.zonePos);
    //   this.create(model as Mesh);
    // }
    // create(mesh: Mesh) {
    //   const size = getModelSize(mesh);
    //   const { position, quaternion } = getWorldTransform(mesh);
    //   const colliderDesc = RAPIER.ColliderDesc.cylinder(size.y, size.x);
    //   const collider = PhysicsSystem.World.createCollider(colliderDesc);
    //   collider.setTranslation(position);
    //   collider.setRotation(quaternion);
    //   collider.setSensor(true);
    //   this.scene.add(mesh);
    // }
  }
}
