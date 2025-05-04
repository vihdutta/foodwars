export const mouse = {
    mb1: false, // mouse button 1 pressed or not
    x: 0,
    y: 0,
};

export const keyboard = {
    w: false,
    a: false,
    s: false,
    d: false,
    shift: false,
};

export function handleMouseMove(event) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
}

export function handleMouseDown(event) {
    if (event.button === 0) mouse.mb1 = true;
  }

export function handleMouseUp(event) {
if (event.button === 0) mouse.mb1 = false;
}

export function handleKeyDown(event) {
    const key = event.key.toLowerCase();
    if (keyboard.hasOwnProperty(key)) {
        keyboard[key] = true;
    }
}

export function handleKeyUp(event) {
    const key = event.key.toLowerCase();
    if (keyboard.hasOwnProperty(key)) {
        keyboard[key] = false;
    }
}
