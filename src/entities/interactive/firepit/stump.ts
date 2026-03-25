import { Assets } from "@/core/resources";
import { PhysicsSystem } from "@/systems/PhysicsSystem";
import { getModelSize, getWorldTransform } from "@/utils";
import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three/webgpu";

export class Stump {
  constructor(
    private scene: THREE.Scene,
    private zonePos: THREE.Vector3
  ) {
    //   const { stump } = Assets.get();
    //   const model = stump.scene;
    //   // model.position.add(this.zonePos);
    //   this.scene.add(model);
    //   // this.create(model);
    // }
    // create(mesh: THREE.Object3D) {
    //   const size = getModelSize(mesh);
    //   const { position, quaternion } = getWorldTransform(mesh);
    //   const colliderDesc = RAPIER.ColliderDesc.cylinder(size.y, size.x);
    //   const collider = PhysicsSystem.World.createCollider(colliderDesc);
    //   collider.setTranslation(position);
    //   collider.setRotation(quaternion);
    //   this.scene.add(mesh);
    // }
  }
}
