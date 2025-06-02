// handles saving end-game stats to Supabase for authenticated users

import { saveGameStats, isValidUserInfo, validateAndFormatStats } from './supabase.js';
import { getUserInfo, isAuthenticated } from './user-session.js';
import { getAllPlayerStats } from './redis.js';
import type { PlayerStats, UserInfo } from '../types/game.js';

export interface StatsSaveResult {
  totalPlayers: number;
  authenticatedPlayers: number;
  savedSuccessfully: number;
  errors: string[];
}

export interface PlayerSaveResult {
  socketId: string;
  userInfo?: UserInfo;
  stats?: PlayerStats;
  success: boolean;
  error?: string;
}

// saves end-game stats to Supabase for all authenticated players in a room
export async function saveEndGameStats(
  roomId: string,
  playerSocketIds: string[]
): Promise<StatsSaveResult> {
  console.log(`📊 Starting end-game stats save for room ${roomId}`);
  
  const result: StatsSaveResult = {
    totalPlayers: playerSocketIds.length,
    authenticatedPlayers: 0,
    savedSuccessfully: 0,
    errors: []
  };

  const allPlayerStats = await getAllPlayerStats(roomId);
  const statsMap = new Map<string, PlayerStats & { username: string; socketId: string }>();
  
  for (const playerStat of allPlayerStats) {
    statsMap.set(playerStat.socketId, playerStat);
  }

  const savePromises = playerSocketIds.map(socketId => 
    savePlayerStats(socketId, statsMap.get(socketId), roomId)
  );

  const saveResults = await Promise.allSettled(savePromises);

  for (let i = 0; i < saveResults.length; i++) {
    const promiseResult = saveResults[i];
    const socketId = playerSocketIds[i];

    if (promiseResult.status === 'fulfilled') {
      const playerResult = promiseResult.value;
      
      if (playerResult.userInfo) {
        result.authenticatedPlayers++;
      }
      
      if (playerResult.success) {
        result.savedSuccessfully++;
      } else if (playerResult.error) {
        result.errors.push(`${socketId}: ${playerResult.error}`);
      }
    } else {
      result.errors.push(`${socketId}: Promise rejected - ${promiseResult.reason}`);
    }
  }

  console.log(`📊 Stats save completed for room ${roomId}:`);
  console.log(`   Total players: ${result.totalPlayers}`);
  console.log(`   Authenticated: ${result.authenticatedPlayers}`);
  console.log(`   Saved successfully: ${result.savedSuccessfully}`);
  if (result.errors.length > 0) {
    console.log(`   Errors: ${result.errors.length}`);
    result.errors.forEach(error => console.log(`     - ${error}`));
  }

  return result;
}

// save stats for a single player
async function savePlayerStats(
  socketId: string,
  playerStats: (PlayerStats & { username: string; socketId: string }) | undefined,
  roomId: string
): Promise<PlayerSaveResult> {
  const result: PlayerSaveResult = {
    socketId,
    success: false
  };

  try {
    if (!isAuthenticated(socketId)) {
      return { ...result, error: 'Player not authenticated' };
    }

    const userInfo = getUserInfo(socketId);
    if (!userInfo || !isValidUserInfo(userInfo)) {
      return { ...result, error: 'Invalid user info' };
    }

    result.userInfo = userInfo;

    if (!playerStats) {
      return { ...result, error: 'No stats found for player' };
    }

    const validatedStats = validateAndFormatStats(playerStats);
    if (!validatedStats) {
      return { ...result, error: 'Invalid stats data' };
    }

    result.stats = validatedStats;

    const saveSuccess = await saveGameStats(userInfo, validatedStats, roomId);
    
    if (saveSuccess) {
      result.success = true;
      console.log(`✅ Stats saved for ${userInfo.name} (${socketId})`);
    } else {
      result.error = 'Failed to save to Supabase';
    }

  } catch (error) {
    result.error = `Exception during save: ${error instanceof Error ? error.message : String(error)}`;
  }

  return result;
}

// save stats for multiple rooms
export async function saveStatsForMultipleRooms(
  roomData: Array<{ roomId: string; playerSocketIds: string[] }>
): Promise<StatsSaveResult[]> {
  console.log(`📊 Batch saving stats for ${roomData.length} rooms`);

  const savePromises = roomData.map(({ roomId, playerSocketIds }) =>
    saveEndGameStats(roomId, playerSocketIds)
  );

  const results = await Promise.allSettled(savePromises);
  
  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        totalPlayers: 0,
        authenticatedPlayers: 0,
        savedSuccessfully: 0,
        errors: [`Room ${roomData[index].roomId}: ${result.reason}`]
      };
    }
  });
}

// UTILITY FUNCTIONS
// filter authenticated players from a list of socket IDs
export function getAuthenticatedPlayersFromList(socketIds: string[]): Array<{ socketId: string; userInfo: UserInfo }> {
  const authenticatedPlayers: Array<{ socketId: string; userInfo: UserInfo }> = [];
  
  for (const socketId of socketIds) {
    if (isAuthenticated(socketId)) {
      const userInfo = getUserInfo(socketId);
      if (userInfo && isValidUserInfo(userInfo)) {
        authenticatedPlayers.push({ socketId, userInfo });
      }
    }
  }
  
  return authenticatedPlayers;
}

// summary of what will be saved without actually saving
export async function getStatsSaveSummary(
  roomId: string,
  playerSocketIds: string[]
): Promise<{
  totalPlayers: number;
  authenticatedPlayers: number;
  playersWithStats: number;
}> {
  const allPlayerStats = await getAllPlayerStats(roomId);
  const statsMap = new Map<string, PlayerStats & { username: string; socketId: string }>();
  
  for (const playerStat of allPlayerStats) {
    statsMap.set(playerStat.socketId, playerStat);
  }

  let authenticatedCount = 0;
  let withStatsCount = 0;

  for (const socketId of playerSocketIds) {
    if (isAuthenticated(socketId)) {
      authenticatedCount++;
      if (statsMap.has(socketId)) {
        withStatsCount++;
      }
    }
  }

  return {
    totalPlayers: playerSocketIds.length,
    authenticatedPlayers: authenticatedCount,
    playersWithStats: withStatsCount
  };
} 