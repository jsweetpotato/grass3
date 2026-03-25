import * as THREE from "three/webgpu";

import { Assets } from "@/core/resources";
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { eventBus } from "@/core/EventBus";
import { color, materialColor, mix, positionLocal } from "three/tsl";
import type { TConfig } from "@/world/World";
import { PhysicsSystem } from "@/systems/PhysicsSystem";
import RAPIER from "@dimforge/rapier3d-compat";
import { getWorldTransform } from "@/utils";

export class Trees {
  constructor(scene: THREE.Scene, gui: GUI, config: TConfig) {
    const { trees, big_tree } = Assets.get();

    const dummyMat = new THREE.Matrix4();
    const dummyObj = new THREE.Object3D();

    const colliderDesc = RAPIER.ColliderDesc.cylinder(3, 0.3);

    trees.scene.traverse((v) => {
      if (v instanceof THREE.Object3D) {
        v.castShadow = true;
        v.receiveShadow = true;
      }

      if (v instanceof THREE.InstancedMesh) {
        const trees_data: number[] = [];

        v.material.colorNode = mix(materialColor, config.COLOR.GH, positionLocal.y.smoothstep(0.5, 0.1));

        for (let i = 0; i < v.count; i++) {
          v.getMatrixAt(i, dummyMat);

          dummyMat.decompose(dummyObj.position, dummyObj.quaternion, dummyObj.scale);

          const collider = PhysicsSystem.World.createCollider(colliderDesc);
          collider.setTranslation({ x: dummyObj.position.x, y: 0, z: dummyObj.position.z });

          trees_data[i * 4] = dummyObj.position.x;
          trees_data[i * 4 + 1] = dummyObj.position.y;
          trees_data[i * 4 + 2] = dummyObj.position.z;
          trees_data[i * 4 + 3] = dummyObj.scale.x;
        }
        eventBus.emit("trees:update", trees_data);
      }
    });

    const bigTree = big_tree.scene.children[0];

    bigTree.castShadow = true;

    if (bigTree instanceof THREE.Mesh) {
      const tempVertex = new THREE.Vector3();

      const positionattribute = bigTree.geometry.attributes.position;
      const indecisattribue = bigTree.geometry.index;

      const vertexCount = positionattribute.count;

      const scaledVertices = new Float32Array(vertexCount * 3);

      const worldScale = new THREE.Vector3();

      bigTree.getWorldScale(worldScale);

      for (let i = 0; i < vertexCount; i++) {
        tempVertex.fromBufferAttribute(positionattribute, i);
        tempVertex.applyMatrix4(bigTree.matrixWorld);
        scaledVertices[i * 3 + 0] = tempVertex.x;
        scaledVertices[i * 3 + 1] = tempVertex.y;
        scaledVertices[i * 3 + 2] = tempVertex.z;
      }

      const colliderDesc = RAPIER.ColliderDesc.trimesh(scaledVertices, indecisattribue.array);

      if (!colliderDesc) return;
      PhysicsSystem.World.createCollider(colliderDesc);
    }

    scene.add(trees.scene, big_tree.scene);
  }
}
