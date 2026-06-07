import { InstancedMesh, Mesh, type Scene } from "three/webgpu";
import { Assets } from "@/core/resources";

export class SeaCreatures {
  constructor(scene: Scene) {
    const { seashell, starfish } = Assets.get();

    seashell.scene.traverse((v) => (v instanceof InstancedMesh || v instanceof Mesh) && (v.receiveShadow = true));

    starfish.scene.traverse((v) => (v instanceof InstancedMesh || v instanceof Mesh) && (v.receiveShadow = true));

    scene.add(seashell.scene, starfish.scene);
  }
}
