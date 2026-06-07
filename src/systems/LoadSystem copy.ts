import { AudioLoader, BoxGeometry, DataTexture, Loader, LoadingManager, Mesh, MeshBasicMaterial, RGBAFormat, Scene, TextureLoader, type Texture } from "three/webgpu";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";

import { resources } from "@/core/resources";
import { eventBus } from "@/core/EventBus";

type T_ResultTypeMap = {
  object: GLTF;
  image: Texture;
  audio: AudioBuffer;
};

type T_ResourceItem = (typeof resources)[number];

export type T_LoadedResources = {
  [Item in T_ResourceItem as Item["name"]]: T_ResultTypeMap[Item["type"] & keyof T_ResultTypeMap];
};

export default class LoadSystem {
  private items: Record<string, any> = {};
  manager = new LoadingManager();
  loaders: { [key: string]: Loader } = {};

  constructor() {
    this.progressManager();

    const draco = new DRACOLoader(this.manager);
    draco.setDecoderPath("/draco/");

    const gltfLoader = new GLTFLoader(this.manager);
    gltfLoader.setDRACOLoader(draco);
    gltfLoader.setMeshoptDecoder(MeshoptDecoder);

    const audioLoader = new AudioLoader(this.manager);
    const textureLoader = new TextureLoader(this.manager);

    this.loaders = {
      glb: gltfLoader,
      gltf: gltfLoader,
      mp3: audioLoader,
      wav: audioLoader,
      png: textureLoader,
      jpg: textureLoader,
      jpeg: textureLoader,
      webp: textureLoader
    };
  }

  private progressManager() {
    const enter = document.querySelector("#enter") as HTMLButtonElement;
    const container = document.querySelector("#loading") as HTMLElement;
    const progress = document.querySelector("#loading-bar") as HTMLProgressElement;

    if (progress) {
      this.manager.onProgress = (_, loaded, total) => {
        progress.value = (loaded / total) * 100 - 10;
      };
    }

    const buttonEvent = enter.addEventListener("click", () => {
      progress.classList.add("hide");
      container.classList.add("fade-out");
      container.addEventListener("transitionend", () => {
        container.style.display = "none";
      });
    });

    eventBus.on("scene:ready", () => {
      if (progress) progress.value = 100;

      if (enter && container) {
        enter.classList.add("show");
      }
    });
  }

  private getFallback(type: string, name: string): any {
    console.warn(`Resource load failed: ${name} -> Using Fallback`);

    if (type === "texture" || type === "image") {
      const fallbackTexture = new DataTexture(new Uint8Array([255, 0, 255, 255]), 1, 1, RGBAFormat);
      fallbackTexture.needsUpdate = true;
      fallbackTexture.name = `fallback_${name}`;
      return fallbackTexture;
    } else if (type === "model" || type === "object") {
      const scene = new Scene();
      const box = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial({ color: 0xff0000, wireframe: true }));
      box.name = `fallback_${name}`;
      scene.add(box);
      return { scene: scene, animations: [] } as unknown as GLTF;
    } else if (type === "audio") {
      return new AudioBuffer({ length: 1, sampleRate: 44100 });
    }

    return null;
  }

  async start(): Promise<T_LoadedResources> {
    const promises: Promise<void>[] = [];

    for (const item of resources) {
      const extensionMatch = item.path.match(/\.([a-z0-9]+)$/i);
      const extension = extensionMatch ? extensionMatch[1].toLowerCase() : null;

      if (!extension || !this.loaders[extension]) {
        this.items[item.name] = this.getFallback(item.type, item.name);
        continue;
      }

      const loader = this.loaders[extension];

      const p = loader
        .loadAsync(item.path)
        .then((data) => {
          this.items[item.name] = data;
        })
        .catch((err) => {
          console.error(`Load Error (${item.name}):`, err);
          this.items[item.name] = this.getFallback(item.type, item.name);
        });

      promises.push(p);
    }

    await Promise.all(promises);

    return this.items as T_LoadedResources;
  }
}
