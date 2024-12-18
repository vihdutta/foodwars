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
    dimRectangle.x = camera.x - app.renderer.width / 2;
    dimRectangle.y = camera.y - app.renderer.height / 2;

    coordinatesText.x = camera.x + 775;
    coordinatesText.y = camera.y + 420;

    FPSText.x = camera.x - 925;
    FPSText.y = camera.y - 450;

    socketText.x = camera.x + 765;
    socketText.y = camera.y + 460;

    inventory.x = camera.x - 250;
    inventory.y = camera.y + 400;

    healthBar.x = camera.x - 925;
    healthBar.y = camera.y + 420;

    healthBarValue.x = camera.x - 925;
    healthBarValue.y = camera.y + 420;

    notificationContainer.x = camera.x + 550;
    notificationContainer.y = camera.y - 420;

    bulletCount.x = camera.x - 925;
    bulletCount.y = camera.y - 420;

    pingText.x = camera.x - 925;
    pingText.y = camera.y - 360;

    wallCount.x = camera.x - 925;
    wallCount.y = camera.y - 390;

    UIElements.scale.set(1 / camera.scale, 1 / camera.scale);
}

