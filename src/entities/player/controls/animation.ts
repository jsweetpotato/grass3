import * as THREE from "three";

export class AnimationController {
  private mixer: THREE.AnimationMixer;
  private actions: Map<string, THREE.AnimationAction> = new Map();
  private currentAction: THREE.AnimationAction | null = null;

  constructor(model: THREE.Object3D, animations: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(model);

    animations.forEach((clip) => {
      const action = this.mixer.clipAction(clip);
      this.actions.set(clip.name, action);
    });
  }

  play(name: string, fadeDuration: number = 0.2) {
    const newAction = this.actions.get(name);

    if (!newAction || newAction === this.currentAction) return;

    newAction.reset();
    newAction.fadeIn(fadeDuration);
    newAction.play();

    if (this.currentAction) {
      this.currentAction.fadeOut(fadeDuration);
    }

    this.currentAction = newAction;
  }

  playOneShot(name: string, fadeDuration: number = 0.2) {
    const action = this.actions.get(name);
    if (!action) return;

    action.setLoop(THREE.LoopOnce, 1);

    action.clampWhenFinished = true;

    this.play(name, fadeDuration);
  }

  update(delta: number) {
    this.mixer.update(delta);
  }
}
