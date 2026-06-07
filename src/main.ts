import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  BasicShadowMap,
  CineonToneMapping,
  Color,
  LinearToneMapping,
  NeutralToneMapping,
  NoToneMapping,
  PCFShadowMap,
  PCFSoftShadowMap,
  PostProcessing,
  ReinhardToneMapping,
  Scene,
  Vector3,
  VSMShadowMap,
  WebGPURenderer,
  type Renderer
} from "three/webgpu";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import Stats from "three/examples/jsm/libs/stats.module.js";

import { eventBus } from "@/core/EventBus";
import { Assets } from "@/core/resources";

import { PhysicsSystem } from "@/systems/PhysicsSystem";
import { CameraSystem } from "@/systems/CameraSystem";
import LoadSystem from "@/systems/LoadSystem";

import { Player } from "@/entities/player/player";
import { World } from "@/world/World";
import { Lights } from "@/world/Lights";
import { Effects } from "@/world/Effects";

import { gameState } from "@/state/gameState";

import GUI from "three/examples/jsm/libs/lil-gui.module.min.js";
class Game {
  canvas!: HTMLCanvasElement;
  scene!: Scene;
  controls!: OrbitControls;
  renderer!: Renderer;
  postProcessing!: PostProcessing;

  player!: Player;
  gui!: GUI;

  stats!: Stats;

  currentZone = "";

  clock = gameState.clock;

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
    Assets.init(await new LoadSystem().start());

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

    // Player
    this.player = new Player(this.scene);
    this.gui.close();

    await this.renderer.init();

    eventBus.emit("scene:ready");

    this.renderer.setAnimationLoop(this.animate);

    window.addEventListener("resize", this.onResize);
  }

  initEffect() {
    const postProcessing = new PostProcessing(this.renderer);
    this.postProcessing = postProcessing;
    new Effects(this.scene, CameraSystem.camera, postProcessing, this.gui);
  }

  initScene() {
    this.scene = new Scene();
    this.scene.background = new Color(0x87ceeb);
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
    this.renderer = new WebGPURenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: false
    });

    this.renderer.shadowMap.enabled = true;
    this.canvas = this.renderer.domElement;
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio > 2 ? 2 : window.devicePixelRatio);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    // this.renderer.autoClear = false;

    this.gui.add(this.renderer, "toneMapping", {
      ACES: ACESFilmicToneMapping,
      none: NoToneMapping,
      Cineon: CineonToneMapping,
      Neutral: NeutralToneMapping,
      Linear: LinearToneMapping,
      Reinhard: ReinhardToneMapping,
      AgX: AgXToneMapping
    });

    this.renderer.shadowMap.type = PCFShadowMap;

    this.gui.add(this.renderer.shadowMap, "type", {
      basic: BasicShadowMap,
      VSM: VSMShadowMap,
      PCF: PCFShadowMap,
      PCFSoft: PCFSoftShadowMap
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
  playerPos: Vector3;
}
