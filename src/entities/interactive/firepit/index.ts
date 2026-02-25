import * as THREE from "three/webgpu";

import { Stump } from "./stump";
import { PhysicsSystem } from "@/systems/PhysicsSystem";
import { FireWood } from "./firewood";
import { Log } from "./log";

export default class Firepit {
  firewoods!: FireWood;

  log!: Log;
  stump!: Stump;

  constructor(private scene: THREE.Scene) {
    const zonePos = new THREE.Vector3(20, 0.5, -8);

    PhysicsSystem.createZone("chopping", zonePos, 5);

    this.firewoods = new FireWood(this.scene, zonePos);
    this.log = new Log(this.scene, zonePos);
    this.stump = new Stump(this.scene, zonePos);
  }

  update() {}
  dispose() {}
}
