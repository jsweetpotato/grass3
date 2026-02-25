import * as THREE from "three/webgpu";

import { Assets } from "@/core/resources";

export class SeaCreatures {
  constructor(scene: THREE.Scene) {
    const { seashell, starfish } = Assets.get();
    scene.add(seashell.scene, starfish.scene);
  }
}
