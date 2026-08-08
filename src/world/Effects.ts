import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  Camera,
  CineonToneMapping,
  LinearToneMapping,
  NeutralToneMapping,
  NoToneMapping,
  PostProcessing,
  ReinhardToneMapping,
  UnsignedByteType,
  type Scene
} from "three/webgpu";
import { pass, mrt, output, emissive, rangeFogFactor, cameraFar, vec4, uniform, toneMapping } from "three/tsl";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";

import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

export class Effects {
  constructor(scene: Scene, camera: Camera, postProcessing: PostProcessing, gui: GUI) {
    const scenePass = pass(scene, camera);

    const mrtNode = mrt({
      output: output,
      emissive: vec4(emissive, output.a)
    });

    scenePass.setMRT(mrtNode);

    const scenePassViewZ = scenePass.getViewZNode().toVar();

    const scenePassColor = scenePass.getTextureNode().toVar();

    const emissiveTexture = scenePass.getTexture("emissive");
    emissiveTexture.type = UnsignedByteType;

    const emissivePass = scenePass.getTextureNode("emissive");

    const bloomPass = bloom(emissivePass);

    const effectGUI = gui.addFolder("Effects");
    const bloomGUI = effectGUI.addFolder("Bloom");

    bloomGUI.add(bloomPass.strength, "value", 0, 10, 0.01).name("strength");
    bloomGUI.add(bloomPass.radius, "value", 0, 1, 0.01).name("radius");
    bloomGUI.add(bloomPass.threshold, "value", 0, 1, 0.01).name("threshold");

    const toneMappings = {
      ACES: ACESFilmicToneMapping,
      none: NoToneMapping,
      Cineon: CineonToneMapping,
      Neutral: NeutralToneMapping,
      Linear: LinearToneMapping,
      Reinhard: ReinhardToneMapping,
      AgX: AgXToneMapping
    };

    const outputColor = scenePassColor.add(bloomPass);
    postProcessing.outputNode = outputColor.toVar().renderOutput(ACESFilmicToneMapping);

    const params: { toneMapping: keyof typeof toneMappings } = { toneMapping: "ACES" };
    (effectGUI as any).add(params, "toneMapping", Object.keys(toneMappings)).onChange((v: keyof typeof toneMappings) => {
      postProcessing.outputNode = outputColor.renderOutput(toneMappings[v]);
      postProcessing.needsUpdate = true;
    });

    const fogFactor = rangeFogFactor(20, 400)
      .context({ getViewZ: () => scenePassViewZ })
      .smoothstep(0, cameraFar.sub(100));
  }
}
