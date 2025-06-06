/**
 * stats.ts - player statistics management
 * handles stat tracking, updates, and death information
 */

// Type imports
import type {
  ServerPlayer,
  PlayerStats,
  DeathInfo,
  RoomEmitter,
  GameSocket
} from "../types/game.js";

// Constants import
import { DEFAULT_STATS } from "../constants.js";

// ===== CONSTANTS =====

// ===== STAT INITIALIZATION =====

/**
 * initializes player stats for a new session
 */
export function initializePlayerStats(): PlayerStats {
  return { ...DEFAULT_STATS };
}

/**
 * creates a new player with initialized stats
 */
export function createPlayerWithStats(
  id: string,
  username: string,
  x: number,
  y: number,
  rotation: number,
  health: number
): ServerPlayer {
  return {
    id,
    username,
    x,
    y,
    rotation,
    health,
    stats: initializePlayerStats(),
    sessionStartTime: Date.now(),
  };
}

// ===== STAT TRACKING =====

/**
 * records a shot fired by a player
 */
export function recordShotFired(player: ServerPlayer): void {
  player.stats.shotsFired++;
}

/**
 * records a successful hit by a player
 */
export function recordShotHit(player: ServerPlayer, damage: number): void {
  player.stats.shotsHit++;
  player.stats.damageDealt += damage;
}

/**
 * records a kill by a player
 */
export function recordKill(killer: ServerPlayer): void {
  killer.stats.kills++;
}

/**
 * records a death and creates death info
 */
export function recordDeath(
  victim: ServerPlayer,
  killerUsername: string,
  weapon: string = "Bullet"
): DeathInfo {
  victim.stats.deaths++;
  
  // calculate time alive in this life
  const timeAlive = Math.floor((Date.now() - victim.sessionStartTime) / 1000);
  victim.stats.timeAlive += timeAlive;
  
  const deathInfo: DeathInfo = {
    killedBy: killerUsername,
    killedByWeapon: weapon,
    timeAlive,
    finalStats: { ...victim.stats },
  };
  
  victim.lastDeathInfo = deathInfo;
  return deathInfo;
}

// ===== STAT BROADCASTING =====

/**
 * sends updated stats to a specific player
 */
export function sendStatsUpdate(socket: GameSocket, player: ServerPlayer): void {
  socket.emit("statsUpdate", {
    stats: player.stats,
    deathInfo: player.lastDeathInfo,
  });
}

/**
 * sends death screen data to a player
 */
export function sendDeathScreen(
  socket: GameSocket,
  deathInfo: DeathInfo
): void {
  socket.emit("showDeathScreen", deathInfo);
}

/**
 * broadcasts kill notification with updated stats
 */
export function broadcastKillNotification(
  roomEmitter: RoomEmitter,
  killerName: string,
  victimName: string,
  killerStats: PlayerStats
): void {
  const killMessage = `${killerName} eliminated ${victimName}`;
  
  roomEmitter.emit("notification", killMessage);
  roomEmitter.emit("killFeed", {
    killer: killerName,
    victim: victimName,
    weapon: "Bullet",
    killerStats,
  });
}

// ===== UTILITY FUNCTIONS =====

/**
 * calculates accuracy percentage
 */
export function calculateAccuracy(stats: PlayerStats): number {
  if (stats.shotsFired === 0) return 0;
  return Math.round((stats.shotsHit / stats.shotsFired) * 100);
}

/**
 * calculates kill/death ratio
 */
export function calculateKDR(stats: PlayerStats): number {
  if (stats.deaths === 0) return stats.kills;
  return Math.round((stats.kills / stats.deaths) * 100) / 100;
}

/**
 * formats time in seconds to MM:SS format
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// ===== COMPREHENSIVE GAME STATS =====

/**
 * updates comprehensive game stats when a shot is fired
 */
export function updateGameStatsShotFired(gameStats: Record<string, PlayerStats & { username: string; socketId: string }>, playerId: string): void {
  if (gameStats[playerId]) {
    gameStats[playerId].shotsFired++;
  }
}

/**
 * updates comprehensive game stats when a shot hits
 */
export function updateGameStatsShotHit(gameStats: Record<string, PlayerStats & { username: string; socketId: string }>, playerId: string, damage: number): void {
  if (gameStats[playerId]) {
    gameStats[playerId].shotsHit++;
    gameStats[playerId].damageDealt += damage;
  }
}

/**
 * updates comprehensive game stats when a kill occurs
 */
export function updateGameStatsKill(gameStats: Record<string, PlayerStats & { username: string; socketId: string }>, killerId: string): void {
  if (gameStats[killerId]) {
    gameStats[killerId].kills++;
  }
}

/**
 * updates comprehensive game stats when a death occurs
 */
export function updateGameStatsDeath(gameStats: Record<string, PlayerStats & { username: string; socketId: string }>, victimId: string): void {
  if (gameStats[victimId]) {
    gameStats[victimId].deaths++;
  }
}

/**
 * updates comprehensive game stats with time survived when a player dies
 */
export function updateGameStatsTimeAlive(gameStats: Record<string, PlayerStats & { username: string; socketId: string }>, playerId: string, timeAliveThisLife: number): void {
  if (gameStats[playerId]) {
    gameStats[playerId].timeAlive += timeAliveThisLife;
  }
}

/**
 * calculates final time alive for all players when game ends
 */
export function calculateFinalTimeAlive(
  gameStats: Record<string, PlayerStats & { username: string; socketId: string }>,
  players: Record<string, ServerPlayer>,
  gameStartTime: number,
  gameEndTime: number
): void {
  // Add remaining time alive for players who are still alive when game ends
  Object.values(players).forEach(player => {
    if (player.health > 0 && gameStats[player.id]) {
      const timeAliveThisLife = Math.floor((gameEndTime - player.sessionStartTime) / 1000);
      gameStats[player.id].timeAlive += timeAliveThisLife;
    }
  });
} 