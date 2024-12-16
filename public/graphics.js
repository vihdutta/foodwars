const Sprite = PIXI.Sprite;
const Assets = PIXI.Assets;
const Graphics = PIXI.Graphics;

export async function background_init(app) {
    const background = await Assets.load("images/img.jpg");
    const backgroundSprite = Sprite.from(background);
    backgroundSprite.x = 0;
    backgroundSprite.y = 0;
    backgroundSprite.scale.set(2, 2);

    app.renderer.background.color = "#23395D"; // Change background color
    app.renderer.resize(window.innerWidth, window.innerHeight);
    app.renderer.view.style.position = "absolute";

    app.stage.addChild(backgroundSprite);
}

export async function player_init() {
    const playerTexture = await Assets.load("images/player.png");
    const player = Sprite.from(playerTexture);
    player.scale.set(2, 2);
    player.anchor.set(0.5, 0.5);
    return player;
}

// dims the screen apart from UI elements
// when the menu is open (the screen seen when 
// the website is loaded/when the player dies)
export function menu_dimmer_init(player) {
    const dimRectangle = new Graphics();
    dimRectangle.beginFill(0x000000, 0.2);
    dimRectangle.drawRect(
        player.x,
        player.y,
        window.innerWidth,
        window.innerHeight
    );
    dimRectangle.endFill();
    return dimRectangle;
}

export function coordinates_text_init(player) {
    const coordinatesText = new PIXI.Text("(" + player.x + ", " + player.y + ")", {
        fontFamily: "Arial",
        fontSize: 30,
        fill: "ffffff",
    });
    coordinatesText.x = 0;
    coordinatesText.y = 0;

    setInterval(() => {
        coordinatesText.text = "(" + Math.round(player.x / 50) + ", " + Math.round(player.y / 50) + ")";
    }, 100);

    return coordinatesText;
}

export function fps_text_init(app, player) {
    const FPSText = new PIXI.Text("(" + player.x + ", " + player.y + ")", {
        fontFamily: "Arial",
        fontSize: 30,
        fill: "ffffff",
    });
    FPSText.x = 0;
    FPSText.y = 0;

    setInterval(() => {
        FPSText.text = "FPS: " + app.ticker.FPS.toFixed(2);
    }, 100);

    return FPSText;
}

export function inventory_init() {
    const inventory = new Graphics();
    inventory.lineStyle({ width: 2, color: 0x000000, alpha: 0.5 });
    inventory.beginFill(0x222222);
    inventory.drawRoundedRect(0, 0, 500, 55, 5);
    inventory.endFill();
    inventory.x = 0;
    inventory.y = 0;
    return inventory;
}

export function health_bar_init() {
    const healthBar = new Graphics();
    healthBar.lineStyle({ width: 2, color: 0x000000, alpha: 0.5 });
    healthBar.beginFill(0x222222);
    healthBar.drawRoundedRect(0, 0, 500, 30, 5);
    healthBar.endFill();
    healthBar.x = 0;
    healthBar.y = 0;
    return healthBar;
}

export function health_bar_value_init() {
    const healthBarValue = new Graphics();
    healthBarValue.beginFill(0x13ea22);
    healthBarValue.drawRoundedRect(0, 0, 500, 30, 5);
    healthBarValue.endFill();
    healthBarValue.x = 0;
    healthBarValue.y = 0;
    return healthBarValue;
}

export function shield_bar_init() {
    const shieldBar = new Graphics();
    shieldBar.lineStyle({ width: 3, color: 0x000000, alpha: 0.3 });
    shieldBar.beginFill(0x0198ef);
    shieldBar.drawRoundedRect(0, 0, 500, 25, 5);
    shieldBar.endFill();
    shieldBar.x = 0;
    shieldBar.y = 0;
    return shieldBar;
}

export function socket_text_init(socket) {
    const socketText = new PIXI.Text("SOCKET ID: " + socket.id, {
        fontFamily: "Arial",
        fontSize: 10,
        fill: "ffffff",
    });
    socketText.x = 0;
    socketText.y = 0;
    return socketText;
}

export function notification_init() {
    const notificationContainer = new PIXI.Container();
    let notificationOffsetY = 0;

    function notification(text) {
        const notificationBar = new Graphics();
        notificationBar.beginFill(0x000000, 0.5);
        notificationBar.drawRoundedRect(0, 0, 400, 30, 5);
        notificationBar.endFill();
        notificationBar.x = -5;
        notificationBar.y = notificationOffsetY;

        const notification = new PIXI.Text(text, {
            fontFamily: "Arial",
            fontSize: 21,
            fill: "white",
            align: "center",
        });
        notification.x = 0;
        notification.y = notificationOffsetY;

        notificationOffsetY += 40; // Increase the offset for the next notification

        notificationContainer.addChild(notificationBar);
        notificationContainer.addChild(notification);

        setTimeout(() => {
            notificationContainer.removeChild(notification);
            notificationContainer.removeChild(notificationBar);

            // Adjust the position of remaining notifications
            notificationOffsetY -= 40;
            notificationContainer.children.forEach((child) => {
                child.y -= 40;
            });
        }, 3000);
    }

    return { notificationContainer, notification };
}

export function bullet_count_init() {
    const bulletCount = new PIXI.Text("Bullets: 0", {
        fontFamily: "Arial",
        fontSize: 30,
        fill: "ffffff",
    });
    bulletCount.x = 0;
    bulletCount.y = 0;

    return bulletCount;
}