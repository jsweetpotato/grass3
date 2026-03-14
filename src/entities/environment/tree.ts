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

    bigTree.castShadow = true;

    scene.add(trees.scene, big_tree.scene);
  }
}
