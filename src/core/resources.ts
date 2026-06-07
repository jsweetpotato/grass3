import type { T_LoadedResources } from "@/systems/LoadSystem";

export const resources = [
  /*  Models */
  { name: "axe", path: "/models/axe.glb", type: "object" },
  { name: "firewood", path: "/models/firewood.glb", type: "object" },

  { name: "stump", path: "/models/stumpsRe.glb", type: "object" },
  { name: "grass_lev_1", path: "models/blade_level_1.glb", type: "object" },
  { name: "grass_lev_2", path: "models/blade_level_2.glb", type: "object" },
  { name: "grass_lev_3", path: "models/blade_level_3.glb", type: "object" },
  { name: "ground", path: "/models/ground.glb", type: "object" },
  { name: "cooking", path: "/models/cooking.glb", type: "object" },
  { name: "willow_tree", path: "/models/willow_tree.glb", type: "object" },

  { name: "house", path: "/models/house.glb", type: "object" },
  { name: "house_collider", path: "/models/house_collider.glb", type: "object" },

  { name: "bridge", path: "/models/bridgeRe.glb", type: "object" },
  { name: "bridge_collider", path: "/models/bridge_collider.glb", type: "object" },
  { name: "rocks", path: "/models/rocks2.glb", type: "object" },
  { name: "man", path: "/models/character.glb", type: "object" },

  { name: "starfish", path: "/models/starfishRe.glb", type: "object" },
  { name: "seashell", path: "/models/seashellRe.glb", type: "object" },
  { name: "trees", path: "/models/treesRe.glb", type: "object" },
  { name: "big_tree", path: "/models/big_treeRe.glb", type: "object" },

  // Bush

  { name: "bush_test3", path: "/models/bush_metaball.glb", type: "object" },
  { name: "foreign", path: "/models/foreign.glb", type: "object" },

  // Ect
  { name: "flowers", path: "/models/flowers_re.glb", type: "object" },
  { name: "arround_wood_grass", path: "/models/longgrass_w.glb", type: "object" },

  /* Texture Image */
  { name: "perlin_noise", path: "/images/Noise.png", type: "image" },
  { name: "background", path: "/images/bg2.png", type: "image" },

  { name: "depth", path: "/images/depth.png", type: "image" },
  { name: "long_grass", path: "/images/longgrass.png", type: "image" },
  { name: "willow_leaf", path: "/images/leaf7.png", type: "image" },
  { name: "mask", path: "/images/mask.png", type: "image" },
  { name: "bush_alpha_1", path: "/images/leaf1.png", type: "image" },
  { name: "bush_alpha_2", path: "/images/leaf2.png", type: "image" },
  { name: "bush_alpha_3", path: "/images/leaf3.png", type: "image" },
  { name: "bush_alpha_4", path: "/images/leaf4.png", type: "image" },
  { name: "flower_alpha", path: "/images/flower.png", type: "image" }
] as const;

export class Assets {
  private static _resources: T_LoadedResources;

  private constructor() {}

  public static init(assets: T_LoadedResources) {
    this._resources = assets;
  }

  public static get(): T_LoadedResources {
    if (!this._resources) {
      throw new Error("❌ Assets not initialized! Call Assets.init() first.");
    }
    return this._resources;
  }
}
