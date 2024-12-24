// 2d frustum culling
export function hideSpritesOutsideScreen(app) {
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    // Iterate over all sprites
    app.stage.children.forEach((sprite) => {
        // Check if the sprite is visible
        const spriteBounds = sprite.getBounds();
        const isVisible =
            spriteBounds.x + spriteBounds.width > 0 &&
            spriteBounds.x < screenWidth &&
            spriteBounds.y + spriteBounds.height > 0 &&
            spriteBounds.y < screenHeight;

        // Hide the sprite if it is not visible
        sprite.visible = isVisible;
    });
}

export function updateCamera(app, player, camera, UIElements, dimRectangle, coordinatesText, FPSText, socketText, inventory, healthBar, healthBarValue, notificationContainer, bulletCount, pingText, wallCount) {
    hideSpritesOutsideScreen(app);
    // Adjust the camera position to keep the player in the middle
    camera.x = player.x;
    camera.y = player.y;
    app.stage.position.x = app.renderer.width / 2 - camera.x * camera.scale;
    app.stage.position.y = app.renderer.height / 2 - camera.y * camera.scale;

    // Shift UI elements with Camera
    dimRectangle.x = camera.x - (app.renderer.width / 2) / camera.scale;
    dimRectangle.y = camera.y - (app.renderer.height / 2) / camera.scale;
    dimRectangle.scale.set(1 / camera.scale, 1 / camera.scale);

    coordinatesText.x = camera.x + 690 / camera.scale;
    coordinatesText.y = camera.y + 350 / camera.scale;
    coordinatesText.scale.set(1 / camera.scale, 1 / camera.scale);

    FPSText.x = camera.x - 860 / camera.scale;
    FPSText.y = camera.y - 400 / camera.scale;
    FPSText.scale.set(1 / camera.scale, 1 / camera.scale);

    socketText.x = camera.x + 670 / camera.scale;
    socketText.y = camera.y + 400 / camera.scale;
    socketText.scale.set(1 / camera.scale, 1 / camera.scale);

    inventory.x = camera.x - 250 / camera.scale;
    inventory.y = camera.y + 350 / camera.scale;
    inventory.scale.set(1 / camera.scale, 1 / camera.scale);

    healthBar.x = camera.x - 850 / camera.scale;
    healthBar.y = camera.y + 360 / camera.scale;
    healthBar.scale.set(1 / camera.scale, 1 / camera.scale);

    healthBarValue.x = camera.x - 850 / camera.scale;
    healthBarValue.y = camera.y + 360 / camera.scale;
    //healthBarValue.scale.set(1 / camera.scale, 1 / camera.scale);

    notificationContainer.x = camera.x + 450 / camera.scale;
    notificationContainer.y = camera.y - 400 / camera.scale;
    notificationContainer.scale.set(1 / camera.scale, 1 / camera.scale);

    bulletCount.x = camera.x - 860 / camera.scale;
    bulletCount.y = camera.y - 370 / camera.scale;
    bulletCount.scale.set(1 / camera.scale, 1 / camera.scale);

    pingText.x = camera.x - 860 / camera.scale;
    pingText.y = camera.y - 340 / camera.scale;
    pingText.scale.set(1 / camera.scale, 1 / camera.scale);

    wallCount.x = camera.x - 860 / camera.scale;
    wallCount.y = camera.y - 310 / camera.scale;
    wallCount.scale.set(1 / camera.scale, 1 / camera.scale);
}

