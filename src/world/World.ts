import { Color, type Node, type Scene } from "three/webgpu";
import { color, Fn, uniform, vec2 } from "three/tsl";

import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

// models
import { Ground } from "../entities/environment/ground";
import { Grass, LongGrass, LongGrass2 } from "../entities/environment/grass";
import { Water } from "../entities/environment/water";
import { House } from "../entities/environment/house";
import { Rocks } from "../entities/environment/rocks";
import { Bush3 } from "@/entities/environment/bush";
import { SeaCreatures } from "@/entities/environment/seaCreatures";
import { Trees } from "@/entities/environment/tree";
import { WillowTree } from "@/entities/environment/willowtree";
import { Flowers } from "@/entities/environment/flowers";
import { Bridge } from "@/entities/environment/bridge";
import { Sky } from "@/entities/environment/sky";

const CONFIG = {
  WORLD_SIZE: 150,
  COLOR: {
    GH: uniform(new Color("#75b32f")), // Ground High
    GL: uniform(new Color("#E7C1AE")), // Ground Low
    WH: uniform(new Color("#0ab4ba")), // Water High
    WL: uniform(new Color("#0077aa")), // Water Low

    TT: uniform(color("#94fe8f")), // Tree Top
    TB: uniform(color("#8afaff")) // Tree Bottom
  }
} as const;

export type TConfig = typeof CONFIG;

export class World {
  constructor(
    private scene: Scene,
    private gui: GUI
  ) {
    // Ground decorations
    new Grass(scene, gui, CONFIG);
    new LongGrass(scene, gui, CONFIG);
    new LongGrass2(scene, gui, CONFIG);
    new Ground(scene, gui, CONFIG);
    new Flowers(scene, gui);
    new Rocks(scene, CONFIG);
    new SeaCreatures(scene);

    new Water(scene, CONFIG, gui);

    // Objects
    new House(scene, gui);
    new Bridge(scene);

    // Trees

    new Bush3(scene, gui, CONFIG);
    new WillowTree(scene, gui);
    new Trees(scene, gui, CONFIG);
    new Sky(scene);

    // new AGrass(scene, gui, CONFIG);
  }
}

export const getScaledUV = Fn(({ iPos, size }: { iPos: Node; size?: { x: number; z: number } }) => {
  if (size) {
    return vec2(iPos.x.div(size.x).add(0.5), iPos.z.negate().div(size.z).add(0.5));
  } else return vec2(iPos.x.div(CONFIG.WORLD_SIZE).add(0.5), iPos.z.negate().div(CONFIG.WORLD_SIZE).add(0.5));
});
