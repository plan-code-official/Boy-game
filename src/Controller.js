// Map keyboard key codes to controller's state keys
const keyMap = {
  Space: 'shoot',
  KeyW: 'up',
  ArrowUp: 'up',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyF: 'shoot',
};

// Class for handling keyboard inputs.
export class Controller {
  constructor() {
    // The controller's state.
    this.keys = {
      up: { pressed: false, doubleTap: false, timestamp: 0 },
      left: { pressed: false, doubleTap: false, timestamp: 0 },
      down: { pressed: false, doubleTap: false, timestamp: 0 },
      right: { pressed: false, doubleTap: false, timestamp: 0 },
      shoot: { pressed: false, doubleTap: false, timestamp: 0 },
      run: { pressed: false, doubleTap: false, timestamp: 0 },
    };

    // Store pointer coordinate position
    this.pointer = { x: 0, y: 0 };
    // Track the last type of shoot input ('keyboard' or 'pointer')
    this.lastShootType = 'keyboard';

    // Register event listeners for keydown and keyup events.
    window.addEventListener('keydown', (event) => this.keydownHandler(event));
    window.addEventListener('keyup', (event) => this.keyupHandler(event));
    window.addEventListener('pointerdown', (event) => this.pointerdownHandler(event));
    window.addEventListener('pointerup', (event) => this.pointerupHandler(event));
    window.addEventListener('pointermove', (event) => this.pointermoveHandler(event));
  }

  keydownHandler(event) {
    const key = keyMap[event.code];

    if (!key) return;

    const now = Date.now();

    // If not already in the double-tap state, toggle the double tap state if the key was pressed twice within 300ms.
    this.keys[key].doubleTap = this.keys[key].doubleTap || now - this.keys[key].timestamp < 300;

    // Toggle on the key pressed state.
    this.keys[key].pressed = true;

    if (key === 'shoot') {
      this.lastShootType = 'keyboard';
    }
  }

  keyupHandler(event) {
    const key = keyMap[event.code];

    if (!key) return;

    const now = Date.now();

    // Reset the key pressed state.
    this.keys[key].pressed = false;

    // Reset double tap only if the key is in the double-tap state.
    if (this.keys[key].doubleTap) this.keys[key].doubleTap = false;
    // Otherwise, update the timestamp to track the time difference till the next potential key down.
    else this.keys[key].timestamp = now;
  }

  pointerdownHandler(event) {
    if (event.button === 0) {
      this.keys.shoot.pressed = true;
      this.lastShootType = 'pointer';
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
    }
  }

  pointerupHandler(event) {
    if (event.button === 0) {
      this.keys.shoot.pressed = false;
    }
  }

  pointermoveHandler(event) {
    this.pointer.x = event.clientX;
    this.pointer.y = event.clientY;
  }

  // Method to programmatically set key states from on-screen UI buttons
  setTouchKeyState(key, isPressed) {
    if (!this.keys[key]) return;
    this.keys[key].pressed = isPressed;
    if (isPressed) {
      this.lastShootType = 'keyboard'; // Treat all UI buttons as keyboard input so it stops aiming at old pointer taps
    }
  }
}
