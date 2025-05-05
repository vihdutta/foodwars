import {
  bulletWallCollisions,
  bulletPlayerCollisions,
  determinePlayerMovement,
  updateBulletPosition,
} from "./backend/physics.js";
import { bestSpawnPoint } from "./backend/spawn.js";

import crypto from 'crypto'
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { sendPlayerDataToClientsInterval, updateBulletPositionInterval, removeDisconnectedPlayersInterval } from "./backend/passive_operations.js";

const app = express();
const server = createServer(app);
const io = new Server(server);

let players = {};
let bullets = {};
let walls = {};
const lastPlayersShotTime = {};
const bulletCooldown = 1000 / 10; // 1000ms / 10 shots = 100ms between shots
const playerLength = 70;

// io connections
io.on("connection", (socket) => {
  console.log("SERVER: socket", socket.id, "connected");
  io.emit("notification", socket.id + " connected");

  // Handle ping-pong
  socket.on("ping", (timestamp) => {
    socket.emit("pong", timestamp);
  });

  // updates the player
  socket.on("serverUpdateSelf", (playerData) => {
    let player = players[playerData.id];
    if (!player || player.health <= 0) {
      let spawnPoint = bestSpawnPoint(players);
      players[playerData.id] = {
        ...playerData,
        health: 100,
        x: spawnPoint[0],
        y: spawnPoint[1],
      };
      return;
    }

    const playerBounds = {
      x: player.x,
      y: player.y,
      width: playerLength,
      height: playerLength,
    };
    if (playerData.mb1) {
      const now = Date.now();

      if (!lastPlayersShotTime[playerData.id] || now - lastPlayersShotTime[playerData.id] >= bulletCooldown) {
        lastPlayersShotTime[playerData.id] = now;
        let bullet = {
          id: crypto.randomUUID(),
          parent_id: playerData.id,
          parent_username: playerData.username,
          x: player.x + 32 + Math.cos(playerData.rotation - Math.PI / 2) * 30,
          y: player.y + 32 + Math.sin(playerData.rotation - Math.PI / 2) * 30,
          width: 20,
          height: 5,
          rotation: playerData.rotation - Math.PI / 2 - ((Math.random() - 0.5) * 0.05),
        }
        bullets[bullet.id] = bullet;
        io.emit("clientUpdateNewBullet", bullet);
      }
    }

    determinePlayerMovement(player, playerBounds, playerData, walls); // also checks player-wall collisions
    bulletPlayerCollisions(
      io,
      socket,
      bullets,
      players,
      playerData,
      playerBounds
    );
    bulletWallCollisions(walls, bullets);

    socket.emit("clientUpdateSelf", players[playerData.id]);
  });


  socket.on("addWall", (wallData) => {
    walls[wallData.id] = wallData;
  });

  socket.on("disconnect", () => {
    console.log("SERVER: socket", socket.id, "disconnected");
    // io.emit("notification", socket.id + " disconnected");
    delete players[socket.id];
  });
});

sendPlayerDataToClientsInterval(io, players);
updateBulletPositionInterval(io, bullets);
removeDisconnectedPlayersInterval(players);

// final setup
const PORT = process.env.PORT || 8080;
app.use(express.static("public"));
app.use("/pixi", express.static("./node_modules/pixi.js/dist/"));

server.listen(PORT, () => {
  console.log("SERVER STARTED");
});
