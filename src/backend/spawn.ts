/**
 * spawn.ts - player spawn point management
 * handles finding optimal spawn locations based on player positions
 */

// Type imports
import type { ServerPlayer, Coordinate } from "../types/game.js";

// ===== CONSTANTS =====

// predefined spawn points across the map [x, y]
const SPAWN_POINTS = [
  [250, 2100],
  [2650, 2100], 
  [1450, 2100],
  [1450, 250],
  [1450, 3950]
];

// ===== SPAWN LOGIC =====

/**
 * finds the best spawn point farthest from other players
 * returns a random spawn point if no other players exist
 */
export function bestSpawnPoint(players: Record<string, ServerPlayer>): Coordinate {
  // return random spawn point if no other players exist
  if (Object.keys(players).length === 0) {
    const randomIndex = Math.floor(Math.random() * SPAWN_POINTS.length);
    return SPAWN_POINTS[randomIndex] as Coordinate;
  }

  let maxDistance = 0;
  let bestSpawn = SPAWN_POINTS[0];

  // evaluate each spawn point to find the one farthest from all players
  SPAWN_POINTS.forEach((spawnPoint) => {
    let minDistanceToAnyPlayer = Infinity;

    // find the closest player to this spawn point
    Object.values(players).forEach((serverPlayer: ServerPlayer) => {
      // calculate euclidean distance using pythagorean theorem
      const distance = Math.sqrt(
        Math.pow(serverPlayer.x - spawnPoint[0], 2) + Math.pow(serverPlayer.y - spawnPoint[1], 2)
      );
      
      if (distance < minDistanceToAnyPlayer) {
        minDistanceToAnyPlayer = distance;
      }
    });

    // update best spawn if this point is farther from players
    if (minDistanceToAnyPlayer > maxDistance) {
      maxDistance = minDistanceToAnyPlayer;
      bestSpawn = spawnPoint;
    }
  });

  return bestSpawn as Coordinate;
}