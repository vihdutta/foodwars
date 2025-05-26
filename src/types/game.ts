/**
 * game.ts - centralized type definitions for Food Wars
 * contains all interfaces and types used across the game
 */

// ===== PLAYER TYPES =====

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

/**
 * authoritative server state for a player
 */
export interface ServerPlayer {
  id: string;
  username: string;
  x: number;
  y: number;
  rotation: number;
  health: number;
  stats: PlayerStats;
  sessionStartTime: number;
  lastDeathInfo?: DeathInfo;
}

/**
 * input data received from client
 */
export interface ClientPlayerInput {
  id: string;
  username: string;
  rotation: number;
  mb1: boolean;
  keyboard: {
    w: boolean;
    a: boolean;
    s: boolean;
    d: boolean;
    shift: boolean;
  };
}

/**
 * player bounding box for collision detection
 */
export interface PlayerBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ===== BULLET TYPES =====

/**
 * bullet data structure
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

// ===== GAME STATE TYPES =====

/**
 * complete game state for a room
 */
export interface GameState {
  players: Record<string, ServerPlayer>;
  bullets: Record<string, BulletData>;
  walls: Record<string, WallData>;
  lastPlayersShotTime: Record<string, number>;
  gameStartTime?: number; // timestamp when the first player spawned
  gameEndTime?: number; // timestamp when the game ended
  gameEnded: boolean; // whether the game has ended
  gameStats: Record<string, PlayerStats & { username: string; socketId: string }>; // comprehensive stats by socket ID
}

// ===== WALL TYPES =====

/**
 * wall data structure (placeholder for future wall typing)
 */
export interface WallData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ===== AUTHENTICATION TYPES =====

/**
 * user information from authentication
 */
export interface UserInfo {
  id: string;
  name: string;
  email?: string;
  picture?: string;
}

// ===== UTILITY TYPES =====

/**
 * 2D coordinate pair
 */
export type Coordinate = [number, number];

/**
 * room emitter type for socket.io
 */
export type RoomEmitter = any; // todo: improve with proper socket.io typing

/**
 * socket type for socket.io
 */
export type GameSocket = any; // todo: improve with proper socket.io typing 