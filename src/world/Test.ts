import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { positionLocal } from "three/tsl";
import * as THREE from "three/webgpu";

export class Test {
  constructor(
    private scene: THREE.Scene,
    private gui: GUI
  ) {
    const mat = new THREE.MeshLambertNodeMaterial();

    // @ts-ignore
    mat.emissiveNode = positionLocal.y;
    // mat.emissiveIntensity = 10000;
    const geo = new THREE.BoxGeometry(1, 1, 1);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, 0);
    this.scene.add(mesh);
  }
}
