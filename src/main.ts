import "@/systems/lodSystem";
import * as THREE from "three/webgpu";
import { OrbitControls, TessellateModifier } from "three/examples/jsm/Addons.js";
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
import { Effects } from "./world/Effects";
import { Test } from "./world/Test";
import Stats from "three/examples/jsm/libs/stats.module.js";
// import { Fishing } from "./features/fishing";

class Game {
  canvas!: HTMLCanvasElement;
  scene!: THREE.Scene;
  controls!: OrbitControls;
  renderer!: THREE.Renderer;
  postProcessing!: THREE.PostProcessing;
  firepit!: Firepit;
  player!: Player;
  gui!: GUI;

  stats!: Stats;

  currentZone = "";

  clock = gameState.clock;

  private keys: { [key: string]: boolean } = {};

  // 3rd person controller variables
  isRunning = false;
  targetCamRot = 0;

  async init() {
    this.canvas = document.getElementById("game") as HTMLCanvasElement;
    this.initGUI();
    this.initScene();

    CameraSystem.init(this.scene, this.gui);

    this.initControls();

    // Asset 등록
    Assets.init(await new Loader().start());

    // Physics
    await PhysicsSystem.init(this.scene, this.gui);

    // Renderer
    this.initRenderer();
    this.initEffect();

    // World
    // this.firepit = new Firepit(this.scene);
    new Lights(this.scene, CameraSystem.camera, this.gui);
    // new Cooking(this.scene);
    new World(this.scene, this.gui);
    // new Fishing(this.scene);

    // new Test(this.scene, this.gui);

    // Player
    this.player = new Player(this.scene);
    this.gui.close();

    await this.renderer.init();

    this.renderer.setAnimationLoop(this.animate);

    window.addEventListener("resize", this.onResize);
  }

  initEffect() {
    const postProcessing = new THREE.PostProcessing(this.renderer);
    this.postProcessing = postProcessing;
    new Effects(this.scene, CameraSystem.camera, postProcessing, this.gui);
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
  }

  initControls() {
    this.controls = new OrbitControls(CameraSystem.camera, this.canvas);
    // this.controls.enableDamping = true;
  }

  initGUI() {
    this.gui = new GUI();
    this.stats = new Stats();

    const statDom = this.stats.dom;
    document.body.appendChild(statDom);

    if (window.location.hash !== "#debug") {
      this.gui.hide();
      statDom.style.display = "none";
    }

    // ---------------------------------------------------
    // 💡 보너스: 새로고침 없이 주소창만 바꿔도 즉시 반영되게 만들기
    window.addEventListener("hashchange", () => {
      if (window.location.hash === "#debug") {
        this.gui.show();
        statDom.style.display = "flex";
      } else {
        this.gui.hide();
        statDom.style.display = "none";
      }
    });
  }

  initRenderer() {
    this.renderer = new THREE.WebGPURenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });

    this.renderer.shadowMap.enabled = true;
    this.canvas = this.renderer.domElement;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // this.renderer.autoClear = false;

    this.gui.add(this.renderer, "toneMapping", {
      ACES: THREE.ACESFilmicToneMapping,
      none: THREE.NoToneMapping,
      Cineon: THREE.CineonToneMapping,
      Neutral: THREE.NeutralToneMapping,
      Linear: THREE.LinearToneMapping,
      Reinhard: THREE.ReinhardToneMapping,
      AgX: THREE.AgXToneMapping
    });

    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.gui.add(this.renderer.shadowMap, "type", {
      basic: THREE.BasicShadowMap,
      VSM: THREE.VSMShadowMap,
      PCF: THREE.PCFShadowMap,
      PCFSoft: THREE.PCFSoftShadowMap
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

    // this.renderer.render(this.scene, CameraSystem.camera);
    this.postProcessing.render();
    this.stats.update();
    // if (this.currentZone === "chopping") this.firepit.update();
  };
}

new Game().init();

export interface State {
  delta: number;
  playerPos: THREE.Vector3;
}
