/**
 * Food Wars - Chef Battle Arena Server
 * Main server file handling game logic, socket connections, and static file serving
 */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import crypto from "crypto";

// Game logic imports
import {
  bulletWallCollisions,
  bulletPlayerCollisions,
  determinePlayerMovement,
  updateBulletPosition,
} from "./backend/physics.js";
import { bestSpawnPoint } from "./backend/spawn.js";
import { setupAuth } from "./backend/auth.js";
import {
  createPlayerWithStats,
  recordShotFired,
  recordShotHit,
  recordKill,
  recordDeath,
  sendDeathScreen,
  broadcastKillNotification,
} from "./backend/stats.js";

// Type imports
import type {
  ServerPlayer,
  ClientPlayerInput,
  GameState,
  PlayerBounds,
  BulletData,
  WallData,
  RoomEmitter
} from "./types/game.js";

// ===== CONSTANTS =====

const GAME_CONFIG = {
  PLAYER_SIZE: 70,
  PLAYER_HEALTH: 100,
  BULLET_WIDTH: 20,
  BULLET_HEIGHT: 5,
  BULLET_OFFSET: 30,
  BULLET_SPREAD: 0.05,
  SHOOTING_COOLDOWN: 1000 / 10, // 10 shots per second
  ENEMY_UPDATE_RATE: 1000 / 50, // 50 FPS
  BULLET_UPDATE_RATE: 1000 / 50, // 50 FPS
  STATS_UPDATE_RATE: 1000, // 1 second
  PHYSICS_DELTA_TIME: 1 / 60, // 60 FPS physics
} as const;

const PORT = process.env.PORT || 8080;

// ===== GAME STATE MANAGEMENT =====

const games: Record<string, GameState> = {};

/**
 * gets or creates a game state for the specified room
 */
function getGame(roomId: string): GameState {
  if (!games[roomId]) {
    games[roomId] = {
      players: {},
      bullets: {},
      walls: {},
      lastPlayersShotTime: {},
    };
  }
  return games[roomId];
}

/**
 * creates player bounds object for collision detection (optimized to reuse object)
 */
const reusableBounds: PlayerBounds = { x: 0, y: 0, width: 0, height: 0 };

function updatePlayerBounds(serverPlayer: ServerPlayer): PlayerBounds {
  reusableBounds.x = serverPlayer.x;
  reusableBounds.y = serverPlayer.y;
  reusableBounds.width = GAME_CONFIG.PLAYER_SIZE;
  reusableBounds.height = GAME_CONFIG.PLAYER_SIZE;
  return reusableBounds;
}

/**
 * creates a new bullet object
 */
function createBullet(serverPlayer: ServerPlayer, clientInput: ClientPlayerInput): BulletData {
  const bulletAngle = clientInput.rotation - Math.PI / 2;
  const spread = (Math.random() - 0.5) * GAME_CONFIG.BULLET_SPREAD;
  
  return {
    id: crypto.randomUUID(),
    parent_id: clientInput.id,
    parent_username: clientInput.username,
    x: serverPlayer.x + GAME_CONFIG.PLAYER_SIZE / 2 + Math.cos(bulletAngle) * GAME_CONFIG.BULLET_OFFSET,
    y: serverPlayer.y + GAME_CONFIG.PLAYER_SIZE / 2 + Math.sin(bulletAngle) * GAME_CONFIG.BULLET_OFFSET,
    width: GAME_CONFIG.BULLET_WIDTH,
    height: GAME_CONFIG.BULLET_HEIGHT,
    rotation: bulletAngle - spread,
  };
}

/**
 * handles player respawn logic
 */
function handlePlayerRespawn(players: Record<string, ServerPlayer>, clientInput: ClientPlayerInput): ServerPlayer {
  const [x, y] = bestSpawnPoint(players);
  const newPlayer = createPlayerWithStats(
    clientInput.id,
    clientInput.username,
    x,
    y,
    clientInput.rotation,
    GAME_CONFIG.PLAYER_HEALTH
  );
  players[clientInput.id] = newPlayer;
  return newPlayer;
}

/**
 * handles player shooting logic with optimized cooldown check
 */
function handlePlayerShooting(
  clientInput: ClientPlayerInput,
  serverPlayer: ServerPlayer,
  bullets: Record<string, BulletData>,
  lastPlayersShotTime: Record<string, number>,
  roomEmitter: RoomEmitter
): void {
  if (!clientInput.mb1) return;

  const now = Date.now();
  const lastShotTime = lastPlayersShotTime[clientInput.id];
  
  if (!lastShotTime || now - lastShotTime >= GAME_CONFIG.SHOOTING_COOLDOWN) {
    lastPlayersShotTime[clientInput.id] = now;
    const bullet = createBullet(serverPlayer, clientInput);
    bullets[bullet.id] = bullet;
    
    // record shot fired for stats
    recordShotFired(serverPlayer);
    
    roomEmitter.emit("clientUpdateNewBullet", bullet);
  }
}

// ===== EXPRESS APP SETUP =====

const app = express();

// Static file serving
app.use(express.static("public"));
app.use("/pixi", express.static("./node_modules/pixi.js/dist/"));

// Authentication setup
setupAuth(app);

// ===== SOCKET.IO SERVER SETUP =====

const server = createServer(app);
const io = new Server(server);

io.on("connection", (socket: Socket) => {
  console.log(`🔌 Socket ${socket.id} connected`);

  // ===== SOCKET EVENT HANDLERS =====

  /**
   * handle room joining
   */
  socket.on("joinRoom", (roomId: string) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    console.log(`🏠 Socket ${socket.id} joined room ${roomId}`);
    getGame(roomId); // initialize game state if needed
  });

  /**
   * handle player updates (movement, shooting, etc.) - optimized for efficiency
   */
  socket.on("serverUpdateSelf", (clientInput: ClientPlayerInput) => {
    const roomId = socket.data.roomId as string;
    if (!roomId) return; // ignore if not in a room

    const game = getGame(roomId);
    const { players, bullets, walls, lastPlayersShotTime } = game;
    const roomEmitter = io.to(roomId);

    let serverPlayer = players[clientInput.id];

    // handle respawn if player is dead or doesn't exist
    if (!serverPlayer || serverPlayer.health <= 0) {
      serverPlayer = handlePlayerRespawn(players, clientInput);
      socket.emit("clientUpdateSelf", serverPlayer);
      return;
    }

    // update server player rotation from client input
    serverPlayer.rotation = clientInput.rotation;

    // create player bounds for collision detection (reuses object for efficiency)
    const playerBounds = updatePlayerBounds(serverPlayer);

    // handle shooting
    handlePlayerShooting(clientInput, serverPlayer, bullets, lastPlayersShotTime, roomEmitter);

    // apply physics and handle collisions
    determinePlayerMovement(serverPlayer, playerBounds, clientInput, walls);
    bulletPlayerCollisions(roomEmitter, socket, bullets, players, clientInput, playerBounds);
    bulletWallCollisions(walls, bullets);

    // send updated player state back to client
    socket.emit("clientUpdateSelf", serverPlayer);
  });

  /**
   * handle wall addition (for level editing)
   */
  socket.on("addWall", (wallData: WallData) => {
    const roomId = socket.data.roomId as string;
    if (!roomId) return;
    
    getGame(roomId).walls[wallData.id] = wallData;
  });

  /**
   * handle player disconnection
   */
  socket.on("disconnect", () => {
    console.log(`🔌 Socket ${socket.id} disconnected`);
    const roomId = socket.data.roomId as string;
    if (!roomId) return;

    const game = getGame(roomId);
    delete game.players[socket.id];
    delete game.lastPlayersShotTime[socket.id];
  });
});

// ===== GAME LOOP INTERVALS =====

/**
 * broadcast enemy positions to all clients
 */
setInterval(() => {
  for (const [roomId, game] of Object.entries(games)) {
    const playerCount = Object.keys(game.players).length;
    if (playerCount > 0) {
      io.to(roomId).emit("clientUpdateAllEnemies", game.players);
    }
  }
}, GAME_CONFIG.ENEMY_UPDATE_RATE);

/**
 * update bullet positions and handle collisions
 */
setInterval(() => {
  for (const [roomId, game] of Object.entries(games)) {
    const bulletCount = Object.keys(game.bullets).length;
    if (bulletCount > 0) {
      updateBulletPosition(io.to(roomId), game.bullets, GAME_CONFIG.PHYSICS_DELTA_TIME);
      bulletWallCollisions(game.walls, game.bullets);
    }
  }
}, GAME_CONFIG.BULLET_UPDATE_RATE);

/**
 * display room statistics in console
 */
setInterval(() => {
  console.clear();
  console.log("🍳 Food Wars - Chef Battle Arena Server Status");
  console.log("=" .repeat(50));

  for (const [roomId, game] of Object.entries(games)) {
    const playerCount = Object.keys(game.players).length;
    
    if (playerCount > 0) {
      const playerNames = Object.values(game.players)
        .map((serverPlayer: ServerPlayer) => serverPlayer.username)
        .filter((name: string) => name && name.trim() !== "")
        .join(", ");

      console.log(`\n🏠 Room: ${roomId} (${playerCount} chef${playerCount > 1 ? 's' : ''} cooking)`);
      
      if (playerNames) {
        console.log(`👨‍🍳 Chefs: ${playerNames}`);
      }
    }
  }
  
  if (Object.keys(games).length === 0 || Object.values(games).every(game => Object.keys(game.players).length === 0)) {
    console.log("\n🍽️  No active kitchens - waiting for chefs...");
  }
}, GAME_CONFIG.STATS_UPDATE_RATE);

// ===== SERVER STARTUP =====

server.listen(PORT, () => {
  console.log(`🚀 Food Wars server cooking on port ${PORT}`);
  console.log(`🌐 Visit http://localhost:${PORT} to start battling!`);
});

