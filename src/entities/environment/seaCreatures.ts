import * as THREE from "three/webgpu";

import { Assets } from "@/core/resources";

export class SeaCreatures {
  constructor(scene: THREE.Scene) {
    const { seashell, starfish } = Assets.get();

    seashell.scene.traverse((v) => (v instanceof THREE.InstancedMesh || v instanceof THREE.Mesh) && (v.receiveShadow = true));

    starfish.scene.traverse((v) => (v instanceof THREE.InstancedMesh || v instanceof THREE.Mesh) && (v.receiveShadow = true));

    scene.add(seashell.scene, starfish.scene);
  }
}
