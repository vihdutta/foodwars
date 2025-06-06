/**
 * constants-loader.ts - loads constants from backend API
 * Provides a centralized way to access backend constants in the frontend
 */

interface ConstantsResponse {
  success: boolean;
  data?: {
    GAME_CONFIG: any;
    AMMO_CONFIG: any;
    VISUAL_CONFIG: any;
    NOTIFICATION_COLORS: any;
    RENDERING_CONFIG: any;
    SPAWN_POINTS: any;
    DEFAULT_STATS: any;
    CALCULATED_VALUES: any;
  };
  error?: string;
}

let cachedConstants: ConstantsResponse['data'] | null = null;

/**
 * Fetches constants from the backend API
 */
async function fetchConstants(): Promise<ConstantsResponse['data']> {
  if (cachedConstants) {
    return cachedConstants;
  }

  try {
    const response = await fetch('/api/constants');
    const result: ConstantsResponse = await response.json();
    
    if (result.success && result.data) {
      cachedConstants = result.data;
      return cachedConstants;
    } else {
      throw new Error(result.error || 'Failed to fetch constants');
    }
  } catch (error) {
    console.error('❌ Failed to load constants from backend:', error);
    
    // Fallback to default values
    return {
      GAME_CONFIG: {
        GAME_DURATION_MINUTES: 5,
        RESPAWN_COUNTDOWN_SECONDS: 30,
        GAME_ENDED_AUTO_RETURN_SECONDS: 30,
      },
      AMMO_CONFIG: {
        MAX_MAGAZINE: 30,
        STARTING_RESERVE: 240,
        RELOAD_TIME_MS: 3000,
        SHOOTING_COOLDOWN: 100,
      },
      VISUAL_CONFIG: {
        BACKGROUND_DIM: 'rgba(0, 0, 0, 0.4)',
        GLASS_BLUR: '10px',
        GLASS_BACKGROUND_OPACITY: 'rgba(255, 255, 255, 0.1)',
        GLASS_BORDER_OPACITY: 'rgba(255, 255, 255, 0.2)',
      },
      NOTIFICATION_COLORS: {
        GLASS_BASE: 'backdrop-blur-sm bg-gray-900/30 border border-gray-600/30',
        TEXT_DEFAULT: 'text-white',
        TEXT_KILLER: 'text-red-300'
      },
      RENDERING_CONFIG: {
        PIXI: {
          width: 500,
          height: 500,
          backgroundAlpha: 1,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          resizeTo: window,
        },
        GAME: {
          PLAYER_LENGTH: 70,
          ENEMY_SPRITE_SCALE: 2,
          ENEMY_ANCHOR: 0.5,
          ENEMY_POSITION_OFFSET_X: 28,
          ENEMY_POSITION_OFFSET_Y: 28,
          ENEMY_UI_Y_OFFSET: -50,
          HEALTH_BAR_BASE_WIDTH: 60,
          HEALTH_BAR_BASE_HEIGHT: 6,
          HEALTH_BAR_VALUE_MULTIPLIER: 0.6,
          HEALTH_BAR_VALUE_OFFSET: -2,
          HEALTH_BAR_VALUE_HEIGHT: 4,
          HEALTH_BAR_X_OFFSET: -10,
          HEALTH_BAR_Y_BASE: 120,
          HEALTH_BAR_Y_DIVISOR: 6,
          SCREEN_WIDTH_DIVISOR: 1500,
          SCREEN_SIZE_CLAMP: 100,
        },
        ENEMY_BAR: {
          WIDTH: 50,
          HEIGHT: 5,
          Y_OFFSET: 8,
        },
      },
      SPAWN_POINTS: [
        [250, 2100],
        [2650, 2100], 
        [1450, 2100],
        [1450, 250],
        [1450, 3950]
      ],
      DEFAULT_STATS: {
        kills: 0,
        deaths: 0,
        damageDealt: 0,
        shotsFired: 0,
        shotsHit: 0,
        timeAlive: 0,
        gamesPlayed: 0,
      },
      CALCULATED_VALUES: {
        GAME_DURATION_SECONDS: 300,
      }
    };
  }
}

/**
 * Gets constants, loading them if necessary
 */
export async function getConstants(): Promise<ConstantsResponse['data']> {
  return await fetchConstants();
}

/**
 * Gets specific constant groups
 */
export async function getGameConfig() {
  const constants = await getConstants();
  return constants?.GAME_CONFIG;
}

export async function getAmmoConfig() {
  const constants = await getConstants();
  return constants?.AMMO_CONFIG;
}

export async function getVisualConfig() {
  const constants = await getConstants();
  return constants?.VISUAL_CONFIG;
}

export async function getNotificationColors() {
  const constants = await getConstants();
  return constants?.NOTIFICATION_COLORS;
}

export async function getRenderingConfig() {
  const constants = await getConstants();
  return constants?.RENDERING_CONFIG;
}

export async function getSpawnPoints() {
  const constants = await getConstants();
  return constants?.SPAWN_POINTS;
}

export async function getDefaultStats() {
  const constants = await getConstants();
  return constants?.DEFAULT_STATS;
}

export async function getCalculatedValues() {
  const constants = await getConstants();
  return constants?.CALCULATED_VALUES;
}

// Legacy exports for compatibility
export const BACKGROUND_DIM = 'rgba(0, 0, 0, 0.4)';
export const GLASS_BLUR = '10px';
export const GLASS_BACKGROUND_OPACITY = 'rgba(255, 255, 255, 0.1)';
export const GLASS_BORDER_OPACITY = 'rgba(255, 255, 255, 0.2)';

export const NOTIFICATION_COLORS = {
  GLASS_BASE: 'backdrop-blur-sm bg-gray-900/30 border border-gray-600/30',
  TEXT_DEFAULT: 'text-white',
  TEXT_KILLER: 'text-red-300'
} as const;

export const RESPAWN_COUNTDOWN_SECONDS = 30;
export const GAME_ENDED_AUTO_RETURN_SECONDS = 30;
export const GAME_DURATION_SECONDS = 300; 