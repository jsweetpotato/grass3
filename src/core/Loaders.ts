import { resources } from "@/core/resources";
import * as THREE from "three";
import { DRACOLoader, GLTFLoader, type GLTF } from "three/examples/jsm/Addons.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";

type T_ResultTypeMap = {
  object: GLTF;
  image: THREE.Texture;
  audio: AudioBuffer;
};

type T_ResourceItem = (typeof resources)[number];

export type T_LoadedResources = {
  [Item in T_ResourceItem as Item["name"]]: T_ResultTypeMap[Item["type"] & keyof T_ResultTypeMap];
};

export default class Loader {
  private items: Record<string, any> = {};
  manager = new THREE.LoadingManager();
  loaders: { [key: string]: THREE.Loader } = {};

  constructor() {
    const enter = document.querySelector("#enter") as HTMLElement;
    const container = document.querySelector("#container") as HTMLElement;
    const progress = document.querySelector("#progress") as HTMLProgressElement;

    if (progress) {
      this.manager.onProgress = (_, loaded, total) => {
        progress.value = (loaded / total) * 100;
      };
    }

    if (enter && container) {
      this.manager.onLoad = () => {
        enter.style.display = "flex";
      };

      enter.addEventListener("click", () => {
        container.style.display = "none";
      });
    }

    const draco = new DRACOLoader(this.manager);
    draco.setDecoderPath("/draco/");

    const gltfLoader = new GLTFLoader(this.manager);
    gltfLoader.setDRACOLoader(draco);
    gltfLoader.setMeshoptDecoder(MeshoptDecoder);

    const audioLoader = new THREE.AudioLoader(this.manager);
    const textureLoader = new THREE.TextureLoader(this.manager);

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

  private getFallback(type: string, name: string): any {
    console.warn(`Resource load failed: ${name} -> Using Fallback`);

    if (type === "texture" || type === "image") {
      const fallbackTexture = new THREE.DataTexture(new Uint8Array([255, 0, 255, 255]), 1, 1, THREE.RGBAFormat);
      fallbackTexture.needsUpdate = true;
      fallbackTexture.name = `fallback_${name}`;
      return fallbackTexture;
    } else if (type === "model" || type === "object") {
      const scene = new THREE.Scene();
      const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true }));
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
