// 2d frustum culling
export function hideSpritesOutsideScreen(app: any) {
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

export function updateCamera(app: any, player: any, widthForHealthBar: number, camera: any, UIElements: any, dimRectangle: any, coordinatesText: any, FPSText: any, socketText: any, inventory: any, healthBar: any, healthBarValue: any, bulletCount: any, pingText: any, wallCount: any, usernameText: any, timerText: any, ammoDisplay: any, reloadIndicator: any) {
    hideSpritesOutsideScreen(app);
    // Adjust the camera position to keep the player in the middle
    camera.x = player.x;
    camera.y = player.y;
    app.stage.position.x = app.renderer.width / 2 - camera.x * camera.scale;
    app.stage.position.y = app.renderer.height / 2 - camera.y * camera.scale;

    // dimming now handled by HTML/CSS system - no PIXI.js dimRectangle needed

    FPSText.x = camera.x - (window.innerWidth/2) / camera.scale + 20;
    FPSText.y = camera.y - (window.innerHeight/2) / camera.scale + 10;

    socketText.x = camera.x + (window.innerWidth/2) / camera.scale - socketText.width;
    socketText.y = camera.y - (window.innerHeight/2) / camera.scale + window.innerHeight - socketText.height;

    healthBar.width = 60 * Math.min(100, window.innerWidth / 1500);
    healthBar.height = 6 * Math.min(100, window.innerWidth / 1500);
    healthBar.x = camera.x - healthBar.width/2;
    healthBar.y = camera.y + 40;

    healthBarValue.width = widthForHealthBar * Math.min(100, window.innerWidth / 1500);
    healthBarValue.height = 4 * Math.min(100, window.innerWidth / 1500);
    healthBarValue.x = camera.x - healthBar.width/2;
    healthBarValue.y = camera.y + 40 + (healthBar.height-healthBarValue.height)/6;
    bulletCount.x = camera.x - (window.innerWidth/2) / camera.scale + 20;
    bulletCount.y = camera.y - (window.innerHeight/2) / camera.scale + 40;

    pingText.x = camera.x - (window.innerWidth/2) / camera.scale + 20;
    pingText.y = camera.y -  (window.innerHeight/2) / camera.scale + 70;

    wallCount.x = camera.x - (window.innerWidth/2) / camera.scale + 20;
    wallCount.y = camera.y - (window.innerHeight/2) / camera.scale + 100;

    usernameText.x = camera.x + (window.innerWidth/2) / camera.scale - window.innerWidth/2 - usernameText.width/2;
    usernameText.y = camera.y - (window.innerHeight/2) / camera.scale + window.innerHeight/2 - 75;

    // Position timer at the top center of the screen
    timerText.x = camera.x;
    timerText.y = camera.y - (window.innerHeight/2) / camera.scale + 20;

    // Position ammo display where coordinates used to be (bottom right)
    ammoDisplay.x = camera.x + (window.innerWidth/2) / camera.scale - ammoDisplay.width;
    ammoDisplay.y = camera.y - (window.innerHeight/2) / camera.scale + window.innerHeight - ammoDisplay.height - 10;

    // Position reload indicator above ammo display
    reloadIndicator.x = camera.x + (window.innerWidth/2) / camera.scale - reloadIndicator.width;
    reloadIndicator.y = camera.y - (window.innerHeight/2) / camera.scale + window.innerHeight - reloadIndicator.height - 50;
}

