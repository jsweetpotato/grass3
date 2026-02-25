import * as THREE from "three/webgpu";

import { Assets } from "@/core/resources";
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

export class Trees {
  constructor(scene: THREE.Scene, gui: GUI) {
    const { trees, big_tree } = Assets.get();

    trees.scene.traverse((v) => {
      if (v instanceof THREE.Object3D) {
        v.castShadow = true;
        v.receiveShadow = true;
      }
    });

    const bigTree = big_tree.scene.children[0];
    bigTree.scale.set(8.4, 8.4, 11.5);

    const bigTreeGUI = gui.addFolder("big tree");

    bigTreeGUI.add(bigTree.scale, "x", 5, 20, 0.1);
    bigTreeGUI.add(bigTree.scale, "y", 5, 20, 0.1);
    bigTreeGUI.add(bigTree.scale, "z", 5, 20, 0.1);
    bigTree.position.set(-32, 0, -12);
    bigTree.castShadow = true;

    scene.add(trees.scene, big_tree.scene);
  }
}
