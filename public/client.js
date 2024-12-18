import {
  background_init,
  menu_dimmer_init, player_init,
  coordinates_text_init, fps_text_init,
  inventory_init, health_bar_init, health_bar_value_init,
  socket_text_init, notification_init, bullet_count_init, ping_init,
  wall_count_init
} from './graphics.js';
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
let boundingBoxes = {};

// setup socket
const socketURLs = {
  domain1: "wss://foodwars.vihdutta.com",
  domain2: "wss://app-112130365883.us-east4.run.app ",
  domain3: "wss://app-dwjio4hwba-uk.a.run.app ",
};
const domain = window.location.hostname;
let socketUrl = socketURLs[domain];
if (!socketUrl) {
  socketUrl = "ws://localhost:8080";
}
const socket = io(socketUrl);
socket.on("connect", () => {
  console.log("socket", socket.id, "connected");
});

// init app and gui
const app = new Application({
  width: 500,
  height: 500,
  transparent: false,
  antialias: true,
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

// EVENT LISTENERS
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("mousemove", handleMouseMove);
window.addEventListener("mousedown", handleMouseDown);

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
    enemySprite.x = enemyData.x + 32;
    enemySprite.y = enemyData.y + 32;
    enemySprite.rotation = enemyData.rotation;

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
    const audio = new Audio('mp3/pop.mp3');
    audio.play();
    const offsetFactor = 30; // bullet offset from player
    socket.emit("serverUpdateNewBullet", {
      id: crypto.randomUUID(),
      parent_id: socket.id,
      parent_username: username,
      x: player.x + Math.cos(player.rotation - Math.PI / 2) * offsetFactor,
      y: player.y + Math.sin(player.rotation - Math.PI / 2) * offsetFactor,
      width: 20,
      height: 20,
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
      continue;
    }
    const bulletData = bulletsData[bulletId];
    const bulletSprite = bulletSprites[bulletId];
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

// putting away while fixing other issues
// function handleWheel(event) {
//   const zoomIntensity = 0.1;
//   if (event.deltaY < 0) {
//     // Scrolling up
//     camera.scale += zoomIntensity;
//   } else {
//     // Scrolling down
//     camera.scale -= zoomIntensity;
//   }
//   camera.scale = Math.max(0.8, Math.min(camera.scale, 1.2)); // Limit the zoom level
//   app.stage.scale.set(camera.scale);
// }

// window.addEventListener("wheel", handleWheel);

app.ticker.add(() => {
  updateCamera(app, player,
    camera, UIElements,
    dimRectangle, coordinatesText,
    FPSText, socketText, inventory,
    healthBar, healthBarValue, notificationContainer,
    bulletCount, pingText, wallCount);
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
app.stage.addChild(notificationContainer);
app.stage.addChild(dimRectangle);