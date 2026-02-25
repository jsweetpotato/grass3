import "@/systems/lodSystem";
import * as THREE from "three/webgpu";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { Player } from "./entities/player/player";
import { eventBus } from "./core/EventBus";
import { CameraSystem } from "./systems/CameraSystem";
import Loader from "./core/Loaders";

import Firepit from "./entities/interactive/firepit";
import { World } from "./world/World";
import { Cooking } from "./entities/interactive/cooking";
import { Fishing } from "./entities/interactive/fishing";
import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
import { Assets } from "./core/resources";
import { PhysicsSystem } from "./systems/PhysicsSystem";
import { Lights } from "./world/Lights";
import { gameState } from "./state/gameState";
import { lodManager } from "@/systems/lodSystem";
// import { Fishing } from "./features/fishing";

class Game {
  canvas!: HTMLCanvasElement;
  scene!: THREE.Scene;
  controls!: OrbitControls;
  renderer!: THREE.Renderer;
  cameraSystem!: CameraSystem;
  firepit!: Firepit;
  player!: Player;

  gui = new GUI();

  currentZone = "";

  clock = gameState.clock;

  private keys: { [key: string]: boolean } = {};

  // 3rd person controller variables
  isRunning = false;
  targetCamRot = 0;

  async init() {
    this.canvas = document.getElementById("game") as HTMLCanvasElement;

    this.initScene();

    CameraSystem.init(this.scene, this.gui);

    this.initControls();

    // Asset 등록
    Assets.init(await new Loader().start());

    // Physics
    await PhysicsSystem.init(this.scene);

    // Renderer
    await this.initRenderer();

    // World
    this.firepit = new Firepit(this.scene);
    new Lights(this.scene, this.gui);
    new Cooking(this.scene);
    new World(this.scene, this.gui);
    new Fishing(this.scene);

    // Player
    this.player = new Player(this.scene);

    window.addEventListener("resize", this.onResize);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
  }

  initControls() {
    this.controls = new OrbitControls(CameraSystem.camera, this.canvas);
    // this.controls.enableDamping = true;
  }

  async initRenderer() {
    this.renderer = new THREE.WebGPURenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    await this.renderer.init();
    this.renderer.shadowMap.enabled = true;
    this.canvas = this.renderer.domElement;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.setAnimationLoop(this.animate);
    this.gui.add(this.renderer, "toneMapping", {
      ACES: THREE.ACESFilmicToneMapping,
      none: THREE.NoToneMapping,
      Cineon: THREE.CineonToneMapping,
      Neutral: THREE.NeutralToneMapping,
      Linear: THREE.LinearToneMapping,
      Reinhard: THREE.ReinhardToneMapping,
      AgX: THREE.AgXToneMapping,
    });

    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.gui.add(this.renderer.shadowMap, "type", {
      basic: THREE.BasicShadowMap,
      VSM: THREE.VSMShadowMap,
      PCF: THREE.PCFShadowMap,
      PCFSoft: THREE.PCFSoftShadowMap,
    });
  }

  onResize = () => {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    CameraSystem.resize();
  };

  animate = () => {
    const delta = this.clock.getDelta();
    eventBus.emit("update", delta);

    // this.controls.update();

    eventBus.emit("lateUpdate", { delta, playerPos: this.player.getPosition() });

    this.renderer.render(this.scene, CameraSystem.camera);

    // if (this.currentZone === "chopping") this.firepit.update();
  };
}

new Game().init();

export interface State {
  delta: number;
  playerPos: THREE.Vector3;
}
