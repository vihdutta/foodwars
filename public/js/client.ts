/**
 * client.ts - main game client logic
 * handles rendering, socket communication, and game state management
 */

// graphics and UI imports
import {
  background_init,
  menu_dimmer_init, 
  player_init,
  fps_text_init,
  health_bar_init, 
  health_bar_value_init,
  socket_text_init, 
  notification_init, 
  bullet_count_init, 
  ping_init,
  wall_count_init, 
  centering_test_init, 
  username_init,
  timer_init,
  enemy_ui_init,
  ammo_display_init,
  reload_indicator_init
} from './graphics.js';

// development and utility imports
import { 
  handleDevBoundingBox, 
  handleDevBulletBoundingBox, 
  handleDevEnemyBoundingBox, 
  handleDevWallBoundingBox 
} from './dev.js';
import { returnUsername } from './util.js';
import { 
  mouse, 
  keyboard, 
  handleMouseMove, 
  handleMouseDown, 
  handleMouseUp, 
  handleKeyDown, 
  handleKeyUp 
} from './movement.js';
import { updateCamera } from './camera.js';

// external library declarations
declare const PIXI: any;
declare const io: any;

// pixi.js type imports
import type { Text, Graphics } from 'pixi.js';

// local type imports
import type { WallData, DeathInfo, PlayerStats } from './types.js';

// death screen imports
import { showDeathScreen, hideDeathScreen, forceCloseDeathScreen } from './death-screen.js';

// styling imports
import { showMenuDimmer, hideMenuDimmer } from './styling.js';

// ammo system imports
import {
  canFire,
  fireBullet,
  canReload,
  startReload,
  updateReload,
  isReloading,
  updateAmmoDisplay,
  updateReloadIndicator,
  resetAmmo
} from './ammo-system.js';

// ===== TYPES AND INTERFACES =====

interface EnemyUI {
  nameText: Text;
  hpBarBg: Graphics;
  hpBar: Graphics;
}

interface EnemyUIElements {
  container: any;
  healthBar: any;
  healthBarValue: any;
  usernameText: any;
}

// ===== CONSTANTS =====

// pixi.js application constants
const PIXI_CONFIG = {
  width: 500,
  height: 500,
  backgroundAlpha: 1,
  antialias: true,
  resolution: window.devicePixelRatio,
  resizeTo: window,
} as const;

// game constants (preserve exact math values)
const GAME_CONSTANTS = {
  PLAYER_LENGTH: 70,
  ENEMY_SPRITE_SCALE: 2,
  ENEMY_ANCHOR: 0.5,
  ENEMY_POSITION_OFFSET_X: 32 - 4, // preserve exact math
  ENEMY_POSITION_OFFSET_Y: 32 - 4, // preserve exact math
  ENEMY_UI_Y_OFFSET: -50,
  HEALTH_BAR_BASE_WIDTH: 60,
  HEALTH_BAR_BASE_HEIGHT: 6,
  HEALTH_BAR_VALUE_MULTIPLIER: 0.6,
  HEALTH_BAR_VALUE_OFFSET: -2,
  HEALTH_BAR_VALUE_HEIGHT: 4,
  HEALTH_BAR_X_OFFSET: -10,
  HEALTH_BAR_Y_BASE: 120,
  HEALTH_BAR_Y_DIVISOR: 6,
  SCREEN_WIDTH_DIVISOR: 1500,
  SCREEN_SIZE_CLAMP: 100,
} as const;

// enemy UI bar configuration (preserve original values)
const ENEMY_BAR_CONFIG = {
  WIDTH: 50,
  HEIGHT: 5,
  Y_OFFSET: 8,
} as const;

// ===== GLOBAL VARIABLES =====

// pixi.js setup
const Application = PIXI.Application;
const Sprite = PIXI.Sprite;
const Assets = PIXI.Assets;

// game state variables
let dev = false;
let playing = false;
let username = " ";
let lastPingSentTime: number = 0;
let widthForHealthBar: number = 0;

// Function to check if player is currently playing
export function isPlayerPlaying(): boolean {
  return playing;
}

// Function to get current player's username
export function getCurrentUsername(): string {
  return username;
}

// pixi containers and collections
let UIElements = new PIXI.Container();
let boundingBoxes: {[key: string]: any} = {};
const enemyUIElements: {[key: string]: EnemyUIElements} = {};
const enemyUI: Record<string, EnemyUI> = {};
const enemySprites: {[key: string]: any} = {};

// ===== SOCKET SETUP =====

/**
 * extracts room ID from URL hash, defaults to "0"
 */
function getRoomFromHash(): string {
  const hash = window.location.hash;
  return hash.length > 1 ? hash.slice(1) : "0";
}

// socket connection configuration
const { protocol, hostname } = window.location;
const port = (hostname === 'localhost') ? '8080' : window.location.port; 
const socketUrl = `${protocol}//${hostname}${port ? `:${port}` : ''}`;
const socket = io(socketUrl);

// socket connection handler
socket.on("connect", () => {
  console.log("🔌 socket", socket.id, "connected");
  socket.emit("joinRoom", getRoomFromHash());
  (window as any).socket = socket;

  if ((window as any).authManager) {
    (window as any).authManager.authenticateSocketIfReady();
  }
});

// ===== PIXI APPLICATION SETUP =====

const app = new Application(PIXI_CONFIG);

// initialize enemy UI container
const enemyUIContainer = enemy_ui_init();
app.stage.addChild(enemyUIContainer);

// initialize game world and UI elements
let wallsData: Record<string, WallData> = await background_init(app, socket);
const player = await player_init();
const dimRectangle = menu_dimmer_init(player); // legacy - returns null now
const FPSText = fps_text_init(app, player);
const healthBar = health_bar_init();
const healthBarValue = health_bar_value_init();
const socketText = socket_text_init(socket);
const { notificationContainer, notification } = notification_init();
const bulletCount = bullet_count_init();
const pingText = ping_init();
const wallCount = wall_count_init();
const centering_test = centering_test_init();
const usernameText = username_init();
const timerText = timer_init();
const ammoDisplay = ammo_display_init();
const reloadIndicator = reload_indicator_init();

// ===== EVENT LISTENERS =====

// input event listeners
window.addEventListener("keydown", handleKeyDown);
window.addEventListener("keyup", handleKeyUp);
window.addEventListener("mousemove", handleMouseMove);
window.addEventListener('mousedown', handleMouseDown);
window.addEventListener('mouseup', handleMouseUp);

// ===== ENEMY RENDERING =====

// load enemy texture
const enemyTexture = await Assets.load("images/enemies.png");

/**
 * renders and updates enemy sprites and UI elements
 */
function renderEnemies(enemiesData: any): void {
  // create or update enemy sprites
  for (const enemyId in enemiesData) {
    const enemyData = enemiesData[enemyId];
    
    // create new enemy sprite if needed
    if (!enemySprites[enemyId] && enemiesData[enemyId].health > 0) {
      const enemySprite = Sprite.from(enemyTexture);
      enemySprite.scale.set(GAME_CONSTANTS.ENEMY_SPRITE_SCALE, GAME_CONSTANTS.ENEMY_SPRITE_SCALE);
      enemySprite.anchor.set(GAME_CONSTANTS.ENEMY_ANCHOR, GAME_CONSTANTS.ENEMY_ANCHOR);
      app.stage.addChild(enemySprite);
      enemySprites[enemyId] = enemySprite;

      // initialize UI elements for new enemy
      if (!enemyUIElements[enemyId]) {
        const container = new PIXI.Container();
        const healthBar = health_bar_init();
        const healthBarValue = health_bar_value_init();
        const usernameText = username_init();
        
        container.addChild(healthBar);
        container.addChild(healthBarValue);
        container.addChild(usernameText);
        
        enemyUIContainer.addChild(container);
        enemyUIElements[enemyId] = {
          container,
          healthBar,
          healthBarValue,
          usernameText
        };
      }
    }

    // update enemy sprite position and rotation
    const enemySprite = enemySprites[enemyId];
    enemySprite.x = enemyData.x + GAME_CONSTANTS.ENEMY_POSITION_OFFSET_X;
    enemySprite.y = enemyData.y + GAME_CONSTANTS.ENEMY_POSITION_OFFSET_Y;
    enemySprite.rotation = enemyData.rotation;

    // update enemy UI elements
    if (enemyUIElements[enemyId]) {
      const { container, healthBar, healthBarValue, usernameText } = enemyUIElements[enemyId];
      
      // position container relative to enemy
      container.x = enemyData.x;
      container.y = enemyData.y + GAME_CONSTANTS.ENEMY_UI_Y_OFFSET;
      
      // calculate responsive scaling factor
      const scaleFactor = Math.min(GAME_CONSTANTS.SCREEN_SIZE_CLAMP, window.innerWidth / GAME_CONSTANTS.SCREEN_WIDTH_DIVISOR);
      
      // update health bar dimensions
      healthBar.width = GAME_CONSTANTS.HEALTH_BAR_BASE_WIDTH * scaleFactor;
      healthBar.height = GAME_CONSTANTS.HEALTH_BAR_BASE_HEIGHT * scaleFactor;
      healthBarValue.width = (enemiesData[enemyId].health * GAME_CONSTANTS.HEALTH_BAR_VALUE_MULTIPLIER + GAME_CONSTANTS.HEALTH_BAR_VALUE_OFFSET) * scaleFactor;
      healthBarValue.height = GAME_CONSTANTS.HEALTH_BAR_VALUE_HEIGHT * scaleFactor;
      
      // update username text
      usernameText.text = enemyData.username || "Enemy";
      usernameText.anchor.set(GAME_CONSTANTS.ENEMY_ANCHOR, 0);
      usernameText.y = 0;
      
      // position health bar elements
      healthBar.x = GAME_CONSTANTS.HEALTH_BAR_X_OFFSET;
      healthBar.y = GAME_CONSTANTS.HEALTH_BAR_Y_BASE + (healthBar.height - healthBarValue.height) / GAME_CONSTANTS.HEALTH_BAR_Y_DIVISOR;
      healthBarValue.x = GAME_CONSTANTS.HEALTH_BAR_X_OFFSET;
      healthBarValue.y = GAME_CONSTANTS.HEALTH_BAR_Y_BASE + (healthBar.height - healthBarValue.height) / GAME_CONSTANTS.HEALTH_BAR_Y_DIVISOR;
    }

    // render development bounding boxes if enabled
    if (dev) {
      handleDevEnemyBoundingBox(app, boundingBoxes, enemyData, GAME_CONSTANTS.PLAYER_LENGTH);
    }
  }

  // clean up dead or disconnected enemies
  for (const enemyId in enemySprites) {
    const enemyData = enemiesData[enemyId];
    if (!enemyData || enemyData.health <= 0) {
      // remove sprite from stage
      const sprite = enemySprites[enemyId];
      app.stage.removeChild(sprite);
      delete enemySprites[enemyId];

      // remove UI elements
      if (enemyUIElements[enemyId]) {
        const { container } = enemyUIElements[enemyId];
        enemyUIContainer.removeChild(container);
        delete enemyUIElements[enemyId];
      }
    }
  }
}

// ===== SOCKET EVENT HANDLERS =====

/**
 * handles enemy updates from server
 */
socket.on("clientUpdateAllEnemies", (enemiesData: Record<string, any>) => {
  // exclude self from enemy list
  delete enemiesData[socket.id];

  // cleanup legacy enemy UI elements
  for (const id in enemyUI) {
    const died = !enemiesData[id] || enemiesData[id].health <= 0;
    if (died) {
      const { hpBarBg, hpBar, nameText } = enemyUI[id];
      app.stage.removeChild(hpBarBg, hpBar, nameText);
      delete enemyUI[id];
    }
  }

  // cleanup modern enemy UI elements
  for (const id in enemyUIElements) {
    const died = !enemiesData[id] || enemiesData[id].health <= 0;
    if (died) {
      const { container } = enemyUIElements[id];
      enemyUIContainer.removeChild(container);
      delete enemyUIElements[id];
      app.stage.removeChild(enemySprites[id]);
      delete enemySprites[id];
    }
  }

  // render all current enemies
  renderEnemies(enemiesData);
});

/**
 * handles player state updates from server
 */
socket.on("clientUpdateSelf", (playerData: any) => {
  if (playing) {
    // update health bar or handle death
    if (playerData.health <= 100 && playerData.health > 0) {
      // preserve exact math: health * 0.6 - 2
      widthForHealthBar = playerData.health * 0.6 - 2;
    } else {
      // handle player death
      console.log("💀 player died");
      playing = false;
      widthForHealthBar = 0;
      
      // remove game elements and show menu
      app.stage.removeChild(player);
      app.stage.removeChild(UIElements);
      
      // show menu dimmer for death state
      showMenuDimmer();
      
      // note: death screen will be shown via "showDeathScreen" socket event
      // this just handles the game state cleanup
    }
    
    // update player position and rotation (preserve exact math: + 32)
    player.x = playerData.x + 32;
    player.y = playerData.y + 32;
    player.rotation = playerData.rotation;

    // render development bounding boxes if enabled
    if (dev) {
      handleDevBoundingBox(app, boundingBoxes, playerData, GAME_CONSTANTS.PLAYER_LENGTH);
    }
  }
});

// ===== GAME LOOP =====

/**
 * sends player updates to server at 100fps
 */
setInterval(() => {
  if (playing) {
    // handle reload input
    if (keyboard.r) {
      startReload();
      keyboard.r = false; // Prevent continuous reloading while holding R
    }
    
    // update reload progress
    updateReload();
    
    // update ammo UI
    updateAmmoDisplay(ammoDisplay);
    updateReloadIndicator(reloadIndicator);
    
    // attempt to fire if mouse button is pressed
    // ammo system handles cooldown and availability internally
    let actuallyFired = false;
    if (mouse.mb1) {
      actuallyFired = fireBullet();
    }
    
    socket.emit("serverUpdateSelf", {
      id: socket.id,
      username: username,
      // calculate rotation from mouse position (preserve exact math)
      rotation: Math.atan2(
        mouse.y - app.renderer.height / 2,
        mouse.x - app.renderer.width / 2
      ) + Math.PI / 2,
      mb1: actuallyFired, // Only send true if we actually fired (consumed ammo)
      keyboard: keyboard
    });
  }
}, 10);

// ===== BULLET SYSTEM =====

// bullet sprite collection
let bulletSprites: {[key: string]: any} = {};

// load bullet texture
const bulletTexture = await Assets.load("images/bullet.png");

/**
 * handles new bullet creation from server
 */
socket.on("clientUpdateNewBullet", (bulletData: any) => {
  const bulletSprite = Sprite.from(bulletTexture);
  bulletSprite.scale.set(1, 1);
  bulletSprite.anchor.set(0.5, 0.5);
  bulletSprite.x = bulletData.x;
  bulletSprite.y = bulletData.y;
  bulletSprite.width = bulletData.width;
  bulletSprite.height = bulletData.height;
  app.stage.addChild(bulletSprite);
  bulletSprites[bulletData.id] = bulletSprite;
});

/**
 * handles bullet position updates from server
 */
socket.on("clientUpdateAllBullets", (bulletsData: any) => {
  const connectedBulletIds = Object.keys(bulletsData);
  bulletCount.text = "Bullets: " + Object.keys(bulletsData).length;
  
  // update existing bullets or remove disconnected ones
  for (const bulletId in bulletSprites) {
    if (!connectedBulletIds.includes(bulletId)) {
      // remove bullet that no longer exists on server
      const bulletSprite = bulletSprites[bulletId];
      app.stage.removeChild(bulletSprite);
      delete bulletSprites[bulletId];
      continue;
    }
    
    // update bullet position and rotation
    const bulletData = bulletsData[bulletId];
    const bulletSprite = bulletSprites[bulletId];
    bulletSprite.x = bulletData.x;
    bulletSprite.y = bulletData.y;
    bulletSprite.rotation = bulletData.rotation;
  }

  // render development bounding boxes for bullets if enabled
  if (dev) {
    Object.keys(bulletsData).forEach((bulletId) => {
      handleDevBulletBoundingBox(app, boundingBoxes, bulletsData, bulletId);
    });
  }
});

// ===== DEVELOPMENT TOOLS =====

/**
 * cleanup timer for development bounding boxes
 */
setInterval(() => {
  Object.keys(boundingBoxes).forEach((id) => {
    // preserve exact math: -= 0.01
    boundingBoxes[id].timer -= 0.01;
    if (boundingBoxes[id].timer <= 0) {
      app.stage.removeChild(boundingBoxes[id].box);
      delete boundingBoxes[id];
    }
  });
}, 10);

/**
 * handles kill notifications from server
 */
socket.on("notification", (text: string) => {
  notification(text);
});

/**
 * handles death screen display from server
 */
socket.on("showDeathScreen", (deathInfo: DeathInfo) => {
  console.log("🪦 showing death screen", deathInfo);
  showDeathScreen(deathInfo);
});

/**
 * handles stats updates from server
 */
socket.on("statsUpdate", (data: { stats: PlayerStats; deathInfo?: DeathInfo }) => {
  console.log("📊 stats update", data);
  // stats updates can be used for live stat displays if needed
});

/**
 * handles kill feed updates from server
 */
socket.on("killFeed", (data: { killer: string; victim: string; weapon: string; killerStats: PlayerStats }) => {
  console.log("🔥 kill feed", data);
  // kill feed can be used for displaying recent kills
});

/**
 * handles timer updates from server
 */
socket.on("timerUpdate", (data: { remainingTime: number }) => {
  const minutes = Math.floor(data.remainingTime / 60);
  const seconds = Math.floor(data.remainingTime % 60);
  timerText.text = `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

/**
 * handles game ended event from server
 */
socket.on("gameEnded", (data: { finalStats: Array<{ username: string; stats: PlayerStats }> }) => {
  console.log("🏁 game ended", data);
  playing = false;
  
  // force close death screen if it's open
  forceCloseDeathScreen();
  
  // remove game elements
  if (app.stage.children.includes(player)) {
    app.stage.removeChild(player);
  }
  if (app.stage.children.includes(UIElements)) {
    app.stage.removeChild(UIElements);
  }
  
  // show menu dimmer
  showMenuDimmer();
  
  // import and show game ended screen
  import('./game-ended.js').then(({ showGameEndedScreen }) => {
    // find current player's stats from the final stats (now by socket ID)
    const currentPlayerStats = data.finalStats.find((p: any) => p.socketId === socket.id);
    
    // Extract PlayerStats from the data structure (handle nested stats)
    const playerStats: PlayerStats = currentPlayerStats ? 
      (currentPlayerStats.stats || currentPlayerStats) as PlayerStats : {
      kills: 0,
      deaths: 0,
      damageDealt: 0,
      shotsFired: 0,
      shotsHit: 0,
      timeAlive: 0,
      gamesPlayed: 0
    };
    
    showGameEndedScreen(playerStats, data.finalStats as any);
  });
});

// ===== CAMERA SYSTEM =====

// camera configuration (preserve exact math: / 2)
const camera = {
  x: app.renderer.width / 2,
  y: app.renderer.height / 2,
  scale: 1,
};

// camera update loop
app.ticker.add(() => {
  updateCamera(
    app, 
    player, 
    widthForHealthBar,
    camera, 
    UIElements,
    null, // dimRectangle is now null - using HTML dimming system
    null, // coordinatesText is now null - removing coordinates text
    FPSText, 
    socketText, 
    null, // inventory is now null - removing inventory
    healthBar, 
    healthBarValue, 
    bulletCount, 
    pingText, 
    wallCount, 
    usernameText,
    timerText,
    ammoDisplay,
    reloadIndicator
  );
});

// ===== UI EVENT HANDLERS =====

/**
 * handles spawn button click to start game
 */
const spawnButton = document.getElementById("spawn");
if (spawnButton) {
  spawnButton.addEventListener("click", function () {
    playing = true;
    
    // reset ammo to starting state
    resetAmmo();
    
    // hide death screen if it's showing
    hideDeathScreen();
    
    // hide game-ended screen if it's showing
    const gameEndedScreen = document.getElementById("game-ended-screen");
    if (gameEndedScreen) {
      document.body.removeChild(gameEndedScreen);
    }
    
    // add game elements and hide menu
    app.stage.addChild(player);
    app.stage.addChild(UIElements);
    
    // hide menu dimmer when playing
    hideMenuDimmer();
    
    // hide main UI and auth section
    const mainUI = document.getElementById("main-ui");
    if (mainUI) {
      mainUI.style.display = "none";
    }
    const authSection = document.getElementById("auth-section");
    if (authSection) {
      authSection.style.display = "none";
    }
    
    // get username from input
    username = returnUsername();
  });
} else {
  console.error("❌ spawn button not found");
}

/**
 * handles development mode toggle with backtick key
 */
document.addEventListener("keydown", (event) => {
  if (event.key === "`") {
    if (dev) {
      // disable dev mode and cleanup bounding boxes
      console.log("🔧 removing bounding boxes");
      console.log(boundingBoxes);
      Object.keys(boundingBoxes).forEach((id) => {
        app.stage.removeChild(boundingBoxes[id].box);
        delete boundingBoxes[id];
      });
    } else {
      // enable dev mode and show wall bounding boxes
      handleDevWallBoundingBox(app, boundingBoxes, wallsData);
    }
    dev = !dev;
    console.log("🔧 dev mode toggled:", dev);
  }
});

// ===== PING SYSTEM =====

/**
 * handles ping response from server
 */
socket.on("pong", (serverTime: number, clientTime: number) => {
  const now = Date.now();
  const latency = (now - clientTime) / 2;
  const ping = Date.now() - lastPingSentTime;
  pingText.text = "Ping: " + ping + "ms";
  return latency;
});

/**
 * sends ping to server for latency measurement
 */
function sendPing(): void {
  const now = Date.now();
  socket.emit('ping', now);
  lastPingSentTime = now;
}

// send ping every second
setInterval(sendPing, 1000);

// ===== CANVAS AND UI SETUP =====

// add canvas to DOM
document.body.appendChild(app.view);

// add UI elements to container
UIElements.addChild(socketText);
UIElements.addChild(healthBar);
UIElements.addChild(healthBarValue);
UIElements.addChild(FPSText);
UIElements.addChild(bulletCount);
UIElements.addChild(pingText);
UIElements.addChild(wallCount);
UIElements.addChild(centering_test);
UIElements.addChild(usernameText);
UIElements.addChild(timerText);
UIElements.addChild(ammoDisplay);
UIElements.addChild(reloadIndicator);

// add containers to stage
if (notificationContainer) {
  app.stage.addChild(notificationContainer);
}


// show menu dimmer initially (homescreen)
showMenuDimmer();
function layoutUI(): void {
  const w = app.screen.width;
  const h = app.screen.height;
  const pad = 0.02;

  centering_test.position.set(
    w * pad,
    h * (1 - pad) - centering_test.height
  );
}

// initial layout and resize listener
layoutUI();
window.addEventListener("resize", layoutUI);

