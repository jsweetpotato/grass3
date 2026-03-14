import * as THREE from "three/webgpu";

import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { color, materialColor, mix, positionLocal } from "three/tsl";
import type { TConfig } from "../../world/World";
import { Assets } from "@/core/resources";
export class Rocks {
  constructor(
    private scene: THREE.Scene,
    private CONFIG: TConfig
  ) {
    const { rocks } = Assets.get();

    rocks.scene.traverse((v) => {
      if (v instanceof THREE.Object3D) {
        v.castShadow = true;
        v.receiveShadow = true;
      }
    });

    console.log(rocks);
    this.scene.add(rocks.scene);
  }
}
