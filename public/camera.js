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

export function updateCamera(app, player, camera, UIElements, dimRectangle, coordinatesText, FPSText, socketText, inventory, healthBar, healthBarValue, shieldBar, notificationContainer) {
    hideSpritesOutsideScreen(app);
    // Adjust the camera position to keep the player in the middle
    camera.x = player.x;
    camera.y = player.y;
    app.stage.position.x = app.renderer.width / 2 - camera.x;
    app.stage.position.y = app.renderer.height / 2 - camera.y;

    // Shift UI elements with Camera
    dimRectangle.x = player.x - app.renderer.width / 2;
    dimRectangle.y = player.y - app.renderer.height / 2;

    coordinatesText.x = camera.x + 775;
    coordinatesText.y = camera.y + 420;

    FPSText.x = camera.x - 925;
    FPSText.y = camera.y - 450;

    socketText.x = camera.x + 765;
    socketText.y = camera.y + 460;

    inventory.x = camera.x - 250;
    inventory.y = camera.y + 400;

    healthBar.x = camera.x - 925;
    healthBar.y = camera.y + 430;

    healthBarValue.x = camera.x - 925;
    healthBarValue.y = camera.y + 430;

    shieldBar.x = camera.x - 925;
    shieldBar.y = camera.y + 400;

    notificationContainer.x = camera.x + 550;
    notificationContainer.y = camera.y - 420;
}
