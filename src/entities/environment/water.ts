import {
  BoxGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicNodeMaterial,
  MeshLambertNodeMaterial,
  MeshStandardNodeMaterial,
  PlaneGeometry,
  Vector3,
  type Scene,
} from "three/webgpu";
import {
  color,
  distance,
  float,
  Fn,
  mix,
  positionWorld,
  rangeFogFactor,
  reflector,
  sample,
  step,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec4,
} from "three/tsl";

// managerts
import { Assets } from "@/core/resources";

// types
import type { TConfig } from "@/world/World";
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { hashBlur } from "three/examples/jsm/tsl/display/hashBlur.js";
export class Water {
  private unifoms = {
    uv_scale_x: uniform(float(2.79)),
    uv_scale_y: uniform(float(2.73)),
  };
  constructor(
    private scene: Scene,
    private CONFIG: TConfig,
    private gui: GUI,
  ) {
    const waveMesh = this.createWave();
    // const overlayMesh = this.createOverlay();
    // const rockWaveMesh = this.createRockWave();
    this.scene.add(waveMesh);
    // this.scene.add(rockWaveMesh);
    // this.scene.add(overlayMesh);
  }

  createWave() {
    const { water_mask: depth } = Assets.get();

    const geometry = new BoxGeometry(400, 0.001, 400, 1, 1, 1);
    const material = new MeshLambertNodeMaterial({
      transparent: true,
    });

    const waterGUI = this.gui.addFolder("water");

    waterGUI
      .add(this.unifoms.uv_scale_x, "value", 0, 5, 0.01)
      .name("uv scale x");
    waterGUI
      .add(this.unifoms.uv_scale_y, "value", 0, 5, 0.01)
      .name("uv scale y");

    const centeredUV = uv()
      .sub(0.5) // 0~1 → -0.5~0.5 (중심이 원점)
      .mul(vec2(this.unifoms.uv_scale_x, this.unifoms.uv_scale_y)) // 스케일
      .add(0.5);
    const terrainDataBlue = texture(depth, centeredUV).b.toVar();

    const timec = time.mul(0.1);
    const waveFrequency = terrainDataBlue.sub(timec).mul(10);
    const wavePattern = waveFrequency.mod(1);
    const compensatedWave = wavePattern.sub(terrainDataBlue);
    const surfaceWaves = compensatedWave
      .remapClamp(0.2, 1, 0, 2)
      .add(color("#00bbff"));

    material.opacityNode = terrainDataBlue.pow(2);

    material.colorNode = color("#00bbff");
    // material.alphaTestNode = step(0.1);
    const mesh = new Mesh(geometry, material);
    mesh.position.y = -5.5;

    return mesh;
  }

  createRockWave() {
    const { water_mask_rock: depth } = Assets.get();

    const geometry = new PlaneGeometry(400, 400, 1, 1);
    geometry.rotateX(-Math.PI / 2);

    const material = new MeshBasicNodeMaterial();

    const centeredUV = uv()
      .sub(0.5) // 0~1 → -0.5~0.5 (중심이 원점)
      .mul(vec2(this.unifoms.uv_scale_x, this.unifoms.uv_scale_y)) // 스케일
      .add(0.5);
    const terrainDataBlue = texture(depth, centeredUV).b.toVar();

    material.colorNode = terrainDataBlue;

    const mesh = new Mesh(geometry, material);
    mesh.position.y = -4.9;

    return mesh;
  }

  createOverlay() {
    const d = 60;
    const hgt = -4.49;
    const pos = [
      { x: d, y: hgt, z: 0 }, // o
      { x: -d, y: hgt, z: 0 }, // o
      { x: -d, y: hgt, z: d }, // o
      { x: d, y: hgt, z: d }, // o
      { x: -d, y: hgt, z: -d }, // o
      { x: d, y: hgt, z: -d },
      { x: 0, y: hgt, z: -d }, // o
      { x: 0, y: hgt, z: d },
    ];

    const vec = new Vector3();
    const matrix = new Matrix4();

    const overlayGeo = new PlaneGeometry(d, d);
    overlayGeo.rotateX(-Math.PI * 0.5);
    const overlayMat = new MeshBasicNodeMaterial({ transparent: true });
    const overlayAlpha = distance(vec2(0, 0), positionWorld.xz.div(d * 1.5))
      .oneMinus()
      .toVar();

    overlayMat.colorNode = this.CONFIG.COLOR.WH;
    overlayMat.opacityNode = overlayAlpha;

    const overlayMesh = new InstancedMesh(overlayGeo, overlayMat, pos.length);

    for (let i = 0; i < pos.length; i++) {
      const posistion = pos[i];
      vec.set(posistion.x, posistion.y, posistion.z);

      matrix.setPosition(vec);

      overlayMesh.setMatrixAt(i, matrix);
    }

    return overlayMesh;
  }
}
