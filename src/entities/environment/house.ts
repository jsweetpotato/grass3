import * as THREE from "three/webgpu";
import { Assets } from "@/core/resources";
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
export class House {
  constructor(
    private scene: THREE.Scene,
    private gui: GUI
  ) {
    const { house } = Assets.get();

    const model = house.scene;

    model.scale.setScalar(0.9);

    model.rotateY(-Math.PI * 0.15);
    model.traverse((v) => {
      if (v instanceof THREE.Object3D) {
        v.castShadow = true;
        v.receiveShadow = true;
      }
    });

    gui.add(model.position, "x", -10, 10, 0.01);
    gui.add(model.position, "z", -10, 10, 0.01);

    this.scene.add(model);
  }
}
