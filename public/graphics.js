const Sprite = PIXI.Sprite;
const Assets = PIXI.Assets;
const Graphics = PIXI.Graphics;

function createTileMap() {
    return [[1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 4, 4, 4, 4, 4, 4, 4, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 2, 4, 4, 4, 4, 4, 2, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 2, 2, 3, 3, 3, 2, 2, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 3, 3, 2, 2, 2, 2, 2, 3, 3, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 1, 1, 1, 1, 1, 1], [3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 3, 3, 3, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3], [3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3], [3, 3, 3, 3, 3, 2, 3, 3, 3, 2, 2, 2, 2, 2, 3, 3, 3, 2, 3, 3, 3, 3, 3], [3, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 3], [3, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 3], [3, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 3, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 3], [3, 4, 2, 2, 2, 2, 2, 2, 2, 2, 4, 3, 4, 2, 2, 2, 2, 2, 2, 2, 2, 4, 3], [3, 4, 4, 3, 2, 2, 2, 2, 2, 3, 4, 3, 4, 3, 2, 2, 2, 2, 2, 3, 4, 4, 3], [3, 4, 4, 3, 2, 2, 2, 2, 2, 3, 4, 4, 4, 3, 2, 2, 2, 2, 2, 3, 4, 4, 3], [3, 4, 4, 3, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 3, 4, 4, 3], [3, 4, 4, 3, 2, 2, 2, 2, 2, 3, 4, 4, 4, 3, 2, 2, 2, 2, 2, 3, 4, 4, 3], [3, 4, 4, 3, 2, 2, 2, 2, 2, 3, 4, 3, 4, 3, 2, 2, 2, 2, 2, 3, 4, 4, 3], [3, 4, 2, 2, 2, 2, 2, 2, 2, 2, 4, 3, 4, 2, 2, 2, 2, 2, 2, 2, 2, 4, 3], [3, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 3, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 3], [3, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 3], [3, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 3], [3, 3, 3, 3, 3, 2, 3, 3, 3, 2, 2, 2, 2, 2, 3, 3, 3, 2, 3, 3, 3, 3, 3], [3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3], [3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 3, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3], [1, 1, 1, 1, 1, 1, 3, 2, 2, 2, 3, 3, 3, 2, 2, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 3, 3, 2, 2, 2, 2, 2, 3, 3, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 2, 2, 3, 3, 3, 2, 2, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 2, 4, 4, 4, 4, 4, 2, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 4, 4, 4, 4, 4, 4, 4, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1]];
}


export async function background_init(app, socket) {
    let walls = {};
    app.renderer.background.color = "#b1cefc";
    app.renderer.resize(window.innerWidth, window.innerHeight);
    app.renderer.view.style.position = "absolute";

    const tileMap = createTileMap();
    Assets.load('images/simple_textures.png').then((texture) => {
        // Create textures for each tile number
        const tileTextures = {};
        for (let j = 1; j <= 4; j++) { // 4 columns
            const tileX = (j - 1) * 64;
            tileTextures[j] = new PIXI.Texture(texture, new PIXI.Rectangle(tileX, 0, 64, 64));
        }

        const scale = 2; // scales the sprites
        tileMap.forEach((row, rowIndex) => {
            row.forEach((tile, colIndex) => {
                const sprite = new PIXI.Sprite(tileTextures[tile]);
                // position the sprite
                sprite.x = colIndex * 64 * scale;
                sprite.y = rowIndex * 64 * scale;
                sprite.scale.set(scale, scale);


                app.stage.addChild(sprite);
                if (tile === 3) { // tiles with collision box
                    let wallData = {
                        id: `wall_${rowIndex}_${colIndex}`,
                        x: sprite.x + 8,
                        y: sprite.y + 8,
                        width: sprite.width, // Adjusted to account for scale
                        height: sprite.height  // Adjusted to account for scale
                    };
                    socket.emit('addWall', wallData);
                    walls[wallData.id] = wallData;
                }
            });
        });
    });
    return walls;
}

export async function player_init() {
    const playerTexture = await Assets.load("images/player.png");
    const player = Sprite.from(playerTexture);
    player.scale.set(2, 2);
    player.anchor.set(0.5, 0.5);
    player.x = 1482; // corresponds with 1450, 2100 coords
    player.y = 2132; // however, coords change when spawned in so values here diff
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
        stroke: "000000",
        strokeThickness: 4
    });
    coordinatesText.x = 0;
    coordinatesText.y = 0;

    setInterval(() => {
        //coordinatesText.text = "(" + Math.round(player.x / 50) + ", " + Math.round(player.y / 50) + ")";
        coordinatesText.text = "(" + Math.round(player.x) + ", " + Math.round(player.y) + ")";
    }, 100);

    return coordinatesText;
}

export function fps_text_init(app, player) {
    const FPSText = new PIXI.Text("(" + player.x + ", " + player.y + ")", {
        fontFamily: "Arial",
        fontSize: 30,
        fill: "ffffff",
        stroke: "000000",
        strokeThickness: 4
    });
    FPSText.x = 0;
    FPSText.y = 0;

    setInterval(() => {
        FPSText.text = "FPS: " + app.ticker.FPS.toFixed(0);
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

export function socket_text_init(socket) {
    const socketText = new PIXI.Text("SOCKET ID: " + socket.id, {
        fontFamily: "Arial",
        fontSize: 10,
        fill: "ffffff",
        stroke: "000000",
        strokeThickness: 4
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
            stroke: "000000",
            strokeThickness: 4
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
        stroke: "000000",
        strokeThickness: 4
    });
    bulletCount.x = 0;
    bulletCount.y = 0;

    return bulletCount;
}

export function ping_init() {
    const pingText = new PIXI.Text("Ping: 0ms", {
        fontFamily: "Arial",
        fontSize: 30,
        fill: "ffffff",
        stroke: "000000",
        strokeThickness: 4
    });
    pingText.x = 0;
    pingText.y = 0;

    return pingText;
}

export function wall_count_init() {
    const wallCount = new PIXI.Text("Walls: " + createTileMap().flat().filter(tile => tile === 4).length, {
        fontFamily: "Arial",
        fontSize: 30,
        fill: "ffffff",
        stroke: "000000",
        strokeThickness: 4
    });
    wallCount.x = 0;
    wallCount.y = 0;

    return wallCount;
}