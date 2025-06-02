// handles saving end-game stats to Supabase for authenticated users
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { PlayerStats, UserInfo } from '../types/game.js';

// ===== TYPES =====

/**
 * database schema for player game results
 */
export interface GameResult {
  id?: number;
  user_id: string;
  username: string;
  email?: string;
  kills: number;
  deaths: number;
  damage_dealt: number;
  shots_fired: number;
  shots_hit: number;
  time_alive: number;
  games_played: number;
  game_date: string;
  room_id: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * aggregated stats for a user across all games
 */
export interface UserStatsAggregate {
  user_id: string;
  username: string;
  total_games: number;
  total_kills: number;
  total_deaths: number;
  total_damage_dealt: number;
  total_shots_fired: number;
  total_shots_hit: number;
  total_time_alive: number;
  avg_kdr: number;
  avg_accuracy: number;
  best_game_kills: number;
  last_played: string;
}

// ===== CONFIGURATION =====

let supabase: SupabaseClient | null = null;

/**
 * initializes Supabase client with environment variables
 */
export function initSupabase(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl.trim() === '' || supabaseKey.trim() === '') {
    console.warn('⚠️ Supabase credentials not found or empty - stats will not be saved to database');
    console.warn('   To enable persistent stats, set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
    return null;
  }

  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized successfully');
    return supabase;
  } catch (error) {
    console.error('❌ Failed to initialize Supabase client:', error);
    return null;
  }
}

/**
 * gets the current Supabase client instance
 */
export function getSupabaseClient(): SupabaseClient | null {
  return supabase;
}

// ===== STATS OPERATIONS =====

/**
 * saves end-game stats to Supabase for an authenticated user
 */
export async function saveGameStats(
  userInfo: UserInfo,
  stats: PlayerStats,
  roomId: string
): Promise<boolean> {
  if (!supabase) {
    console.log('📊 Skipping stats save - Supabase not configured');
    return false;
  }

  try {
    const gameResult: Omit<GameResult, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userInfo.id,
      username: userInfo.name,
      email: userInfo.email,
      kills: stats.kills,
      deaths: stats.deaths,
      damage_dealt: stats.damageDealt,
      shots_fired: stats.shotsFired,
      shots_hit: stats.shotsHit,
      time_alive: stats.timeAlive,
      games_played: stats.gamesPlayed,
      game_date: new Date().toISOString(),
      room_id: roomId
    };

    const { data, error } = await supabase
      .from('game_results')
      .insert([gameResult])
      .select();

    if (error) {
      console.error('❌ Failed to save game stats to Supabase:', error);
      return false;
    }

    console.log(`✅ Game stats saved for user ${userInfo.name} (${userInfo.id})`);
    return true;

  } catch (error) {
    console.error('❌ Error saving game stats:', error);
    return false;
  }
}

/**
 * retrieves user's game history from Supabase
 */
export async function getUserGameHistory(
  userId: string,
  limit: number = 10
): Promise<GameResult[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('game_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Failed to fetch user game history:', error);
      return [];
    }

    return data || [];

  } catch (error) {
    console.error('❌ Error fetching user game history:', error);
    return [];
  }
}

/**
 * retrieves aggregated stats for a user across all games
 */
export async function getUserStatsAggregate(userId: string): Promise<UserStatsAggregate | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .rpc('get_user_stats_aggregate', { p_user_id: userId });

    if (error) {
      console.error('❌ Failed to fetch user stats aggregate:', error);
      return null;
    }

    return data?.[0] || null;

  } catch (error) {
    console.error('❌ Error fetching user stats aggregate:', error);
    return null;
  }
}

/**
 * retrieves leaderboard data
 */
export async function getLeaderboard(
  metric: 'kills' | 'kdr' | 'accuracy' | 'time_alive' = 'kills',
  limit: number = 10
): Promise<UserStatsAggregate[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .rpc('get_leaderboard', { 
        p_metric: metric,
        p_limit: limit 
      });

    if (error) {
      console.error('❌ Failed to fetch leaderboard:', error);
      return [];
    }

    return data || [];

  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    return [];
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * validates user info has required fields for database storage
 */
export function isValidUserInfo(userInfo: any): userInfo is UserInfo {
  return (
    userInfo &&
    typeof userInfo.id === 'string' &&
    typeof userInfo.name === 'string' &&
    userInfo.id.length > 0 &&
    userInfo.name.length > 0
  );
}

/**
 * formats stats for database insertion with validation
 */
export function validateAndFormatStats(stats: PlayerStats): PlayerStats | null {
  if (!stats || typeof stats !== 'object') {
    return null;
  }

  // Ensure all numeric fields are valid
  const numericFields: (keyof PlayerStats)[] = [
    'kills', 'deaths', 'damageDealt', 'shotsFired', 'shotsHit', 'timeAlive', 'gamesPlayed'
  ];

  for (const field of numericFields) {
    if (typeof stats[field] !== 'number' || stats[field] < 0) {
      console.warn(`⚠️ Invalid stat value for ${field}:`, stats[field]);
      return null;
    }
  }

  return {
    kills: Math.floor(stats.kills),
    deaths: Math.floor(stats.deaths),
    damageDealt: Math.floor(stats.damageDealt),
    shotsFired: Math.floor(stats.shotsFired),
    shotsHit: Math.floor(stats.shotsHit),
    timeAlive: Math.floor(stats.timeAlive),
    gamesPlayed: Math.floor(stats.gamesPlayed)
  };
} 