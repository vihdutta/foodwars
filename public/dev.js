const Graphics = PIXI.Graphics;

export function createBoundingBox(playerLength) {
    const boundingBox = new Graphics();
    boundingBox.lineStyle({ width: 1, color: 0x00ff00, alpha: 1 });
    boundingBox.drawRect(
        -playerLength / 2,
        -playerLength / 2,
        playerLength,
        playerLength
    );
    return boundingBox;
}

export function updateBoundingBox(boundingBox, playerData, playerLength) {
    boundingBox.x = playerData.x;
    boundingBox.y = playerData.y;
    boundingBox.width = playerLength;
    boundingBox.height = playerLength;
}

export function createBulletBoundingBox(bulletData) {
    const boundingBox = new Graphics();
    boundingBox.lineStyle({ width: 1, color: 0x00ff00, alpha: 1 });
    boundingBox.drawRect(
        -bulletData.width / 2,
        -bulletData.height / 2,
        bulletData.width,
        bulletData.height
    );
    return boundingBox;
}

export function updateBulletBoundingBox(boundingBox, bulletData) {
    boundingBox.box.x = bulletData.x;
    boundingBox.box.y = bulletData.y;
    boundingBox.box.width = bulletData.width;
    boundingBox.box.height = bulletData.height;
}

export function handleDevBoundingBox(app, boundingBoxes, playerData, playerLength) {
    if (!boundingBoxes[playerData.id]) {
        const boundingBox = new Graphics();
        boundingBox.lineStyle({ width: 1, color: 0x00ff00, alpha: 1 });
        boundingBox.drawRect(
            -playerLength / 2,
            -playerLength / 2,
            playerLength,
            playerLength
        );
        app.stage.addChild(boundingBox);
        boundingBoxes[playerData.id] = boundingBox;
    }

    const boundingBox = boundingBoxes[playerData.id];
    boundingBox.x = playerData.x;
    boundingBox.y = playerData.y;
    boundingBox.width = playerLength;
    boundingBox.height = playerLength;
}

export function handleDevBulletBoundingBox(app, boundingBoxes, bulletsData, bulletId) {
    if (!boundingBoxes[bulletId]) {
        const boundingBox = new Graphics();
        boundingBox.lineStyle({ width: 1, color: 0x00ff00, alpha: 1 });
        boundingBox.drawRect(
            -bulletsData[bulletId].width / 2,
            -bulletsData[bulletId].height / 2,
            bulletsData[bulletId].width,
            bulletsData[bulletId].height
        );
        app.stage.addChild(boundingBox);
        boundingBoxes[bulletId] = {
            box: boundingBox,
            timer: 3,
        };
    }

    const boundingBox = boundingBoxes[bulletId];
    boundingBox.box.x = bulletsData[bulletId].x;
    boundingBox.box.y = bulletsData[bulletId].y;
    boundingBox.box.width = bulletsData[bulletId].width;
    boundingBox.box.height = bulletsData[bulletId].height;
}

export function handleDevEnemyBoundingBox(app, boundingBoxes, enemyData, playerLength) {
    if (!boundingBoxes[enemyData.id]) {
        const boundingBox = new Graphics();
        boundingBox.lineStyle({ width: 1, color: 0x00ff00, alpha: 1 });
        boundingBox.drawRect(
            -playerLength / 2,
            -playerLength / 2,
            playerLength,
            playerLength
        );
        app.stage.addChild(boundingBox);
        boundingBoxes[enemyData.id] = boundingBox;
    }

    const boundingBox = boundingBoxes[enemyData.id];
    boundingBox.x = enemyData.x;
    boundingBox.y = enemyData.y;
    boundingBox.width = playerLength;
    boundingBox.height = playerLength;
}

export function handleDevWallBoundingBox(app, boundingBoxes, wallData) {
    if (!boundingBoxes[wallData.id]) {
        const boundingBox = new Graphics();
        boundingBox.lineStyle({ width: 1, color: 0xff0000, alpha: 1 });
        boundingBox.drawRect(
            -32,
            -32,
            wallData.width,
            wallData.height
        );
        app.stage.addChild(boundingBox);
        boundingBoxes[wallData.id] = boundingBox;
    }

    const boundingBox = boundingBoxes[wallData.id];
    boundingBox.x = wallData.x;
    boundingBox.y = wallData.y;
    boundingBox.width = wallData.width;
    boundingBox.height = wallData.height;
}