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
  updateGameStatsShotFired,
  updateGameStatsShotHit,
  updateGameStatsKill,
  updateGameStatsDeath,
  updateGameStatsTimeAlive,
  calculateFinalTimeAlive,
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
  GAME_DURATION_MINUTES: 5, // Game duration in minutes
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
      gameEnded: false,
      gameStats: {},
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
function handlePlayerRespawn(players: Record<string, ServerPlayer>, clientInput: ClientPlayerInput, game: GameState): ServerPlayer {
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
  
  // Initialize game stats for this player if not exists
  if (!game.gameStats[clientInput.id]) {
    game.gameStats[clientInput.id] = {
      username: clientInput.username,
      socketId: clientInput.id,
      kills: 0,
      deaths: 0,
      damageDealt: 0,
      shotsFired: 0,
      shotsHit: 0,
      timeAlive: 0,
      gamesPlayed: 1
    };
  }
  
  return newPlayer;
}

/**
 * starts the game timer when the first player spawns
 */
function startGameTimer(game: GameState): void {
  if (!game.gameStartTime && !game.gameEnded) {
    game.gameStartTime = Date.now();
    console.log(`⏰ Game timer started for room`);
  }
}

/**
 * gets the remaining time in seconds for a game
 */
function getRemainingTime(game: GameState): number {
  if (!game.gameStartTime || game.gameEnded) {
    return GAME_CONFIG.GAME_DURATION_MINUTES * 60;
  }
  
  const elapsed = (Date.now() - game.gameStartTime) / 1000;
  const totalTime = GAME_CONFIG.GAME_DURATION_MINUTES * 60;
  return Math.max(0, totalTime - elapsed);
}

/**
 * checks if the game should end and handles game end logic
 */
function checkGameEnd(roomId: string, game: GameState, roomEmitter: RoomEmitter): void {
  if (game.gameEnded) return;
  
  const remainingTime = getRemainingTime(game);
  if (remainingTime <= 0) {
    game.gameEnded = true;
    game.gameEndTime = Date.now();
    console.log(`🏁 Game ended for room ${roomId}`);
    
    // Calculate final time alive for all players
    if (game.gameStartTime && game.gameEndTime) {
      calculateFinalTimeAlive(game.gameStats, game.players, game.gameStartTime, game.gameEndTime);
    }
    
    // Send game end event with comprehensive stats (by socket ID)
    roomEmitter.emit("gameEnded", {
      finalStats: Object.values(game.gameStats)
    });
    
    // Reset all players (health to 0 to trigger respawn)
    Object.values(game.players).forEach(player => {
      player.health = 0;
    });
    
    // Reset game state for next round
    setTimeout(() => {
      resetGameState(game);
    }, 1000); // Small delay to ensure game-ended screen shows first
  }
}

/**
 * cleans up empty rooms that have been inactive
 */
function cleanupInactiveRooms(): void {
  for (const [roomId, game] of Object.entries(games)) {
    const playerCount = Object.keys(game.players).length;
    
    // If room is empty and game ended, cleanup the room
    if (playerCount === 0) {
      const shouldCleanup = game.gameEnded;
      
      if (shouldCleanup) {
        delete games[roomId];
        console.log(`🧹 Cleaned up inactive room ${roomId}`);
      }
    }
  }
}

/**
 * resets game state for a new game
 */
function resetGameState(game: GameState): void {
  game.gameStartTime = undefined;
  game.gameEndTime = undefined;
  game.gameEnded = false;
  game.bullets = {};
  game.lastPlayersShotTime = {};
  game.gameStats = {};
  console.log(`🔄 Game state reset for new game`);
}

/**
 * handles player shooting logic with optimized cooldown check
 */
function handlePlayerShooting(
  clientInput: ClientPlayerInput,
  serverPlayer: ServerPlayer,
  bullets: Record<string, BulletData>,
  lastPlayersShotTime: Record<string, number>,
  roomEmitter: RoomEmitter,
  game: GameState
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
    updateGameStatsShotFired(game.gameStats, clientInput.id);
    
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
      // Don't allow respawn if game has ended
      if (game.gameEnded) {
        socket.emit("clientUpdateSelf", serverPlayer || {
          id: clientInput.id,
          username: clientInput.username,
          x: 0,
          y: 0,
          rotation: 0,
          health: 0,
          stats: { kills: 0, deaths: 0, damageDealt: 0, shotsFired: 0, shotsHit: 0, timeAlive: 0, gamesPlayed: 0 },
          sessionStartTime: Date.now()
        });
        return;
      }
      
      serverPlayer = handlePlayerRespawn(players, clientInput, game);
      
      // Reset session start time for new life
      serverPlayer.sessionStartTime = Date.now();
      
      // Start game timer when first player spawns
      startGameTimer(game);
      
      socket.emit("clientUpdateSelf", serverPlayer);
      return;
    }

    // If game has ended, don't process normal gameplay actions
    if (game.gameEnded) {
      // Keep player frozen at their last position with 0 health
      serverPlayer.health = 0;
      socket.emit("clientUpdateSelf", serverPlayer);
      return;
    }

    // update server player rotation from client input
    serverPlayer.rotation = clientInput.rotation;

    // create player bounds for collision detection (reuses object for efficiency)
    const playerBounds = updatePlayerBounds(serverPlayer);

    // handle shooting
    handlePlayerShooting(clientInput, serverPlayer, bullets, lastPlayersShotTime, roomEmitter, game);

    // apply physics and handle collisions
    determinePlayerMovement(serverPlayer, playerBounds, clientInput, walls);
    bulletPlayerCollisions(roomEmitter, socket, bullets, players, clientInput, playerBounds, game.gameStats);
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
      const roomEmitter = io.to(roomId);
      roomEmitter.emit("clientUpdateAllEnemies", game.players);
      
      // Check for game end and send timer updates
      checkGameEnd(roomId, game, roomEmitter);
      
      // Send timer update to all players
      const remainingTime = getRemainingTime(game);
      roomEmitter.emit("timerUpdate", { remainingTime });
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

      const remainingTime = getRemainingTime(game);
      const timeDisplay = game.gameEnded ? "ENDED" : `${Math.ceil(remainingTime)}s left`;

      console.log(`\n🏠 Room: ${roomId} (${playerCount} chef${playerCount > 1 ? 's' : ''} cooking) - ${timeDisplay}`);
      
      if (playerNames) {
        console.log(`👨‍🍳 Chefs: ${playerNames}`);
      }
    }
  }
  
  if (Object.keys(games).length === 0 || Object.values(games).every(game => Object.keys(game.players).length === 0)) {
    console.log("\n🍽️  No active kitchens - waiting for chefs...");
  }
  
  // Clean up inactive rooms
  cleanupInactiveRooms();
}, GAME_CONFIG.STATS_UPDATE_RATE);

// ===== SERVER STARTUP =====

server.listen(PORT, () => {
  console.log(`🚀 Food Wars server cooking on port ${PORT}`);
  console.log(`🌐 Visit http://localhost:${PORT} to start battling!`);
});

