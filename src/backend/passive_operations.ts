import { performance } from "perf_hooks";
import { updateBulletPosition } from "./physics.js";

// Sending x every y seconds
// Send all player data to clients every 10ms excluding the player's own data
export function sendPlayerDataToClientsInterval(io, players) {
  setInterval(() => {
    for (const playerSocketId in players) {
      const enemies = { ...players };
      delete enemies[playerSocketId];
  
      if (enemies[playerSocketId]) {
        if (enemies[playerSocketId].health <= 0) {
          delete enemies[playerSocketId];
        }
      }
      // Emit the updated data to the current player
      io.to(playerSocketId).emit("clientUpdateAllEnemies", enemies);
    }
  }, 50);
}

// calculate bullet trajectory (server side)
let lastTime = performance.now();
export function updateBulletPositionInterval(io, bullets) {
  setInterval(() => {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
  
    updateBulletPosition(io, bullets, dt);
  }, 33);
}

// check for disconnected players and remove them
export function removeDisconnectedPlayersInterval(players) {
  setInterval(() => {
    for (const playerSocketId in players) {
      if (playerSocketId === "undefined") {
        delete players[playerSocketId];
      }
    }
  }, 1500);
}