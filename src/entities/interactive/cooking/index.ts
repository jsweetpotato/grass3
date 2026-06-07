import { Assets } from "@/core/resources";
import type { Scene } from "three/webgpu";

export class Cooking {
  constructor(private scene: Scene) {
    // physicsSystem.createZone('cooking',)

    const { cooking } = Assets.get();

    const model = cooking.scene;
    model.castShadow = true;
    this.scene.add(model);
  }
}
