// Player.ts
import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";
import { AnimationController, getModelSize, getWorldTransform } from "@/utils";
import { PhysicsSystem } from "@/systems/PhysicsSystem";
import { Assets } from "@/core/resources";
import { lerpAngle } from "@/utils/math";
import { inputManager } from "@/systems/InputSystem";
import { eventBus } from "@/core/EventBus";
import { CameraSystem } from "@/systems/CameraSystem";
import { gameState } from "@/state/gameState";

export class Player {
  mesh!: THREE.Group<THREE.Object3DEventMap>;

  rigidBody!: RAPIER.RigidBody;

  currentTool: THREE.Object3D | null = null;
  currentToolBody!: RAPIER.RigidBody;

  mixer!: THREE.AnimationMixer;
  action!: THREE.AnimationAction;

  isMove = false;

  private clock = gameState.clock;

  private container = new THREE.Group();
  private animeController!: AnimationController;
  private currentActionName: string = "";

  private characterRotationTarget = 0;
  private speed = 0;

  private readonly WALK_SPEED = 4;
  private readonly RUN_SPEED = 9;

  get rotationTarget() {
    return this.characterRotationTarget;
  }

  constructor(private scene: THREE.Scene) {
    // 시각

    const { man } = Assets.get();

    const gltf = man;

    this.mesh = gltf.scene;
    this.mesh.scale.setScalar(0.05);
    this.mesh.position.y = -1;

    this.mesh.traverse((v) => {
      if (v instanceof THREE.Object3D) {
        v.castShadow = true;
        v.receiveShadow = true;
      }
    });

    // const geo = new THREE.BoxGeometry(0.5, 1, 0.5);
    // const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    // this.mesh = new THREE.Mesh(geo, mat);

    scene.add(this.container);
    this.container.add(this.mesh);

    this.rigidBody = PhysicsSystem.createPlayer(new THREE.Vector3(0, 4, 0));
    this.rigidBody.lockRotations(true, true);

    this.animeController = new AnimationController(this.mesh, gltf.animations);

    eventBus.on("update", this.update);

    // this.createTools();
  }

  // jump(impulse: number) {
  //   this.body.applyImpulse({ x: 0, y: impulse, z: 0 }, true);
  // }

  // update(delta: number) {
  //   if (!this.mesh) return;
  //   const pos = this.rigidBody.translation();
  //   const rotY = this.rigidBody.rotation().y;
  //   this.mesh.position.set(pos.x, pos.y, pos.z);
  //   this.mesh.rotation.y = rotY;

  //   if (this.currentTool) {
  //     this.currentTool.position.set(pos.x, pos.y, pos.z + 0.8);
  //     this.currentTool.rotateY(rotY);

  //     const { position, quaternion } = getWorldTransform(this.currentTool);
  //     position.add({ x: 0, y: 0.5, z: 0.25 });
  //     this.currentToolBody.setTranslation(position, true);
  //     this.currentToolBody.setRotation(quaternion, true);

  //     this.mixer.update(delta);
  //   }
  // }

  playerMove(delta: number) {
    if (!this.mesh) return;

    const move = { x: 0, z: 0 };

    if (inputManager.isForward()) move.z = -1;
    if (inputManager.isBackward()) move.z = 1;
    if (inputManager.isLeftward()) move.x = -1;
    if (inputManager.isRightward()) move.x = 1;

    const vel = this.rigidBody.linvel();

    if (move.x !== 0 || move.z !== 0) {
      this.isMove = true;
      inputManager.isRun() ? (this.speed = this.RUN_SPEED) : (this.speed = this.WALK_SPEED);

      const inputAngle = Math.atan2(move.x, move.z);
      this.characterRotationTarget = CameraSystem.cameraRotation + inputAngle;

      move.x = Math.sin(this.characterRotationTarget) * this.speed;
      move.z = Math.cos(this.characterRotationTarget) * this.speed;
    } else {
      this.isMove = false;
    }

    const lerpFactor = 1 - Math.exp(-7 * delta);

    this.mesh.rotation.y = lerpAngle(this.mesh.rotation.y, this.characterRotationTarget, lerpFactor);
    this.rigidBody.setLinvel({ x: move.x, y: vel.y, z: move.z }, true);

    const rbPos = this.rigidBody.translation();
    this.container.position.set(rbPos.x, rbPos.y, rbPos.z);
  }

  playerAnimation = (delta: number) => {
    if (this.isMove) {
      if (inputManager.isRun()) {
        this.animeController.play("run", 0.2);
      } else {
        this.animeController.play("walk", 0.2);
      }
    } else {
      this.animeController.play("idle", 0.2);
    }

    this.animeController.update(delta);
  };

  update = (delta: number) => {
    this.playerMove(delta);
    this.playerAnimation(delta);
  };

  getPosition(): THREE.Vector3 {
    const pos = this.rigidBody.translation();
    return new THREE.Vector3(pos.x, pos.y, pos.z);
  }

  // createTools() {
  //   const { axe } = Assets.get();
  //   if (!axe || axe.status === "rejected") return;

  //   const model = axe.value;

  //   const animation = model.animations[0];
  //   const mesh = model.scene.children[0] as THREE.Mesh;

  //   this.mixer = new THREE.AnimationMixer(mesh);
  //   this.action = this.mixer.clipAction(animation);
  //   this.action.setLoop(THREE.LoopOnce, 1);

  //   const size = getModelSize(mesh);

  //   const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased();
  //   const rigidBody = PhysicsSystem.World.createRigidBody(rigidBodyDesc);
  //   const colliderDesc = RAPIER.ColliderDesc.cuboid(size.x, size.y, size.z);
  //   const collider = PhysicsSystem.World.createCollider(colliderDesc, rigidBody);

  //   const GROUP_PLAYER = 0x0001; // 비트 1 (십진수 1)
  //   const GROUP_TOOL = 0x0002; // 비트 2 (십진수 2)
  //   const GROUP_WORLD = 0x0004; // 비트 3 (십진수 4) - 벽, 바닥 등
  //   const ALL_GROUPS = 0xffff;

  //   const playerGroups = PhysicsSystem.interactionGroups(GROUP_TOOL, ALL_GROUPS ^ GROUP_PLAYER);

  //   // collider.setCollisionGroups(playerGroups);s

  //   this.currentTool = mesh;
  //   this.currentToolBody = rigidBody;

  //   this.scene.add(this.currentTool);
  // }

  // attack() {
  //   this.action.stop();
  //   this.action.play();
  // }
}
