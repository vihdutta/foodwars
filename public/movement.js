export const mouse = {
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
