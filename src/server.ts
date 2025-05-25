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

// ===== TYPES AND INTERFACES =====

interface GameState {
  players: Record<string, any>;
  bullets: Record<string, any>;
  walls: Record<string, any>;
  lastPlayersShotTime: Record<string, number>;
}

interface PlayerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BulletData {
  id: string;
  parent_id: string;
  parent_username: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

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
 * Gets or creates a game state for the specified room
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
 * Creates player bounds object for collision detection
 */
function createPlayerBounds(player: any): PlayerBounds {
  return {
    x: player.x,
    y: player.y,
    width: GAME_CONFIG.PLAYER_SIZE,
    height: GAME_CONFIG.PLAYER_SIZE,
  };
}

/**
 * Creates a new bullet object
 */
function createBullet(player: any, playerData: any): BulletData {
  const bulletAngle = playerData.rotation - Math.PI / 2;
  const spread = (Math.random() - 0.5) * GAME_CONFIG.BULLET_SPREAD;
  
  return {
    id: crypto.randomUUID(),
    parent_id: playerData.id,
    parent_username: playerData.username,
    x: player.x + GAME_CONFIG.PLAYER_SIZE / 2 + Math.cos(bulletAngle) * GAME_CONFIG.BULLET_OFFSET,
    y: player.y + GAME_CONFIG.PLAYER_SIZE / 2 + Math.sin(bulletAngle) * GAME_CONFIG.BULLET_OFFSET,
    width: GAME_CONFIG.BULLET_WIDTH,
    height: GAME_CONFIG.BULLET_HEIGHT,
    rotation: bulletAngle - spread,
  };
}

/**
 * Handles player respawn logic
 */
function handlePlayerRespawn(players: Record<string, any>, playerData: any): void {
  const [x, y] = bestSpawnPoint(players);
  players[playerData.id] = {
    ...playerData,
    health: GAME_CONFIG.PLAYER_HEALTH,
    x,
    y,
  };
}

/**
 * Handles player shooting logic
 */
function handlePlayerShooting(
  playerData: any,
  player: any,
  bullets: Record<string, any>,
  lastPlayersShotTime: Record<string, number>,
  roomEmitter: any
): void {
  if (!playerData.mb1) return;

  const now = Date.now();
  const lastShotTime = lastPlayersShotTime[playerData.id];
  
  if (!lastShotTime || now - lastShotTime >= GAME_CONFIG.SHOOTING_COOLDOWN) {
    lastPlayersShotTime[playerData.id] = now;
    const bullet = createBullet(player, playerData);
    bullets[bullet.id] = bullet;
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
   * Handle room joining
   */
  socket.on("joinRoom", (roomId: string) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    console.log(`🏠 Socket ${socket.id} joined room ${roomId}`);
    getGame(roomId); // Initialize game state if needed
  });

  /**
   * Handle player updates (movement, shooting, etc.)
   */
  socket.on("serverUpdateSelf", (playerData: any) => {
    const roomId = socket.data.roomId as string;
    if (!roomId) return; // Ignore if not in a room

    const game = getGame(roomId);
    const { players, bullets, walls, lastPlayersShotTime } = game;
    const roomEmitter = io.to(roomId);

    let player = players[playerData.id];

    // Handle respawn if player is dead or doesn't exist
    if (!player || player.health <= 0) {
      handlePlayerRespawn(players, playerData);
      return;
    }

    // Create player bounds for collision detection
    const playerBounds = createPlayerBounds(player);

    // Handle shooting
    handlePlayerShooting(playerData, player, bullets, lastPlayersShotTime, roomEmitter);

    // Apply physics and handle collisions
    determinePlayerMovement(player, playerBounds, playerData, walls);
    bulletPlayerCollisions(roomEmitter, socket, bullets, players, playerData, playerBounds);
    bulletWallCollisions(walls, bullets);

    // Send updated player state back to client
    socket.emit("clientUpdateSelf", players[playerData.id]);
  });

  /**
   * Handle wall addition (for level editing)
   */
  socket.on("addWall", (wallData: any) => {
    const roomId = socket.data.roomId as string;
    if (!roomId) return;
    
    getGame(roomId).walls[wallData.id] = wallData;
  });

  /**
   * Handle player disconnection
   */
  socket.on("disconnect", () => {
    console.log(`🔌 Socket ${socket.id} disconnected`);
    const roomId = socket.data.roomId as string;
    if (!roomId) return;

    const game = getGame(roomId);
    delete game.players[socket.id];
  });
});

// ===== GAME LOOP INTERVALS =====

/**
 * Broadcast enemy positions to all clients
 */
setInterval(() => {
  for (const [roomId, game] of Object.entries(games)) {
    io.to(roomId).emit("clientUpdateAllEnemies", game.players);
  }
}, GAME_CONFIG.ENEMY_UPDATE_RATE);

/**
 * Update bullet positions and handle collisions
 */
setInterval(() => {
  for (const [roomId, game] of Object.entries(games)) {
    updateBulletPosition(io.to(roomId), game.bullets, GAME_CONFIG.PHYSICS_DELTA_TIME);
    bulletWallCollisions(game.walls, game.bullets);
  }
}, GAME_CONFIG.BULLET_UPDATE_RATE);

/**
 * Display room statistics in console
 */
setInterval(() => {
  console.clear();
  console.log("🍳 Food Wars - Chef Battle Arena Server Status");
  console.log("=" .repeat(50));

  for (const [roomId, game] of Object.entries(games)) {
    const playerCount = Object.keys(game.players).length;
    
    if (playerCount > 0) {
      const playerNames = Object.values(game.players)
        .map((player: any) => player.username)
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

