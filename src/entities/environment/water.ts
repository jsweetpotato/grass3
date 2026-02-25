import { Assets } from "@/core/resources";
import * as THREE from "three/webgpu";
import { getScaledUV, type TConfig } from "../../world/World";
import { color, distance, length, positionWorld, reflector, texture, time, uv, vec2 } from "three/tsl";

export class Water {
  constructor(
    private scene: THREE.Scene,
    private CONFIG: TConfig
  ) {
    const { depth } = Assets.get();

    const geometry = new THREE.BoxGeometry(400, 0.001, 400, 1, 1, 1);
    const material = new THREE.MeshLambertNodeMaterial({
      transparent: true,
    });

    const reflection = reflector({
      // @ts-ignore
      resolutionScale: 0.7,
      depth: true,
      bounces: false,
    });
    reflection.getDepthNode().toVar();

    reflection.target.rotateX(-Math.PI / 2);
    this.scene.add(reflection.target);
    const scaledUV = vec2(uv().x.mul(2.6).sub(0.8), uv().y.mul(2.6).sub(0.8));
    const terrainDataBlue = texture(depth, scaledUV).b.toVar();

    const timec = time.mul(0.1);
    const waveFrequency = terrainDataBlue.add(timec).mul(10);
    const wavePattern = waveFrequency.mod(1);
    const compensatedWave = wavePattern.sub(terrainDataBlue);
    const surfaceWaves = compensatedWave.remapClamp(0.2, 1, 0, 2);

    material.colorNode = surfaceWaves;

    const opacity = terrainDataBlue.pow(10).remapClamp(0, 1, 1, 0);

    material.opacityNode = opacity;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -4.5;

    this.scene.add(mesh);

    const overlayMesh = this.createOverlay();
    this.scene.add(overlayMesh);
  }

  createOverlay() {
    const d = 60;
    const hgt = -4.45;
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

    const vec = new THREE.Vector3();
    const matrix = new THREE.Matrix4();

    const overlayGeo = new THREE.PlaneGeometry(d, d);
    overlayGeo.rotateX(-Math.PI * 0.5);
    const overlayMat = new THREE.MeshBasicNodeMaterial({ transparent: true });
    const overlayAlpha = distance(vec2(0, 0), positionWorld.xz.div(d * 1.5))
      .oneMinus()
      .toVar();

    overlayMat.colorNode = this.CONFIG.COLOR.WH;
    overlayMat.opacityNode = overlayAlpha;

    const overlayMesh = new THREE.InstancedMesh(overlayGeo, overlayMat, pos.length);

    for (let i = 0; i < pos.length; i++) {
      const posistion = pos[i];
      vec.set(posistion.x, posistion.y, posistion.z);

      matrix.setPosition(vec);

      overlayMesh.setMatrixAt(i, matrix);
    }

    return overlayMesh;
  }
}
