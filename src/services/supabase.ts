// handles saving end-game stats to Supabase for authenticated users
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { PlayerStats, UserInfo } from '../types/game.js';

// ===== TYPES =====

/**
 * database schema for users table
 */
export interface DatabaseUser {
  id: number; // int8 auto-increment primary key
  google_user_id: string; // Google OAuth user ID - required and unique
  username: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * database schema for player game results
 */
export interface GameResult {
  id?: number;
  google_user_id: string; // Direct reference to users.google_user_id
  kills: number;
  deaths: number;
  damage_dealt: number;
  shots_fired: number;
  shots_hit: number;
  time_alive: number;
  room_id: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * aggregated stats for a user across all games
 */
export interface UserStatsAggregate {
  google_user_id: string;
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

// ===== USER MANAGEMENT =====

/**
 * generates a unique username by adding a random suffix if needed
 * ensures username meets criteria: alphanumeric only, 3-12 characters
 */
async function generateUniqueUsername(baseUsername: string): Promise<string> {
  if (!supabase) {
    return baseUsername;
  }

  // Clean and format the base username
  let cleanedBase = baseUsername
    .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric characters
    .slice(0, 12); // Limit to 12 characters

  // Ensure minimum length of 3 characters
  if (cleanedBase.length < 3) {
    cleanedBase = cleanedBase.padEnd(3, '0');
  }
  
  // If still too short after padding, use default
  if (cleanedBase.length < 3) {
    cleanedBase = 'User';
  }

  // First try the cleaned base username
  const { data: existing } = await supabase
    .from('users')
    .select('username')
    .eq('username', cleanedBase)
    .single();

  if (!existing) {
    return cleanedBase;
  }

  // If base username is taken, try numbered variations
  const maxAttempts = 999;
  for (let i = 1; i <= maxAttempts; i++) {
    // Calculate how many digits we need and adjust base length accordingly
    const suffix = i.toString();
    const maxBaseLength = 12 - suffix.length;
    const truncatedBase = cleanedBase.slice(0, maxBaseLength);
    const candidate = `${truncatedBase}${suffix}`;

    const { data: existingVariation } = await supabase
      .from('users')
      .select('username')
      .eq('username', candidate)
      .single();

    if (!existingVariation) {
      return candidate;
    }
  }

  // Fallback to random suffix if all numbered variations are taken
  const randomSuffix = Math.floor(Math.random() * 10000).toString();
  const maxBaseLength = 12 - randomSuffix.length;
  const fallbackBase = cleanedBase.slice(0, Math.max(maxBaseLength, 1)); // Ensure at least 1 char from base
  return `${fallbackBase}${randomSuffix}`;
}

/**
 * creates or updates a user in the database
 * returns the final username and whether it was modified
 */
export async function createOrUpdateUser(userInfo: UserInfo): Promise<{
  username: string;
  wasUsernameModified: boolean;
}> {
  if (!supabase) {
    console.log('📊 Skipping user creation - Supabase not configured');
    return { username: userInfo.name || 'User', wasUsernameModified: false };
  }

  try {
    // Check if user already exists by Google user ID
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('google_user_id', userInfo.id)
      .single();

    if (existingUser) {
      // User exists, return their current username
      console.log(`✅ User with Google ID ${userInfo.id} already exists with username: ${existingUser.username}`);
      return { username: existingUser.username, wasUsernameModified: false };
    }

    // User doesn't exist, create new user
    let baseUsername = userInfo.name || 'User';
    
    // If name is empty or only whitespace, use default
    if (!baseUsername.trim()) {
      baseUsername = 'User';
    }
    
    const uniqueUsername = await generateUniqueUsername(baseUsername);
    const wasUsernameModified = uniqueUsername !== baseUsername.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12);

    const newUser = {
      google_user_id: userInfo.id, // Required Google user ID
      username: uniqueUsername,
      email: userInfo.email || ''
    };

    const { data, error } = await supabase
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create user in database:', error);
      return { username: baseUsername, wasUsernameModified: false };
    }

    console.log(`✅ Created new user with Google ID ${userInfo.id} and username: ${uniqueUsername}`);
    return { username: uniqueUsername, wasUsernameModified };

  } catch (error) {
    console.error('❌ Error creating/updating user:', error);
    return { username: userInfo.name || 'User', wasUsernameModified: false };
  }
}

/**
 * gets a user from the database by Google user ID
 */
export async function getUser(googleUserId: string): Promise<DatabaseUser | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('google_user_id', googleUserId)
      .single();

    if (error) {
      console.error('❌ Failed to fetch user:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    return null;
  }
}

/**
 * updates a user's username in the database
 */
export async function updateUserUsername(googleUserId: string, newUsername: string): Promise<{
  success: boolean;
  username?: string;
  error?: string;
}> {
  if (!supabase) {
    return { success: false, error: 'Database not configured' };
  }

  try {
    const trimmedUsername = newUsername.trim().slice(0, 12);
    
    if (!trimmedUsername) {
      return { success: false, error: 'Username cannot be empty' };
    }

    // Validate username format (alphanumeric only)
    if (!/^[a-zA-Z0-9]+$/.test(trimmedUsername)) {
      return { success: false, error: 'Username can only contain letters and numbers' };
    }

    // Check if username is already taken by another user
    const { data: existingUser } = await supabase
      .from('users')
      .select('google_user_id')
      .eq('username', trimmedUsername)
      .neq('google_user_id', googleUserId)
      .single();

    if (existingUser) {
      return { success: false, error: 'Username already taken' };
    }

    // Update the user's username
    const { data, error } = await supabase
      .from('users')
      .update({ username: trimmedUsername, updated_at: new Date().toISOString() })
      .eq('google_user_id', googleUserId)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to update username:', error);
      return { success: false, error: 'Failed to update username' };
    }

    console.log(`✅ Username updated to "${trimmedUsername}" for Google user ${googleUserId}`);
    return { success: true, username: trimmedUsername };

  } catch (error) {
    console.error('❌ Error updating username:', error);
    return { success: false, error: 'Internal server error' };
  }
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
  console.log(`📊 saveGameStats called for user ${userInfo.name} (${userInfo.id}) in room ${roomId}`);
  
  if (!supabase) {
    console.log('📊 Skipping stats save - Supabase not configured');
    return false;
  }

  try {
    const gameResult: Omit<GameResult, 'id' | 'created_at' | 'updated_at'> = {
      google_user_id: userInfo.id, // Use the Google user ID directly
      kills: stats.kills,
      deaths: stats.deaths,
      damage_dealt: stats.damageDealt,
      shots_fired: stats.shotsFired,
      shots_hit: stats.shotsHit,
      time_alive: stats.timeAlive,
      room_id: roomId
    };

    console.log(`📊 Inserting game result into Supabase:`, JSON.stringify(gameResult, null, 2));

    const { data, error } = await supabase
      .from('game_results')
      .insert([gameResult])
      .select();

    if (error) {
      console.error(`❌ Failed to save game stats to Supabase for user ${userInfo.name}:`, error);
      console.error(`❌ Error details:`, JSON.stringify(error, null, 2));
      return false;
    }

    console.log(`✅ Game stats saved successfully for Google user ${userInfo.id} (${userInfo.name})`);
    console.log(`✅ Saved data:`, JSON.stringify(data, null, 2));
    return true;

  } catch (error) {
    console.error(`❌ Exception saving game stats for user ${userInfo.name}:`, error);
    return false;
  }
}

/**
 * retrieves user's game history from Supabase by Google user ID
 */
export async function getUserGameHistory(
  googleUserId: string,
  limit: number = 10
): Promise<GameResult[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('game_results')
      .select('*')
      .eq('google_user_id', googleUserId) // Use the Google user ID directly
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
 * retrieves aggregated stats for a user across all games by Google user ID
 */
export async function getUserStatsAggregate(googleUserId: string): Promise<UserStatsAggregate | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .rpc('get_user_stats_aggregate', { p_user_id: googleUserId }); // Use the Google user ID directly

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

/**
 * checks if a username is available for use (not taken by any user)
 * returns availability status and validation errors if any
 */
export async function checkUsernameAvailability(username: string, excludeGoogleUserId?: string): Promise<{
  available: boolean;
  error?: string;
}> {
  if (!supabase) {
    return { available: false, error: 'Database not configured' };
  }

  try {
    const trimmedUsername = username.trim();
    
    // Check if username is empty
    if (!trimmedUsername) {
      return { available: false, error: 'Username cannot be empty' };
    }

    // Check minimum length
    if (trimmedUsername.length < 3) {
      return { available: false, error: 'Username must be at least 3 characters' };
    }

    // Check maximum length
    if (trimmedUsername.length > 12) {
      return { available: false, error: 'Username must be 12 characters or less' };
    }

    // Validate username format (alphanumeric only)
    if (!/^[a-zA-Z0-9]+$/.test(trimmedUsername)) {
      return { available: false, error: 'Username can only contain letters and numbers' };
    }

    // Check if username is already taken by another user
    let query = supabase
      .from('users')
      .select('google_user_id')
      .eq('username', trimmedUsername);

    // If excludeGoogleUserId is provided, exclude that user from the check
    // (useful when current user is checking if they can change to a username)
    if (excludeGoogleUserId) {
      query = query.neq('google_user_id', excludeGoogleUserId);
    }

    const { data: existingUser } = await query.single();

    if (existingUser) {
      return { available: false, error: 'Username already taken' };
    }

    return { available: true };

  } catch (error) {
    // If no rows returned, the username is available
    if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
      return { available: true };
    }
    
    console.error('❌ Error checking username availability:', error);
    return { available: false, error: 'Failed to check availability' };
  }
} 