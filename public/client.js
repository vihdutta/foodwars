import { background_init, menu_dimmer_init, player_init, coordinates_text_init, fps_text_init, inventory_init, health_bar_init, health_bar_value_init, socket_text_init, notification_init, bullet_count_init, ping_init } from './graphics.js';
import { handleDevBoundingBox, handleDevBulletBoundingBox, handleDevEnemyBoundingBox, handleDevWallBoundingBox } from './dev.js';
import { returnUsername } from './util.js';
import { mouse, keyboard, handleMouseMove, handleKeyDown, handleKeyUp } from './movement.js';
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

// setup socket
const socket = io("ws://localhost:6969");
socket.on("connect", () => {
  console.log("socket", socket.id, "connected");
});

// init 
const app = new Application({
  width: 500,
  height: 500,
  transparent: false,
  antialias: true,
});

background_init(app, socket);
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

// EVENT LISTENERS
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("mousemove", handleMouseMove);
window.addEventListener("mousedown", handleMouseDown);

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

    if (dev) {
      handleDevEnemyBoundingBox(app, boundingBoxes, enemyData, playerLength);
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

    if (dev) {
      handleDevBoundingBox(app, boundingBoxes, playerData, playerLength);
    }
  }
});

socket.on("clientUpdateAllWalls", (wallsData) => {
  for (const wallId in wallsData) {
    handleDevWallBoundingBox(app, boundingBoxes, wallsData[wallId]);
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
      keyboard: keyboard
    });
  }
}, 10);

// BULLETS
let bulletSprites = {};

setInterval(() => {
  coordinatesText.text = "(" + Math.round(player.x / 50) + ", " + Math.round(player.y / 50) + ")";
  bulletCount.text = "Bullets: " + Object.keys(bulletSprites).length;
}, 100);

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
  fireIntervalId = null;
}

function fireBullet() {
  if (playing) {
    const offsetFactor = 50; // bullet offset from player
    socket.emit("serverUpdateNewBullet", {
      id: Math.random(),
      parent_id: socket.id,
      parent_username: username,
      x: player.x + Math.cos(player.rotation - Math.PI / 2) * offsetFactor,
      y: player.y + Math.sin(player.rotation - Math.PI / 2) * offsetFactor,
      width: 35, // width and height really rough estimate of the bullet size. real range 35-45 (idk why)
      height: 35,
      rotation: player.rotation - Math.PI / 2,
    });
  }
}

function shootBulletsContinuously() {
  if (fireIntervalId === null) {
    fireBullet(); // Fire immediately on mouse down
    fireIntervalId = setInterval(() => {
      if (isMouseDown) {
        fireBullet();
      }
    }, 100); // rate of fire
  }
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

  if (dev) {
    Object.keys(bulletsData).forEach((bulletId) => {
      handleDevBulletBoundingBox(app, boundingBoxes, bulletsData, bulletId);
    });
  }
});

// bounding boxes
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

function handleWheel(event) {
  const zoomIntensity = 0.1;
  if (event.deltaY < 0) {
    // Scrolling up
    camera.scale += zoomIntensity;
  } else {
    // Scrolling down
    camera.scale -= zoomIntensity;
  }
  camera.scale = Math.max(0.1, Math.min(camera.scale, 1.5)); // Limit the zoom level
  app.stage.scale.set(camera.scale);
}

window.addEventListener("wheel", handleWheel);

app.ticker.add(() => {
  updateCamera(app, player, 
    camera, UIElements, 
    dimRectangle, coordinatesText, 
    FPSText, socketText, inventory, 
    healthBar, healthBarValue, notificationContainer, 
    bulletCount, pingText);
});

// when spawn is pressed
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
  username = returnUsername();
});

// dev
document.addEventListener("keydown", (event) => {
  if (event.key === "`") {
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
document.body.appendChild(app.view);
UIElements.addChild(socketText);
UIElements.addChild(inventory);
UIElements.addChild(healthBar);
UIElements.addChild(healthBarValue);
UIElements.addChild(coordinatesText);
UIElements.addChild(FPSText); // removed UIElements since that is added seperately (however all elems inside need to be added to it beforehand)
UIElements.addChild(bulletCount);
UIElements.addChild(pingText);
app.stage.addChild(notificationContainer);
app.stage.addChild(dimRectangle);