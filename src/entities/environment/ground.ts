import { Euler, Mesh, MeshLambertNodeMaterial, Quaternion, Scene } from "three/webgpu";
import { positionLocal, positionWorld, texture, uniform, vec2 } from "three/tsl";
import RAPIER from "@dimforge/rapier3d-compat";

import { data } from "@/core/Data";
import { Assets } from "@/core/resources";
import { PhysicsSystem } from "@/systems/PhysicsSystem";

import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import type { TConfig } from "../../world/World";

export class Ground {
  SEGEMENT = 63; // 32 -1
  world = PhysicsSystem.World;
  constructor(
    private scene: Scene,
    gui: GUI,
    CONFIG: TConfig
  ) {
    // Collider

    const rot = new Quaternion().setFromEuler(new Euler(0, Math.PI, 0));

    const ColliderDesc = RAPIER.ColliderDesc.heightfield(this.SEGEMENT, this.SEGEMENT, new Float32Array(data.GROUND_HEIGHT_FLOAT), {
      x: 170,
      y: 1,
      z: 170
    });

    // ColliderDesc.setRotation(rot);

    const collider = this.world.createCollider(ColliderDesc);

    // Ground Model

    const { ground } = Assets.get();

    const model = ground.scene.children[0] as Mesh;

    const mat = new MeshLambertNodeMaterial();

    const remapedY = positionLocal.y.remapClamp(-12, 1, 0, 1);

    const { mask } = Assets.get();

    const offset = uniform(143.46);
    gui.add(offset, "value", 0, 200, 0.01);

    const scaledUV = vec2(positionWorld.x, positionWorld.z.negate()).div(offset).add(0.5);

    const maskT = texture(mask, scaledUV).r.toVar();

    const grassLevel = remapedY.remapClamp(0.7, 1, 0, 1.5).mul(maskT);
    const groundLevel = remapedY.remapClamp(0.160128, 0.847432, 0, 1).sub(grassLevel);
    const deepWaterLevel = remapedY.remapClamp(0.3, 0, 0, 1);
    const waterLevel = remapedY.remapClamp(0.847432, 0.160128, 0, 1).sub(deepWaterLevel);

    const groundColor = grassLevel.mul(CONFIG.COLOR.GH).add(groundLevel.mul(CONFIG.COLOR.GL));
    const waterColor = waterLevel.mul(CONFIG.COLOR.WH).add(deepWaterLevel.mul(CONFIG.COLOR.WL));

    const finalColor = waterColor.add(groundColor).toVar();

    mat.colorNode = finalColor;
    model.receiveShadow = true;
    model.material = mat;

    scene.add(model);

    // groundg eometry의 가장자리를 좀 더 많이!! 키우자!!!
  }
}
