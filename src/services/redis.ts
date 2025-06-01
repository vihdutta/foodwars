/**
 * redis.ts - Redis service for storing player stats during game rounds
 * Handles connection, storage, retrieval, and cleanup of player statistics
 */

import { createClient, RedisClientType } from 'redis';
import type { PlayerStats } from '../types/game.js';

// ===== REDIS CLIENT SETUP =====

let redisClient: RedisClientType | null = null;

/**
 * initializes Redis connection
 */
export async function initRedis(): Promise<void> {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('🔗 Redis Client Connected');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis Client Ready');
    });

    await redisClient.connect();
    console.log('🚀 Redis initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error);
    throw error;
  }
}

/**
 * closes Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log('🔌 Redis connection closed');
  }
}

/**
 * gets Redis client instance
 */
function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initRedis() first.');
  }
  return redisClient;
}

// ===== PLAYER STATS OPERATIONS =====

/**
 * stores player stats in Redis for a specific room
 */
export async function setPlayerStats(
  roomId: string, 
  playerId: string, 
  stats: PlayerStats & { username: string; socketId: string }
): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `room:${roomId}:player:${playerId}:stats`;
    
    await client.hSet(key, {
      username: stats.username,
      socketId: stats.socketId,
      kills: stats.kills.toString(),
      deaths: stats.deaths.toString(),
      damageDealt: stats.damageDealt.toString(),
      shotsFired: stats.shotsFired.toString(),
      shotsHit: stats.shotsHit.toString(),
      timeAlive: stats.timeAlive.toString(),
      gamesPlayed: stats.gamesPlayed.toString()
    });
    
    // Set expiration for 1 hour (safety cleanup)
    await client.expire(key, 3600);
  } catch (error) {
    console.error(`❌ Failed to set player stats for ${playerId} in room ${roomId}:`, error);
    throw error;
  }
}

/**
 * retrieves player stats from Redis for a specific room
 */
export async function getPlayerStats(
  roomId: string, 
  playerId: string
): Promise<(PlayerStats & { username: string; socketId: string }) | null> {
  try {
    const client = getRedisClient();
    const key = `room:${roomId}:player:${playerId}:stats`;
    
    const stats = await client.hGetAll(key);
    
    if (!stats || Object.keys(stats).length === 0) {
      return null;
    }
    
    return {
      username: stats.username || '',
      socketId: stats.socketId || playerId,
      kills: parseInt(stats.kills) || 0,
      deaths: parseInt(stats.deaths) || 0,
      damageDealt: parseInt(stats.damageDealt) || 0,
      shotsFired: parseInt(stats.shotsFired) || 0,
      shotsHit: parseInt(stats.shotsHit) || 0,
      timeAlive: parseInt(stats.timeAlive) || 0,
      gamesPlayed: parseInt(stats.gamesPlayed) || 0
    };
  } catch (error) {
    console.error(`❌ Failed to get player stats for ${playerId} in room ${roomId}:`, error);
    return null;
  }
}

/**
 * retrieves all player stats for a specific room
 */
export async function getAllPlayerStats(
  roomId: string
): Promise<Array<PlayerStats & { username: string; socketId: string }>> {
  try {
    const client = getRedisClient();
    const pattern = `room:${roomId}:player:*:stats`;
    
    const keys = await client.keys(pattern);
    const allStats: Array<PlayerStats & { username: string; socketId: string }> = [];
    
    for (const key of keys) {
      const stats = await client.hGetAll(key);
      
      if (stats && Object.keys(stats).length > 0) {
        allStats.push({
          username: stats.username || '',
          socketId: stats.socketId || '',
          kills: parseInt(stats.kills) || 0,
          deaths: parseInt(stats.deaths) || 0,
          damageDealt: parseInt(stats.damageDealt) || 0,
          shotsFired: parseInt(stats.shotsFired) || 0,
          shotsHit: parseInt(stats.shotsHit) || 0,
          timeAlive: parseInt(stats.timeAlive) || 0,
          gamesPlayed: parseInt(stats.gamesPlayed) || 0
        });
      }
    }
    
    return allStats;
  } catch (error) {
    console.error(`❌ Failed to get all player stats for room ${roomId}:`, error);
    return [];
  }
}

/**
 * updates specific stat fields for a player
 */
export async function updatePlayerStat(
  roomId: string,
  playerId: string,
  field: keyof PlayerStats,
  value: number
): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `room:${roomId}:player:${playerId}:stats`;
    
    await client.hSet(key, field, value.toString());
    
    // Refresh expiration
    await client.expire(key, 3600);
  } catch (error) {
    console.error(`❌ Failed to update ${field} for ${playerId} in room ${roomId}:`, error);
    throw error;
  }
}

/**
 * increments a specific stat field for a player
 */
export async function incrementPlayerStat(
  roomId: string,
  playerId: string,
  field: keyof PlayerStats,
  increment: number = 1
): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `room:${roomId}:player:${playerId}:stats`;
    
    await client.hIncrBy(key, field, increment);
    
    // Refresh expiration
    await client.expire(key, 3600);
  } catch (error) {
    console.error(`❌ Failed to increment ${field} for ${playerId} in room ${roomId}:`, error);
    throw error;
  }
}

/**
 * initializes player stats in Redis if they don't exist
 */
export async function initializePlayerStats(
  roomId: string,
  playerId: string,
  username: string
): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `room:${roomId}:player:${playerId}:stats`;
    
    // Check if stats already exist
    const exists = await client.exists(key);
    
    if (!exists) {
      await client.hSet(key, {
        username,
        socketId: playerId,
        kills: '0',
        deaths: '0',
        damageDealt: '0',
        shotsFired: '0',
        shotsHit: '0',
        timeAlive: '0',
        gamesPlayed: '1'
      });
      
      // Set expiration for 1 hour
      await client.expire(key, 3600);
    }
  } catch (error) {
    console.error(`❌ Failed to initialize player stats for ${playerId} in room ${roomId}:`, error);
    throw error;
  }
}

/**
 * clears all player stats for a specific room (called at round end)
 */
export async function clearRoomStats(roomId: string): Promise<void> {
  try {
    const client = getRedisClient();
    const pattern = `room:${roomId}:player:*:stats`;
    
    const keys = await client.keys(pattern);
    
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`🧹 Cleared ${keys.length} player stats for room ${roomId}`);
    }
  } catch (error) {
    console.error(`❌ Failed to clear room stats for room ${roomId}:`, error);
    throw error;
  }
}

/**
 * health check for Redis connection
 */
export async function redisHealthCheck(): Promise<boolean> {
  try {
    const client = getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('❌ Redis health check failed:', error);
    return false;
  }
} 