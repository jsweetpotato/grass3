import { Camera, PostProcessing, UnsignedByteType, type Scene } from "three/webgpu";
import { pass, mrt, output, emissive, rangeFogFactor, cameraFar, vec4 } from "three/tsl";
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

    const bloomGUI = gui.addFolder("bloomGUI");

    bloomGUI.add(bloomPass.strength, "value", 0, 10, 0.01).name("strength");
    bloomGUI.add(bloomPass.radius, "value", 0, 1, 0.01).name("radius");
    bloomGUI.add(bloomPass.threshold, "value", 0, 1, 0.01).name("threshold");

    const fogFactor = rangeFogFactor(20, 400)
      .context({ getViewZ: () => scenePassViewZ })
      .smoothstep(0, cameraFar.sub(100));

    postProcessing.outputNode = scenePassColor.add(bloomPass).renderOutput();
  }
}
