import { AnimationAction, AnimationClip, AnimationMixer, LoopOnce, Object3D } from "three/webgpu";

export class AnimationController {
  private mixer: AnimationMixer;
  private actions: Map<string, AnimationAction> = new Map();
  private currentAction: AnimationAction | null = null;
  private timeScales: any = {
    run: 2,
    walk: 1.5
  };

  constructor(model: Object3D, animations: AnimationClip[]) {
    this.mixer = new AnimationMixer(model);

    animations.forEach((clip) => {
      const action = this.mixer.clipAction(clip);

      action.timeScale = this.timeScales[clip.name] || 1;

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

    action.setLoop(LoopOnce, 1);

    action.clampWhenFinished = true;

    this.play(name, fadeDuration);
  }

  update(delta: number) {
    this.mixer.update(delta);
  }
}
