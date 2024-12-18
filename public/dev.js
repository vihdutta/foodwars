const Graphics = PIXI.Graphics;

export function handleDevBoundingBox(app, boundingBoxes, playerData, playerLength) {
    if (!boundingBoxes[playerData.id]) {
        const boundingBox = new Graphics();
        boundingBox.lineStyle({ width: 1, color: 0x00ff00, alpha: 1 });
        boundingBox.drawRect(
            -playerLength / 2 + 32,
            -playerLength / 2 + 32,
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
        boundingBox.rotation = bulletsData[bulletId].rotation;
        app.stage.addChild(boundingBox);
        boundingBoxes[bulletId] = {
            box: boundingBox,
            timer: 3,
        };
    }

    const boundingBox = boundingBoxes[bulletId].box;
    boundingBox.x = bulletsData[bulletId].x;
    boundingBox.y = bulletsData[bulletId].y;
    boundingBox.width = bulletsData[bulletId].width;
    boundingBox.height = bulletsData[bulletId].height;
}

export function handleDevEnemyBoundingBox(app, boundingBoxes, enemyData, playerLength) {
    if (!boundingBoxes[enemyData.id]) {
        const boundingBox = new Graphics();
        boundingBox.lineStyle({ width: 1, color: 0xff00ff , alpha: 1 });
        boundingBox.drawRect(
            -playerLength / 2 + 32,
            -playerLength / 2 + 32,
            playerLength,
            playerLength
        );
        app.stage.addChild(boundingBox);
        boundingBoxes[enemyData.id] = {box: boundingBox};
    }

    const boundingBox = boundingBoxes[enemyData.id].box;
    boundingBox.x = enemyData.x;
    boundingBox.y = enemyData.y;
    boundingBox.width = playerLength;
    boundingBox.height = playerLength;
}

export function handleDevWallBoundingBox(app, boundingBoxes, wallsData) {
    console.log("fat sigmas");
    for (const wallId in wallsData) {
        console.log(wallId);
        console.log(wallsData[wallId].x);
        console.log(wallsData[wallId].y);
        console.log(wallsData[wallId].width);
        console.log(wallsData[wallId].height);
        if (!boundingBoxes[wallId]) {
            const boundingBox = new Graphics();
            boundingBox.lineStyle({ width: 1, color: 0xff0000, alpha: 1 });
            boundingBox.drawRect(
                wallsData[wallId].x - 8,
                wallsData[wallId].y - 8,
                wallsData[wallId].width,
                wallsData[wallId].height
            );
            app.stage.addChild(boundingBox);
            boundingBoxes[wallId] = {box: boundingBox};
        }
    
        const boundingBox = boundingBoxes[wallId];
        boundingBox.x = wallsData[wallId].x;
        boundingBox.y = wallsData[wallId].y;
        boundingBox.width = wallsData[wallId].width;
        boundingBox.height = wallsData[wallId].height;
    }
}