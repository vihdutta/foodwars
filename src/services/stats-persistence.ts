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
  console.log(`📊 Player socket IDs to process: [${playerSocketIds.join(', ')}]`);
  
  const result: StatsSaveResult = {
    totalPlayers: playerSocketIds.length,
    authenticatedPlayers: 0,
    savedSuccessfully: 0,
    errors: []
  };

  // Debug: Check which players are authenticated
  console.log(`🔍 Checking authentication status for each player:`);
  for (const socketId of playerSocketIds) {
    const isAuth = isAuthenticated(socketId);
    const userInfo = getUserInfo(socketId);
    console.log(`  - Socket ${socketId}: authenticated=${isAuth}, userInfo=${userInfo ? JSON.stringify(userInfo) : 'null'}`);
  }

  const allPlayerStats = await getAllPlayerStats(roomId);
  console.log(`📊 Retrieved ${allPlayerStats.length} player stats from Redis for room ${roomId}`);
  
  const statsMap = new Map<string, PlayerStats & { username: string; socketId: string }>();
  
  for (const playerStat of allPlayerStats) {
    statsMap.set(playerStat.socketId, playerStat);
    console.log(`📊 Mapped stats for socket ${playerStat.socketId}: ${JSON.stringify(playerStat)}`);
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
      
      console.log(`📊 Save result for socket ${socketId}:`, JSON.stringify(playerResult, null, 2));
      
      if (playerResult.userInfo) {
        result.authenticatedPlayers++;
      }
      
      if (playerResult.success) {
        result.savedSuccessfully++;
      } else if (playerResult.error) {
        result.errors.push(`${socketId}: ${playerResult.error}`);
      }
    } else {
      console.error(`❌ Promise rejected for socket ${socketId}:`, promiseResult.reason);
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

  console.log(`📊 Processing stats save for socket ${socketId} in room ${roomId}`);

  try {
    if (!isAuthenticated(socketId)) {
      console.log(`❌ Socket ${socketId} is not authenticated - skipping stats save`);
      return { ...result, error: 'Player not authenticated' };
    }

    console.log(`✅ Socket ${socketId} is authenticated`);

    const userInfo = getUserInfo(socketId);
    if (!userInfo || !isValidUserInfo(userInfo)) {
      console.log(`❌ Socket ${socketId} has invalid user info:`, userInfo);
      return { ...result, error: 'Invalid user info' };
    }

    console.log(`✅ Socket ${socketId} has valid user info:`, JSON.stringify(userInfo));
    result.userInfo = userInfo;

    if (!playerStats) {
      console.log(`❌ Socket ${socketId} has no stats data in Redis`);
      return { ...result, error: 'No stats found for player' };
    }

    console.log(`✅ Socket ${socketId} has stats data:`, JSON.stringify(playerStats));

    const validatedStats = validateAndFormatStats(playerStats);
    if (!validatedStats) {
      console.log(`❌ Socket ${socketId} has invalid stats data:`, playerStats);
      return { ...result, error: 'Invalid stats data' };
    }

    console.log(`✅ Socket ${socketId} has validated stats:`, JSON.stringify(validatedStats));
    result.stats = validatedStats;

    console.log(`📊 Calling saveGameStats for socket ${socketId} with user ${userInfo.name} (${userInfo.id})`);
    const saveSuccess = await saveGameStats(userInfo, validatedStats, roomId);
    
    if (saveSuccess) {
      result.success = true;
      console.log(`✅ Stats saved successfully for ${userInfo.name} (${socketId})`);
    } else {
      console.log(`❌ Failed to save stats to Supabase for ${userInfo.name} (${socketId})`);
      result.error = 'Failed to save to Supabase';
    }

  } catch (error) {
    console.error(`❌ Exception during stats save for socket ${socketId}:`, error);
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