import * as THREE from "three/webgpu";
import { Grass, LongGrass } from "../entities/environment/grass2";
import { Ground } from "../entities/environment/ground";

import { color, Fn, positionWorld, texture, uniform, vec2 } from "three/tsl";
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

import { Water } from "../entities/environment/water";
import { House } from "../entities/environment/house";
import { Rocks } from "../entities/environment/rocks";
import { Bush, Bush2 } from "@/entities/environment/bush";
import { SeaCreatures } from "@/entities/environment/seaCreatures";
import { Trees } from "@/entities/environment/tree";
import { WillowTree } from "@/entities/environment/willowtree";

const CONFIG = {
  WORLD_SIZE: 150,
  COLOR: {
    GH: uniform(new THREE.Color("#75b32f")), // Ground High
    GL: uniform(new THREE.Color("#E7C1AE")), // Ground Low
    WH: uniform(new THREE.Color("#0ab4ba")), // Water High
    WL: uniform(new THREE.Color("#0077aa")), // Water Low

    TT: uniform(color("#94fe8f")), // Tree Top
    TB: uniform(color("#8afaff")), // Tree Bottom
  },
} as const;

export type TConfig = typeof CONFIG;

export class World {
  constructor(
    private scene: THREE.Scene,
    private gui: GUI
  ) {
    new Grass(scene, gui, CONFIG);
    new LongGrass(scene, gui, CONFIG);
    new Ground(scene, gui, CONFIG);
    new WillowTree(scene, gui);
    new Water(scene, CONFIG);
    new House(scene, gui);
    new Rocks(scene, CONFIG);
    new SeaCreatures(scene);
    new Bush2(scene, gui);
    new Trees(scene, gui);
  }
}

export const getScaledUV = Fn(({ iPos, size }: { iPos: THREE.Node; size?: { x: number; z: number } }) => {
  if (size) {
    return vec2(iPos.x.div(size.x).add(0.5), iPos.z.negate().div(size.z).add(0.5));
  } else return vec2(iPos.x.div(CONFIG.WORLD_SIZE).add(0.5), iPos.z.negate().div(CONFIG.WORLD_SIZE).add(0.5));
});
