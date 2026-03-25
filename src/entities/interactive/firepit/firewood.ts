import * as THREE from "three/webgpu";
import RAPIER from "@dimforge/rapier3d-compat";

import { getModelSize, getWorldTransform } from "@/utils";
import { Assets } from "@/core/resources";
import { PhysicsSystem } from "@/systems/PhysicsSystem";

export class FireWood {
  private size;

  private firewoods = new Set();
  private originTrans = { pos: new Set(), rot: new Set() };

  public rigidBodies = new Set();
  public colliders = new Set();

  private IMPULSSSSSSSSEEEEEE = [
    { x: -10, y: -3, z: 0 },
    { x: 10, y: -3, z: 0 }
  ];

  constructor(
    private scene: THREE.Scene,
    private zonePos: THREE.Vector3
  ) {
    const { firewood } = Assets.get();

    const model = firewood.scene;
    this.size = getModelSize(model.children[0] as THREE.Mesh);
    for (let i = 0; i < model.children.length; i++) this.create(model.children[i]);
  }

  eventInit() {
    // eventBus.on("firepit:firewood:spon", this.spon);
  }

  create(mesh: THREE.Object3D) {
    // 메쉬 변질 방지용
    const copiedMesh = mesh.clone();
    copiedMesh.position.add(this.zonePos);

    // 오리지널 포지션 로테이션 저장
    const { position, quaternion } = getWorldTransform(copiedMesh);

    // 충돌체 생성
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic();
    const rigidBody = PhysicsSystem.World.createRigidBody(rigidBodyDesc);
    rigidBody.setTranslation(position, false);
    rigidBody.setRotation(quaternion, false);

    if (!this.size) return;

    const colliderDesc = RAPIER.ColliderDesc.cuboid(this.size.localSize.x, this.size.localSize.y, this.size.localSize.z);
    const collider = PhysicsSystem.World.createCollider(colliderDesc, rigidBody);

    // Set에 저장
    this.originTrans.pos.add(position);
    this.originTrans.rot.add(quaternion);
    this.rigidBodies.add(rigidBody);
    this.colliders.add(collider);
    this.firewoods.add(copiedMesh);

    rigidBody.setEnabled(false);
    rigidBody.sleep();
    copiedMesh.visible = false;

    this.scene.add(copiedMesh);
  }

  spon = () => {};
}
