import { Assets } from "@/core/resources";
import * as THREE from "three/webgpu";

export class Cooking {
  constructor(private scene: THREE.Scene) {
    // physicsSystem.createZone('cooking',)

    const { cooking } = Assets.get();

    const model = cooking.scene;
    model.castShadow = true;
    this.scene.add(model);
  }
}
