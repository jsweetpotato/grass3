import { Group, InstancedMesh, Matrix4, Mesh, Object3D, Quaternion, Scene, Vector3 } from "three/webgpu";

import RAPIER from "@dimforge/rapier3d-compat";

// managers
import { Assets } from "@/core/resources";
import { PhysicsSystem } from "@/systems/PhysicsSystem";

// types
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import type { TConfig } from "../../world/World";
export class Rocks {
  private matrix = new Matrix4();
  private position = new Vector3();
  private rotation = new Quaternion();
  private scale = new Vector3();

  constructor(
    private scene: Scene,
    private CONFIG: TConfig
  ) {
    const { rocks } = Assets.get();

    rocks.scene.traverse((v) => {
      if (!(v instanceof Object3D) || v instanceof Group) return;

      v.receiveShadow = true;

      if (v instanceof InstancedMesh) {
        v.updateMatrixWorld();

        const positionAttribute = v.geometry.attributes.position;
        const posArray = positionAttribute.array;
        const vertexCount = positionAttribute.count;

        const scaledVertices = new Float32Array(vertexCount * 3);

        for (let i = 0; i < v.count; i++) {
          v.getMatrixAt(i, this.matrix);
          this.matrix.premultiply(v.matrixWorld);
          this.matrix.decompose(this.position, this.rotation, this.scale);

          const sx = this.scale.x;
          const sy = this.scale.y;
          const sz = this.scale.z;

          for (let j = 0; j < vertexCount; j++) {
            const idx = j * 3;
            scaledVertices[idx + 0] = posArray[idx + 0] * sx;
            scaledVertices[idx + 1] = posArray[idx + 1] * sy;
            scaledVertices[idx + 2] = posArray[idx + 2] * sz;
          }

          const colliderDesc = RAPIER.ColliderDesc.convexHull(scaledVertices);

          if (!colliderDesc) {
            console.warn(`[${v.name}] ${i}번째 인스턴스 콜라이더 생성 실패`);
            continue;
          }

          const collider = PhysicsSystem.World.createCollider(colliderDesc);
          collider.setTranslation(this.position);
          collider.setRotation(this.rotation);
        }
        return;
      }

      if (v instanceof Mesh) {
        v.updateMatrixWorld(true);

        const positionAttribute = v.geometry.attributes.position;
        const posArray = positionAttribute.array;
        const vertexCount = positionAttribute.count;

        const worldVertices = new Float32Array(vertexCount * 3);

        const elements = v.matrixWorld.elements;
        const e0 = elements[0],
          e4 = elements[4],
          e8 = elements[8],
          e12 = elements[12];
        const e1 = elements[1],
          e5 = elements[5],
          e9 = elements[9],
          e13 = elements[13];
        const e2 = elements[2],
          e6 = elements[6],
          e10 = elements[10],
          e14 = elements[14];

        for (let i = 0, j = 0; i < vertexCount; i++, j += 3) {
          const x = posArray[j + 0];
          const y = posArray[j + 1];
          const z = posArray[j + 2];

          worldVertices[j + 0] = e0 * x + e4 * y + e8 * z + e12;
          worldVertices[j + 1] = e1 * x + e5 * y + e9 * z + e13;
          worldVertices[j + 2] = e2 * x + e6 * y + e10 * z + e14;
        }

        const colliderDesc = RAPIER.ColliderDesc.convexHull(worldVertices);

        if (!colliderDesc) return;
        PhysicsSystem.World.createCollider(colliderDesc);
      }
    });

    this.scene.add(rocks.scene);
  }
}
