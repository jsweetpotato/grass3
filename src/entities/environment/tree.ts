import { InstancedMesh, Matrix4, Mesh, Object3D, Scene, Vector3 } from "three/webgpu";
import { materialColor, mix, positionLocal } from "three/tsl";
import RAPIER from "@dimforge/rapier3d-compat";

// managers
import { Assets } from "@/core/resources";
import { eventBus } from "@/core/EventBus";
import { PhysicsSystem } from "@/systems/PhysicsSystem";

// types
import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import type { TConfig } from "@/world/World";

export class Trees {
  constructor(scene: Scene, gui: GUI, config: TConfig) {
    const { trees, big_tree } = Assets.get();

    const colliderDesc = RAPIER.ColliderDesc.cylinder(3, 0.3);

    trees.scene.traverse((v) => {
      // Object3D 속성 적용 (InstancedMesh도 Object3D를 상속하므로 여기서 다 처리됨)
      if (v instanceof Object3D) {
        v.castShadow = true;
        v.receiveShadow = true;
      }

      if (v instanceof InstancedMesh) {
        // 1. 일반 배열(number[]) 대신 V8 엔진이 가장 좋아하는 고정 크기 Float32Array 사용
        const trees_data = new Float32Array(v.count * 4);

        v.material.colorNode = mix(materialColor, config.COLOR.GH, positionLocal.y.smoothstep(0.5, 0.1));

        // 2. getMatrixAt() 대신 인스턴스의 원시 행렬 데이터 배열에 직접 접근
        const matrixArray = v.instanceMatrix.array;

        for (let i = 0; i < v.count; i++) {
          // 4x4 행렬이므로 1개의 인스턴스당 16개의 숫자를 차지합니다.
          const mOffset = i * 16;

          // 3. 위치(Position) 추출: 4x4 행렬의 12, 13, 14번째 인덱스가 무조건 x, y, z 위치입니다.
          const px = matrixArray[mOffset + 12];
          const py = matrixArray[mOffset + 13];
          const pz = matrixArray[mOffset + 14];

          // 4. 스케일(Scale X) 추출: 회전이 섞여 있어도 X축 벡터의 길이(magnitude)를 구하면 완벽한 Scale X가 나옵니다.
          const m11 = matrixArray[mOffset + 0];
          const m21 = matrixArray[mOffset + 1];
          const m31 = matrixArray[mOffset + 2];
          const scaleX = Math.sqrt(m11 * m11 + m21 * m21 + m31 * m31);

          // 무거운 객체 생성(dummyObj) 없이 추출한 원시 숫자(Primitive Number)를 바로 물리 엔진에 주입
          const collider = PhysicsSystem.World.createCollider(colliderDesc);
          collider.setTranslation({ x: px, y: 0, z: pz });

          // Float32Array에 직접 할당
          const dOffset = i * 4;
          trees_data[dOffset + 0] = px;
          trees_data[dOffset + 1] = py;
          trees_data[dOffset + 2] = pz;
          trees_data[dOffset + 3] = scaleX;
        }

        // Float32Array 통째로 이벤트 버스에 전송 (메모리 전송 효율 극대화)
        eventBus.emit("trees:update", trees_data);
      }
    });

    const bigTree = big_tree.scene.children[0];

    bigTree.castShadow = true;

    if (bigTree instanceof Mesh) {
      const tempVertex = new Vector3();

      const positionattribute = bigTree.geometry.attributes.position;
      const indecisattribue = bigTree.geometry.index;

      const vertexCount = positionattribute.count;

      const scaledVertices = new Float32Array(vertexCount * 3);

      const worldScale = new Vector3();

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
