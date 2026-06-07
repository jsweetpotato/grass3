import { Clock } from "three/webgpu";

class GameState {
  private _inventory = new Map();
  private _clock = new Clock();

  get inventory() {
    return this._inventory;
  }

  get clock() {
    return this._clock;
  }
}

export const gameState = new GameState();
