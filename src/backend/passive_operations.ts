import { performance } from "perf_hooks";
import { updateBulletPosition } from "./physics.js";

// Sending x every y seconds
// Send all player data to clients every 10ms excluding the player's own data
export function sendPlayerDataToClientsInterval(io, players) {
  setInterval(() => {
    for (const playerSocketId in players) {
      const enemies = { ...players };
      delete enemies[playerSocketId];
      
      const minimalEnemies = {};
      for (const enemyId in enemies) {
        const enemy = enemies[enemyId];
        // Only include essential data for rendering enemies
        if (enemy.health > 0) { // Client already handles removing based on health, but filtering here reduces data slightly more
          minimalEnemies[enemyId] = {
            id: enemyId, // Client uses the key, but including id might be useful for consistency or future use
            x: enemy.x,
            y: enemy.y,
            rotation: enemy.rotation,
            health: enemy.health // Client needs health to know if enemy should be rendered/removed
          };
        }
      }

      // Emit the minimized enemy data to the current player
      io.to(playerSocketId).emit("clientUpdateAllEnemies", minimalEnemies);
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