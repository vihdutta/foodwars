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

// ===== CONSTANTS =====

const DEFAULT_STATS: PlayerStats = {
  kills: 0,
  deaths: 0,
  damageDealt: 0,
  shotsFired: 0,
  shotsHit: 0,
  timeAlive: 0,
  gamesPlayed: 0,
};

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