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
    r: false,
    t: false, // leaderboard visibility key
};

export function handleMouseMove(event: MouseEvent) {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
}

export function handleMouseDown(event: MouseEvent) {
    if (event.button === 0) mouse.mb1 = true;
  }

export function handleMouseUp(event: MouseEvent) {
if (event.button === 0) mouse.mb1 = false;
}

export function handleKeyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (keyboard.hasOwnProperty(key)) {
        keyboard[key] = true;
    }
}

export function handleKeyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (keyboard.hasOwnProperty(key)) {
        keyboard[key] = false;
    }
}
