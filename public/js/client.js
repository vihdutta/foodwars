import {
  background_init,
  menu_dimmer_init, player_init,
  coordinates_text_init, fps_text_init,
  inventory_init, health_bar_init, health_bar_value_init,
  socket_text_init, notification_init, bullet_count_init, ping_init,
  wall_count_init, centering_test_init
} from './graphics.js';
import { handleDevBoundingBox, handleDevBulletBoundingBox, handleDevEnemyBoundingBox, handleDevWallBoundingBox } from './dev.js';
import { returnUsername } from './util.js';
import { mouse, keyboard, handleMouseMove, handleMouseDown, handleMouseUp, handleKeyDown, handleKeyUp } from './movement.js';
import { updateCamera } from './camera.js';

// variable setup
const Application = PIXI.Application;
const Sprite = PIXI.Sprite;
const Assets = PIXI.Assets;
let dev = false;
let playing = false;
let username = " ";
let UIElements = new PIXI.Container();
let lastPingSentTime = 0;
const playerLength = 70;
let widthForHealthBar = 0;
let boundingBoxes = {};

// setup socket
let socketUrl = "ws://localhost:8080";
const socket = io(socketUrl);
socket.on("connect", () => {
  console.log("socket", socket.id, "connected");
})

// init app and gui
const app = new Application({
  width: 500,
  height: 500,
  backgroundAlpha: 1,
  antialias: true,
  resolution: window.devicePixelRatio,
  resizeTo: window,
});
let wallsData = await background_init(app, socket);
const player = await player_init();
const dimRectangle = menu_dimmer_init(player);
const coordinatesText = coordinates_text_init(player);
const FPSText = fps_text_init(app, player);
const inventory = inventory_init();
const healthBar = health_bar_init();
const healthBarValue = health_bar_value_init();
const socketText = socket_text_init(socket);
const { notificationContainer, notification } = notification_init();
const bulletCount = bullet_count_init();
const pingText = ping_init();
const wallCount = wall_count_init();
const centering_test = centering_test_init();

// EVENT LISTENERS
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("mousemove", handleMouseMove);
window.addEventListener('mousedown', handleMouseDown);
window.addEventListener('mouseup',   handleMouseUp);

// PLAYERS
const enemySprites = {}; // Stores the other player sprites
const enemyTexture = await Assets.load("images/enemies.png");
function renderEnemies(enemiesData) { // players data without the current player
  for (const enemyId in enemiesData) {
    const enemyData = enemiesData[enemyId];
    if (!enemySprites[enemyId] && enemiesData[enemyId].health > 0) {
      const enemySprite = Sprite.from(enemyTexture);
      enemySprite.scale.set(2, 2);
      enemySprite.anchor.set(0.5, 0.5);
      app.stage.addChild(enemySprite);
      enemySprites[enemyId] = enemySprite;
    }

    const enemySprite = enemySprites[enemyId];
    enemySprite.x = enemyData.x + 32 - 4; // -4 is to make sure the hitbox is in the right spot
    enemySprite.y = enemyData.y + 32 - 4; // +32 is basically the same, except the +32 makes sense because of the sprite. idk why 
    enemySprite.rotation = enemyData.rotation; // the -4 is needed

    if (dev) {
      handleDevEnemyBoundingBox(app, boundingBoxes, enemyData, playerLength); // Fixed typo here
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


socket.on("clientUpdateSelf", (playerData) => {
  if (playing) {
    if (playerData.health <= 100 && playerData.health > 0) {
      widthForHealthBar = playerData.health * 0.6 - 2;
    } else {
      console.log("dead");
      playing = false;
      widthForHealthBar = 0;
      app.stage.removeChild(player);
      app.stage.removeChild(UIElements);
      app.stage.addChild(dimRectangle);
      var elements = document.getElementsByClassName("container-fluid");
      for (var i = 0; i < elements.length; i++) {
        //var element = elements[i] as HTMLElement;
        var element = elements[i];
        element.style.display = "block";
      }
    }
    player.x = playerData.x + 32;
    player.y = playerData.y + 32;
    player.rotation = playerData.rotation;

    if (dev) {
      handleDevBoundingBox(app, boundingBoxes, playerData, playerLength);
    }
  }
});

setInterval(() => {
  if (playing) {
    socket.emit("serverUpdateSelf", {
      id: socket.id,
      username: username,
      rotation: Math.atan2(
        mouse.y - app.renderer.height / 2,
        mouse.x - app.renderer.width / 2
      ) + Math.PI / 2,
      mb1: mouse.mb1,
      keyboard: keyboard
    });
  }
}, 10);

// BULLETS
let bulletSprites = {};

const bulletTexture = await Assets.load("images/bullet.png");

socket.on("clientUpdateNewBullet", (bulletData) => { // creates a new bullet sprite
  const bulletSprite = Sprite.from(bulletTexture);
  bulletSprite.scale.set(1, 1);
  bulletSprite.anchor.set(0.5, 0.5);
  bulletSprite.x = bulletData.x;
  bulletSprite.y = bulletData.y;
  bulletSprite.width = bulletData.width;
  bulletSprite.height = bulletData.height;
  app.stage.addChild(bulletSprite);
  console.log(app.stage.getChildIndex(bulletSprite));
  bulletSprites[bulletData.id] = bulletSprite;
});

socket.on("clientUpdateAllBullets", (bulletsData) => { // updates all bullet sprites' positions
  const connectedBulletIds = Object.keys(bulletsData);
  bulletCount.text = "Bullets: " + Object.keys(bulletsData).length;
  for (const bulletId in bulletSprites) {
    if (!connectedBulletIds.includes(bulletId)) {
      const bulletSprite = bulletSprites[bulletId];
      app.stage.removeChild(bulletSprite);
      delete bulletSprites[bulletId];
      continue;
    }
    const bulletData = bulletsData[bulletId];
    const bulletSprite = bulletSprites[bulletId];
    bulletSprite.x = bulletData.x;
    bulletSprite.y = bulletData.y;
    bulletSprite.rotation = bulletData.rotation;
  }

  if (dev) {
    Object.keys(bulletsData).forEach((bulletId) => {
      handleDevBulletBoundingBox(app, boundingBoxes, bulletsData, bulletId);
    });
  }
});

// bounding boxes
setInterval(() => {
  Object.keys(boundingBoxes).forEach((id) => {
    boundingBoxes[id].timer -= 0.01;
    if (boundingBoxes[id].timer <= 0) {
      app.stage.removeChild(boundingBoxes[id].box);
      delete boundingBoxes[id];
    }
  });
}, 10);

// notification
socket.on("notification", (text) => {
  notification(text);
});

// player camera
const camera = {
  x: app.renderer.width / 2,
  y: app.renderer.height / 2,
  scale: 1,
};

app.ticker.add(() => {
  updateCamera(app, player, widthForHealthBar,
    camera, UIElements,
    dimRectangle, coordinatesText,
    FPSText, socketText, inventory,
    healthBar, healthBarValue, notificationContainer,
    bulletCount, pingText, wallCount);
});

// when spawn is pressed
var button = document.getElementById("spawn");
if (button) {
  button.addEventListener("click", function () {
    playing = true;
    app.stage.addChild(player);
    app.stage.addChild(UIElements);
    app.stage.removeChild(dimRectangle);
    var elements = document.getElementsByClassName("container-fluid");
    for (var i = 0; i < elements.length; i++) {
      //var element = elements[i] as HTMLElement;
      var element = elements[i];
      element.style.display = "none";
    }
    username = returnUsername();
  });
} else {
  console.error("Button with id 'spawn' not found.");
}

// dev
document.addEventListener("keydown", (event) => {
  if (event.key === "`") {
    if (dev) {
      console.log("Removing bounding boxes");
      console.log(boundingBoxes);
      Object.keys(boundingBoxes).forEach((id) => {
        app.stage.removeChild(boundingBoxes[id].box);
        delete boundingBoxes[id];
      });
    } else {
      handleDevWallBoundingBox(app, boundingBoxes, wallsData);
    }
    dev = !dev;
    console.log("Variable toggled:", dev);
  }
});

// PING
socket.on('pong', (serverTimestamp) => {
  const ping = Date.now() - lastPingSentTime;
  pingText.text = "Ping: " + ping + "ms";
});

function sendPing() {
  const now = Date.now();
  socket.emit('ping', now);
  lastPingSentTime = now;
}

setInterval(sendPing, 1000);


// DISPLAY ON CANVAS
// document.body.appendChild(app.view as HTMLCanvasElement);
document.body.appendChild(app.view);
UIElements.addChild(socketText);
UIElements.addChild(inventory);
UIElements.addChild(healthBar);
UIElements.addChild(healthBarValue);
UIElements.addChild(coordinatesText);
UIElements.addChild(FPSText); // removed UIElements since that is added seperately (however all elems inside need to be added to it beforehand)
UIElements.addChild(bulletCount);
UIElements.addChild(pingText);
UIElements.addChild(wallCount);
UIElements.addChild(centering_test);
app.stage.addChild(notificationContainer);
app.stage.addChild(dimRectangle);


function layoutUI() {
  const w = app.screen.width;
  const h = app.screen.height;
  const pad = 0.02;

  centering_test.position.set(
    w * pad,
    h * (1 - pad) - centering_test.height
  );
}
layoutUI();
window.addEventListener("resize", layoutUI);

