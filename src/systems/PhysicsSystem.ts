import { BufferAttribute, BufferGeometry, LineBasicMaterial, LineSegments, Scene, Vector3 } from "three/webgpu";
import RAPIER from "@dimforge/rapier3d-compat";

import { eventBus } from "@/core/EventBus";

import type GUI from "three/examples/jsm/libs/lil-gui.module.min.js";

export class PhysicsSystem {
  private static world: RAPIER.World;
  private static eventQueue: RAPIER.EventQueue;
  private static bodies = new Map<number, string>();

  private static mesh: LineSegments;
  private static debugMode: boolean = false;

  private constructor() {}

  public static async init(scene: Scene, gui: GUI) {
    this.mesh = new LineSegments(
      new BufferGeometry(),
      new LineBasicMaterial({
        color: 0xffffff,
        linewidth: 2,
        vertexColors: true
      })
    );

    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.eventQueue = new RAPIER.EventQueue(true);

    const physicsGUI = gui.addFolder("Physics");
    const config = {
      debug: PhysicsSystem.debugMode
    };

    physicsGUI.add(config, "debug").onFinishChange((v) => (PhysicsSystem.debugMode = v));

    eventBus.on("update", PhysicsSystem.update);
  }

  public static createPlayer(pos: Vector3): RAPIER.RigidBody {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z));

    const collider = this.world.createCollider(RAPIER.ColliderDesc.capsule(0.4, 0.5), body);

    const characterController = this.world.createCharacterController(0.4);
    characterController.enableAutostep(1, 0.4, true);
    characterController.computeColliderMovement(collider, { x: 0, y: 0, z: 0 });
    characterController.enableSnapToGround(0.5);
    characterController.setUp({ x: 0.0, y: 1.0, z: 0.0 });
    characterController.computedMovement();

    const GROUP_PLAYER = 0x0001;
    const GROUP_TOOL = 0x0002;
    const ALL_GROUPS = 0xffff;

    const playerGroups = this.interactionGroups(GROUP_PLAYER, ALL_GROUPS ^ GROUP_TOOL);
    collider.setCollisionGroups(playerGroups);

    return body;
  }

  public static interactionGroups(member: number, filter: number) {
    return (member << 16) | filter;
  }

  public static createZone(name: string, pos: Vector3, radius: number) {
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z));

    const collider = this.world.createCollider(RAPIER.ColliderDesc.cylinder(0.5, radius).setSensor(true), body);

    collider.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    this.bodies.set(collider.handle, name);
  }

  public static update = () => {
    this.world.step(this.eventQueue);

    if (this.debugMode) {
      const buffers = this.world.debugRender();
      this.mesh.geometry.setAttribute("position", new BufferAttribute(buffers.vertices, 3));
      this.mesh.geometry.setAttribute("color", new BufferAttribute(buffers.colors, 4));
      this.mesh.visible = true;
    } else {
      this.mesh.visible = false;
    }

    // this.eventQueue.drainCollisionEvents((h1, h2, started) => {
    //   const zone = this.bodies.get(h1) || this.bodies.get(h2);
    //   if (zone) {
    //     if (started) {
    //       eventBus.emit("zone:enter", { zone });
    //     } else {
    //       eventBus.emit("zone:exit", { zone });
    //     }
    //   }
    // });
  };

  public static get World(): RAPIER.World {
    return this.world;
  }

  public static reset() {
    if (this.world) {
      this.world.free();
    }

    this.bodies.clear();
    this.eventQueue != null;

    if (this.mesh) {
      this.mesh.geometry.dispose();
      // @ts-ignore
      this.mesh.material.dispose();
    }
  }
}
