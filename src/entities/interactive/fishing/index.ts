import { Assets } from "@/core/resources";
import { PhysicsSystem } from "@/systems/PhysicsSystem";
import { getModelSize } from "@/utils";
import RAPIER from "@dimforge/rapier3d-compat";
import { type Scene, Vector3 } from "three/webgpu";

export class Fishing {
  private zonePos = new Vector3();

  constructor(private scene: Scene) {
    // const { bridge } = Assets.get();
    // const model = bridge.scene;
    // model.traverse((v) => {
    //   if (v instanceof Object3D) {
    //     v.castShadow = true;
    //     v.receiveShadow = true;
    //   }
    // });
    // model.position.setY(-0.5);
    // this.zonePos.copy(model.position);
    // const size = getModelSize(model);
    // const floor = RAPIER.ColliderDesc.cuboid(size.x, 0.12, size.z).setTranslation(this.zonePos.x, this.zonePos.y, this.zonePos.z);
    // const front = RAPIER.ColliderDesc.cuboid(0.1, size.z, size.x).setTranslation(this.zonePos.x - size.x, this.zonePos.y + size.x, this.zonePos.z);
    // const left = RAPIER.ColliderDesc.cuboid(size.x, size.z, 0.1).setTranslation(
    //   this.zonePos.x,
    //   this.zonePos.y + size.x,
    //   this.zonePos.z + size.x / 1.5
    // );
    // const right = RAPIER.ColliderDesc.cuboid(size.x, size.z, 0.1).setTranslation(
    //   this.zonePos.x,
    //   this.zonePos.y + size.x,
    //   this.zonePos.z - size.x / 1.5
    // );
    // PhysicsSystem.World.createCollider(floor);
    // PhysicsSystem.World.createCollider(front);
    // PhysicsSystem.World.createCollider(left);
    // PhysicsSystem.World.createCollider(right);
    // this.scene.add(model);
    // PhysicsSystem.createZone("fishing", this.zonePos, 5);
  }
}
