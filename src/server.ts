// server.ts
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import crypto from "crypto";
import {
  bulletWallCollisions,
  bulletPlayerCollisions,
  determinePlayerMovement,
  updateBulletPosition,
} from "./backend/physics.js";
import { bestSpawnPoint } from "./backend/spawn.js";
import { setupAuth } from "./backend/auth.js";

interface GameState {
  players: Record<string, any>;
  bullets: Record<string, any>;
  walls: Record<string, any>;
  lastPlayersShotTime: Record<string, number>;
}

const games: Record<string, GameState> = {};

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

const app = express();
app.use(express.static("public"));
app.use("/pixi", express.static("./node_modules/pixi.js/dist/"));
setupAuth(app);

const server = createServer(app);
const io = new Server(server);

io.on("connection", (socket: Socket) => {
  console.log(`socket ${socket.id} connected`);

  // Client must emit "joinRoom" with a room name (e.g. "lobby", "match-123")
  socket.on("joinRoom", (roomId: string) => {
    socket.join(roomId);
    socket.data.roomId = roomId;
    console.log(`socket ${socket.id} joined room ${roomId}`);
    getGame(roomId); // initialize state if needed
  });

  socket.on("serverUpdateSelf", (playerData: any) => {
    const roomId = socket.data.roomId as string;
    if (!roomId) return; // ignore if not joined
    const game = getGame(roomId);
    const { players, bullets, walls, lastPlayersShotTime } = game;

    let player = players[playerData.id];
    // Respawn logic
    if (!player || player.health <= 0) {
      const [x, y] = bestSpawnPoint(players);
      players[playerData.id] = {
        ...playerData,
        health: 100,
        x,
        y,
      };
      return;
    }

    const playerBounds = {
      x: player.x,
      y: player.y,
      width: 70,
      height: 70,
    };

    // Shooting
    if (playerData.mb1) {
      const now = Date.now();
      const cooldown = 1000 / 10;
      if (
        !lastPlayersShotTime[playerData.id] ||
        now - lastPlayersShotTime[playerData.id] >= cooldown
      ) {
        lastPlayersShotTime[playerData.id] = now;
        const bullet = {
          id: crypto.randomUUID(),
          parent_id: playerData.id,
          parent_username: playerData.username,
          x:
            player.x +
            32 +
            Math.cos(playerData.rotation - Math.PI / 2) * 30,
          y:
            player.y +
            32 +
            Math.sin(playerData.rotation - Math.PI / 2) * 30,
          width: 20,
          height: 5,
          rotation:
            playerData.rotation - Math.PI / 2 - (Math.random() - 0.5) * 0.05,
        };
        bullets[bullet.id] = bullet;
        io.to(roomId).emit("clientUpdateNewBullet", bullet);
      }
    }

    // Physics & collisions
    determinePlayerMovement(player, playerBounds, playerData, walls);
    bulletPlayerCollisions(
      io.to(roomId),
      socket,
      bullets,
      players,
      playerData,
      playerBounds
    );
    bulletWallCollisions(walls, bullets);

    // Send updated self back
    socket.emit("clientUpdateSelf", players[playerData.id]);
  });

  socket.on("addWall", (wallData: any) => {
    const roomId = socket.data.roomId as string;
    if (!roomId) return;
    getGame(roomId).walls[wallData.id] = wallData;
  });

  socket.on("disconnect", () => {
    console.log(`socket ${socket.id} disconnected`);
    const roomId = socket.data.roomId as string;
    if (!roomId) return;
    const game = getGame(roomId);
    delete game.players[socket.id];
  });
});

// broadcast all enemies
setInterval(() => {
  for (const [roomId, game] of Object.entries(games)) {
    io.to(roomId).emit("clientUpdateAllEnemies", game.players);
  }
}, 1000 / 50);

// update and broadcast all bullets
setInterval(() => {
  const dt = 1 / 60; // 60 times per second
  for (const [roomId, game] of Object.entries(games)) {
    updateBulletPosition(io.to(roomId), game.bullets, dt);
    bulletWallCollisions(game.walls, game.bullets);
    // updateBulletPosition already emits "clientUpdateAllBullets"
    // io.to(roomId).emit("clientUpdateAllBullets", game.bullets);
  }
}, 1000 / 50);

// display player counts and names for each room every second
setInterval(() => {
  console.clear(); // Clear console for clean output
  for (const [roomId, game] of Object.entries(games)) {
    const playerCount = Object.keys(game.players).length;
    if (playerCount > 0) { // Only show rooms with players
      const playerNames = Object.values(game.players)
        .map(player => player.username)
        .filter(name => name && name.trim() !== "")
        .join(", ");
      console.log(`\n${roomId} (${playerCount} players online)`);
      if (playerNames) {
        console.log(`Players: ${playerNames}`);
      }
    }
  }
}, 1000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server listening on ${PORT}`));
