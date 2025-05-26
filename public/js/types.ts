/**
 * types.ts - client-side type definitions for Food Wars
 * mirrors server types for consistency across frontend and backend
 */

// ===== PLAYER STATISTICS =====

/**
 * player statistics for tracking performance
 */
export interface PlayerStats {
  kills: number;
  deaths: number;
  damageDealt: number;
  shotsFired: number;
  shotsHit: number;
  timeAlive: number; // in seconds
  gamesPlayed: number;
}

/**
 * death information for death screen
 */
export interface DeathInfo {
  killedBy: string;
  killedByWeapon: string;
  timeAlive: number;
  finalStats: PlayerStats;
}

// ===== WALL TYPES =====

/**
 * wall data structure (matches server-side WallData)
 */
export interface WallData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ===== PLAYER TYPES =====

/**
 * player data structure for client-side use
 */
export interface PlayerData {
  id: string;
  username: string;
  x: number;
  y: number;
  rotation: number;
  health: number;
}

// ===== BULLET TYPES =====

/**
 * bullet data structure for client-side use
 */
export interface BulletData {
  id: string;
  parent_id: string;
  parent_username: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

// ===== UTILITY TYPES =====

/**
 * bounding box for collision detection
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
} 