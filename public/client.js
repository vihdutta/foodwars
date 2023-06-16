const Application = PIXI.Application;
const Sprite = PIXI.Sprite;
const Assets = PIXI.Assets;

const socket = io("ws://localhost:6969");
socket.on("connect", () => {
  console.log("socket", socket.id, "connected");
});

// BASIC SETUP
let DEV = false;
let playing = false;
const playerLength = 70;

const app = new Application({
  width: 500,
  height: 500,
  transparent: false,
  antialias: true,
});

const background = await Assets.load("images/img.jpg");
const backgroundSprite = Sprite.from(background);
backgroundSprite.x = 0;
backgroundSprite.y = 0;
backgroundSprite.scale.set(2, 2);

app.renderer.background.color = "#23395D";
app.renderer.resize(window.innerWidth, window.innerHeight);
app.renderer.view.style.position = "absolute";

const Graphics = PIXI.Graphics;
const sample = new Graphics();
sample.beginFill(0xffffff).drawRect(0, 0, 200, 2000).endFill();

// ADDING PLAYER FIRST SO I CAN PUT COORDINATESTEXT
const playerTexture = await Assets.load("images/player.png");
const player = Sprite.from(playerTexture);
player.scale.set(2, 2);
player.anchor.set(0.5, 0.5);

// DRAW UI ELEMENTS
let UIElements = new PIXI.Container();

const dimRectangle = new Graphics();
dimRectangle.beginFill(0x000000, 0.2);
dimRectangle.drawRect(
  player.x,
  player.y,
  window.innerWidth,
  window.innerHeight
);
dimRectangle.endFill();

const coordinatesText = new PIXI.Text("(" + player.x + ", " + player.y + ")", {
  fontFamily: "Arial",
  fontSize: 30,
  fill: "ffffff",
});
coordinatesText.x = 0;
coordinatesText.y = 0;

setInterval(() => {
  coordinatesText.text = "(" + player.x / 50 + ", " + player.y / 50 + ")";
}, 100);

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

const socketText = new PIXI.Text("SOCKET ID: " + socket.id, {
  fontFamily: "Arial",
  fontSize: 10,
  fill: "ffffff",
});
socketText.x = 0;
socketText.y = 0;

const inventory = new Graphics();
inventory.lineStyle({ width: 2, color: 0x000000, alpha: 0.5 });
inventory.beginFill(0x222222);
inventory.drawRoundedRect(0, 0, 500, 55, 5);
inventory.endFill();
inventory.x = 0;
inventory.y = 0;

const healthBar = new Graphics();
healthBar.lineStyle({ width: 2, color: 0x000000, alpha: 0.5 });
healthBar.beginFill(0x222222);
healthBar.drawRoundedRect(0, 0, 500, 30, 5);
healthBar.endFill();
healthBar.x = 0;
healthBar.y = 0;

const healthBarValue = new Graphics();
healthBarValue.beginFill(0x13ea22);
healthBarValue.drawRoundedRect(0, 0, 500, 30, 5);
healthBarValue.endFill();
healthBarValue.x = 0;
healthBarValue.y = 0;

const shieldBar = new Graphics();
shieldBar.lineStyle({ width: 3, color: 0x000000, alpha: 0.3 });
shieldBar.beginFill(0x0198ef);
shieldBar.drawRoundedRect(0, 0, 500, 25, 5);
shieldBar.endFill();
shieldBar.x = 0;
shieldBar.y = 0;

// CHANGING PROPERTIES
const mouse = {
  x: 0,
  y: 0,
};

const camera = {
  x: app.renderer.width / 2,
  y: app.renderer.height / 2,
};

const keyboard = {
  w: false,
  a: false,
  s: false,
  d: false,
  shift: false,
};

// EVENT LISTENERS
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("mousemove", handleMouseMove);
window.addEventListener("mousedown", handleMouseDown);

// KEY EVENT HANDLER FUNCTIONS
function handleKeyDown(event) {
  const key = event.key.toLowerCase();
  if (keyboard.hasOwnProperty(key)) {
    keyboard[key] = true;
  }
}

function handleKeyUp(event) {
  const key = event.key.toLowerCase();
  if (keyboard.hasOwnProperty(key)) {
    keyboard[key] = false;
  }
}

function handleMouseMove(event) {
  mouse.x = event.clientX;
  mouse.y = event.clientY;
}

// PLAYERS
const enemySprites = {}; // Stores the other player sprites

const enemyTexture = await Assets.load("images/enemies.png");
function renderEnemies(enemiesData) {
  for (const enemyId in enemiesData) {
    const enemyData = enemiesData[enemyId];
    if (!enemySprites[enemyData.id] && enemiesData[enemyId].health > 0) {
      // Create a new PIXI sprite for the player
      const enemySprite = Sprite.from(enemyTexture);
      enemySprite.scale.set(2, 2);
      enemySprite.anchor.set(0.5, 0.5);
      app.stage.addChild(enemySprite);
      enemySprites[enemyData.id] = enemySprite;
    }

    const enemySprite = enemySprites[enemyData.id];
    enemySprite.x = enemyData.x;
    enemySprite.y = enemyData.y;
    enemySprite.rotation = enemyData.rotation;

    if (DEV) {
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
  }
}

socket.on("clientUpdateAllEnemies", (enemiesData) => {
  const connectedEnemyIds = Object.keys(enemiesData);
  // Iterate over the existing player sprites
  for (const enemyId in enemySprites) {
    // Check if the player is still connected
    if (!connectedEnemyIds.includes(enemyId) || enemiesData[enemyId].health <= 0) {
      // Player is disconnected, remove the sprite
      const enemySprite = enemySprites[enemyId];
      app.stage.removeChild(enemySprite);
      delete enemySprites[enemyId];
    }
  }

  renderEnemies(enemiesData);
});


let boundingBoxes = {};

setInterval(() => {
  Object.keys(boundingBoxes).forEach((id) => {
    boundingBoxes[id].timer -= 0.01;
    if (boundingBoxes[id].timer <= 0) {
      app.stage.removeChild(boundingBoxes[id].box);
      delete boundingBoxes[id];
    }
  });
}, 10);

socket.on("clientUpdateSelf", (playerData) => {
  if (playing) {
    if (playerData.health <= 100 && playerData.health > 0) {
      healthBarValue.width = playerData.health * 5;
    } else {
      console.log("dead");
      playing = false;
      healthBarValue.width = 0;
      app.stage.removeChild(player);
      app.stage.removeChild(UIElements);
      app.stage.addChild(dimRectangle);
      var elements = document.getElementsByClassName("container-fluid");
      for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        element.style.display = "block";
      }
    }
    player.x = playerData.x;
    player.y = playerData.y;
    player.rotation = playerData.rotation;

    if (DEV) {
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
  }
});

// BULLETS
let bulletSprites = {};
const bulletSpeed = 15;

const bulletTexture = await Assets.load("images/bullet.png");

let isMouseDown = false;
let fireIntervalId = null;

function handleMouseDown(event) {
  isMouseDown = true;
  shootBulletsContinuously();
}

function handleMouseUp(event) {
  isMouseDown = false;
  clearInterval(fireIntervalId);
}

function fireBullet() {
  if (playing) {
    const offsetFactor = 50; // Adjust this value to control the offset
    socket.emit("serverUpdateNewBullet", {
      id: Math.random(),
      parent_id: socket.id,
      parent_username: document.getElementById("name").value,
      x: player.x + Math.cos(player.rotation - Math.PI / 2) * offsetFactor,
      y: player.y + Math.sin(player.rotation - Math.PI / 2) * offsetFactor,
      width: 35, // width and height really rough estimate of the bullet size. real range 35-45 (idk why)
      height: 35,
      rotation: player.rotation - Math.PI / 2,
    });
  }
}

function shootBulletsContinuously() {
  fireIntervalId = setInterval(() => {
    if (isMouseDown) {
      fireBullet();
    } else {
      clearInterval(fireIntervalId);
    }
  }, 300); // Adjust the interval as needed
}

// Attach event listeners
document.addEventListener("mousedown", handleMouseDown);
document.addEventListener("mouseup", handleMouseUp);

socket.on("clientUpdateNewBullet", (bulletData) => {
  const bulletSprite = Sprite.from(bulletTexture);
  bulletSprite.scale.set(1, 1);
  bulletSprite.anchor.set(0.5, 0.5);
  bulletSprite.x = bulletData.x;
  bulletSprite.y = bulletData.y;
  bulletSprite.width = bulletData.width;
  bulletSprite.height = bulletData.height;
  bulletSprite.rotation = bulletData.rotation;
  app.stage.addChild(bulletSprite);
  bulletSprites[bulletData.id] = bulletSprite;
});

socket.on("clientUpdateAllBullets", (bulletsData) => {
  const connectedBulletIds = Object.keys(bulletsData);

  for (const bulletId in bulletSprites) {
    if (!connectedBulletIds.includes(bulletId)) {
      const bulletSprite = bulletSprites[bulletId];
      app.stage.removeChild(bulletSprite);
      delete bulletSprites[bulletId];
    }
    const bulletData = bulletsData[bulletId];
    const bulletSprite = bulletSprites[bulletData.id];
    bulletSprite.x = bulletData.x;
    bulletSprite.y = bulletData.y;
  }

  if (DEV) {
    Object.keys(bulletsData).forEach((bulletId) => {
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
    });
  }
});

// NOTIFICATIONS
let notifications = [];

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
    fontSize: 20,
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

socket.on("notification", (text) => {
  notification(text);
});

setInterval(() => {
  if (playing) {
    socket.emit("serverUpdateSelf", {
      id: socket.id,
      username: document.getElementById("name").value,
      rotation: Math.atan2(
        mouse.y - app.renderer.height / 2,
        mouse.x - app.renderer.width / 2
      ) + Math.PI / 2,
      keyboard: keyboard
    });
  }
}, 10);

// FRUSTUM CULLING

function hideSpritesOutsideScreen() {
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

// MAIN GAME LOOP
app.ticker.add(() => {
  hideSpritesOutsideScreen();
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
});

// EXTRA DEV STUFF
function toggleDEV() {
  DEV = !DEV;
  console.log("Variable toggled:", DEV);
}

var button = document.getElementById("spawn");
button.addEventListener("click", function () {
  playing = true;
  app.stage.addChild(player);
  app.stage.addChild(UIElements);
  app.stage.removeChild(dimRectangle);
  var elements = document.getElementsByClassName("container-fluid");
  for (var i = 0; i < elements.length; i++) {
    var element = elements[i];
    element.style.display = "none";
  }
});

// Keydown event listener
document.addEventListener("keydown", (event) => {
  // Check if the 'T' key is pressed
  if (event.key === "`") {
    toggleDEV();
  }
});

// DISPLAY ON CANVAS
document.body.appendChild(app.view);
app.stage.addChild(backgroundSprite);
app.stage.addChild(sample);
UIElements.addChild(socketText);
UIElements.addChild(inventory);
UIElements.addChild(healthBar);
UIElements.addChild(healthBarValue);
UIElements.addChild(shieldBar);
UIElements.addChild(coordinatesText);
UIElements.addChild(FPSText); // removed UIElements since that is added seperately (however all elems inside need to be added to it beforehand)
app.stage.addChild(notificationContainer);
app.stage.addChild(dimRectangle);
