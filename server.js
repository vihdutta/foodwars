import {
  bulletWallCollisions,
  bulletPlayerCollisions,
  determinePlayerMovement,
  updateBulletPosition,
} from "./src/backend/physics.js";
import { bestSpawnPoint } from "./src/backend/spawn.js";

import { performance } from "perf_hooks";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { sendPlayerDataToClientsInterval, updateBulletPositionInterval, removeDisconnectedPlayersInterval } from "./src/backend/passive_operations.js";

const app = express();
const server = createServer(app);
const io = new Server(server);

let players = {};
let bullets = {};
let walls = {};
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
    if (!player || player.heath <= 0) {
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

  socket.on("serverUpdateNewBullet", (bullet) => {
    if (
      players[socket.id] &&
      players[socket.id].hasOwnProperty("health") &&
      players[socket.id].health <= 0
    ) {
      return;
    }

    bullets[bullet.id] = bullet;
    io.emit("clientUpdateNewBullet", bullet);
  });

  socket.on("addWall", (wallData) => {
    walls[wallData.id] = wallData;
  });

  socket.on("disconnect", () => {
    console.log("SERVER: socket", socket.id, "disconnected");
    io.emit("notification", socket.id + " disconnected");
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
