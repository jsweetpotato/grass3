import * as THREE from "three/webgpu";

import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { color, materialColor, mix, positionLocal } from "three/tsl";
import type { TConfig } from "../../world/World";
import { Assets } from "@/core/resources";
import { getModelSize, getWorldTransform } from "@/utils";
import RAPIER from "@dimforge/rapier3d-compat";
import { PhysicsSystem } from "@/systems/PhysicsSystem";
export class Rocks {
  private matrix = new THREE.Matrix4();
  private position = new THREE.Vector3();
  private rotation = new THREE.Quaternion();
  private scale = new THREE.Vector3();
  private tempVertex = new THREE.Vector3();
  private worldScale = new THREE.Vector3();

  constructor(
    private scene: THREE.Scene,
    private CONFIG: TConfig
  ) {
    const { rocks } = Assets.get();

    rocks.scene.traverse((v) => {
      if (!(v instanceof THREE.Object3D) || v instanceof THREE.Group) return;

      // v.castShadow = true;
      v.receiveShadow = true;

      if (v instanceof THREE.InstancedMesh) {
        v.updateMatrixWorld();

        // return;
        // ★ 2. [초특급 최적화] 정점 배열(TypedArray)을 반복문 '바깥'에서 딱 한 번만 만듭니다!
        // Rapier는 값을 복사해서 쓰기 때문에, 하나의 배열을 재사용하면서 값만 덮어씌우는 것이 수백 배 빠릅니다.
        const positionAttribute = v.geometry.attributes.position;
        const vertexCount = positionAttribute.count;

        const scaledVertices = new Float32Array(vertexCount * 3);

        for (let i = 0; i < v.count; i++) {
          v.getMatrixAt(i, this.matrix);
          this.matrix.premultiply(v.matrixWorld);
          this.matrix.decompose(this.position, this.rotation, this.scale);

          // 이미 만들어진 scaledVertices 메모리 공간에 곱셈 결과만 덮어씌웁니다. (새로운 할당 없음)

          for (let j = 0; j < vertexCount; j++) {
            this.tempVertex.fromBufferAttribute(positionAttribute, j);
            scaledVertices[j * 3] = this.tempVertex.x * this.scale.x;
            scaledVertices[j * 3 + 1] = this.tempVertex.y * this.scale.y;
            scaledVertices[j * 3 + 2] = this.tempVertex.z * this.scale.z;
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

      // --- [2] 일반 Mesh 최적화 및 잠재적 버그 수정 ---
      if (v instanceof THREE.Mesh) {
        v.updateMatrixWorld(true);

        const positionAttribute = v.geometry.attributes.position;
        const indexAttribute = v.geometry.index; // ★ 압축 모델의 핵심 (번호표)

        // 정점의 실제 개수 (인덱스가 있으면 인덱스 개수, 없으면 전체 포지션 개수)
        const pointCount = indexAttribute ? indexAttribute.count : positionAttribute.count;
        const worldVertices = new Float32Array(pointCount * 3);

        for (let i = 0; i < pointCount; i++) {
          // ★ 핵심: 인덱스가 존재하면 번호표가 가리키는 진짜 정점을, 없으면 순서대로(i) 가져옵니다.
          const vertexIndex = indexAttribute ? indexAttribute.getX(i) : i;

          // 거대한 공유 배열에서 내 바위에 해당하는 점만 쏙 빼옵니다.
          this.tempVertex.fromBufferAttribute(positionAttribute, vertexIndex);

          // 그 점을 절대 월드 좌표로 변환합니다.
          this.tempVertex.applyMatrix4(v.matrixWorld);

          worldVertices[i * 3] = this.tempVertex.x;
          worldVertices[i * 3 + 1] = this.tempVertex.y;
          worldVertices[i * 3 + 2] = this.tempVertex.z;
        }

        // 완성된 '내 바위만의' 정점으로 콜라이더 생성!
        const colliderDesc = RAPIER.ColliderDesc.convexHull(worldVertices);

        if (!colliderDesc) return;

        // 🚨 절대 setTranslation 이나 setRotation을 하지 마세요!
        // 이미 applyMatrix4를 통해 정점들이 올바른 월드 위치로 가 있습니다.
        PhysicsSystem.World.createCollider(colliderDesc);
      }
    });

    this.scene.add(rocks.scene);
  }
}
