class KeyboardManager {
  private keysPressed: Set<string>;

  constructor() {
    this.keysPressed = new Set();

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    const code = event.code;
    if (!this.keysPressed.has(code)) {
      this.keysPressed.add(code);
    }
  };

  private handleKeyUp = (event: KeyboardEvent) => {
    const code = event.code;
    this.keysPressed.delete(code);
  };

  private handleBlur = () => {
    this.keysPressed.clear();
  };

  isKeyPressed(code: string): boolean {
    if (code === "*") return this.keysPressed.size > 0;
    return this.keysPressed.has(code);
  }
}

const keyboardManager = new KeyboardManager();

class InputManager {
  isForward(): boolean {
    return keyboardManager.isKeyPressed("KeyW") || keyboardManager.isKeyPressed("ArrowUp");
  }

  isBackward(): boolean {
    return keyboardManager.isKeyPressed("KeyS") || keyboardManager.isKeyPressed("ArrowDown");
  }

  isLeftward(): boolean {
    return keyboardManager.isKeyPressed("KeyA") || keyboardManager.isKeyPressed("ArrowLeft");
  }

  isRightward(): boolean {
    return keyboardManager.isKeyPressed("KeyD") || keyboardManager.isKeyPressed("ArrowRight");
  }

  isRightRot(): boolean {
    return keyboardManager.isKeyPressed("KeyE");
  }
  isLeftRot(): boolean {
    return keyboardManager.isKeyPressed("KeyQ");
  }

  isRun(): boolean {
    return keyboardManager.isKeyPressed("ShiftLeft");
  }
}

export const inputManager = new InputManager();

// https://github.com/alezen9/revo-realms/blob/main/src/systems/InputManager.ts
