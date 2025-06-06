/**
 * Frontend Configuration Service
 * Fetches configuration from the backend to ensure consistency
 */

// Types for configuration
interface GameConfig {
  GAME_DURATION_MINUTES: number;
  GAME_ENDED_AUTO_RETURN_SECONDS: number;
  PLAYER_SIZE: number;
  PLAYER_HEALTH: number;
  BULLET_WIDTH: number;
  BULLET_HEIGHT: number;
  BULLET_OFFSET: number;
  BULLET_SPREAD: number;
  SHOOTING_COOLDOWN: number;
  ENEMY_UPDATE_RATE: number;
  BULLET_UPDATE_RATE: number;
  STATS_UPDATE_RATE: number;
  PHYSICS_DELTA_TIME: number;
  USERNAME_MAX_LENGTH: number;
  USERNAME_MIN_LENGTH: number;
  USERNAME_VARIATION_ATTEMPTS: number;
  PORT: number;
}

let config: GameConfig | null = null;

/**
 * Fetches game configuration from the backend
 */
export async function loadConfig(): Promise<GameConfig> {
  if (config) {
    return config;
  }

  try {
    const response = await fetch('/api/config');
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Failed to fetch config');
    }

    config = result.config;
    console.log('✅ Game configuration loaded from backend');
    return config;
  } catch (error) {
    console.error('❌ Failed to load config from backend:', error);
    
    // Fallback to default values
    config = {
      GAME_DURATION_MINUTES: 5,
      GAME_ENDED_AUTO_RETURN_SECONDS: 10,
      PLAYER_SIZE: 70,
      PLAYER_HEALTH: 100,
      BULLET_WIDTH: 20,
      BULLET_HEIGHT: 5,
      BULLET_OFFSET: 30,
      BULLET_SPREAD: 0.05,
      SHOOTING_COOLDOWN: 100,
      ENEMY_UPDATE_RATE: 20,
      BULLET_UPDATE_RATE: 20,
      STATS_UPDATE_RATE: 1000,
      PHYSICS_DELTA_TIME: 1 / 60,
      USERNAME_MAX_LENGTH: 12,
      USERNAME_MIN_LENGTH: 3,
      USERNAME_VARIATION_ATTEMPTS: 50,
      PORT: 8080
    };
    
    console.log('⚠️ Using fallback configuration values');
    return config;
  }
}

/**
 * Gets the current config (must call loadConfig first)
 */
export function getConfig(): GameConfig {
  if (!config) {
    throw new Error('Config not loaded. Call loadConfig() first.');
  }
  return config;
} 