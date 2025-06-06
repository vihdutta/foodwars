/**
 * constants.ts - centralized game constants
 * Single source of truth for all game configuration values
 * Used by both frontend and backend
 */

// ===== GAME CONFIGURATION =====
export const GAME_CONFIG = {
  // Player constants
  PLAYER_SIZE: 70,
  PLAYER_HEALTH: 100,
  PLAYER_BASE_SPEED: 3,
  PLAYER_SPRINT_BONUS: 1.5,
  
  // Bullet constants
  BULLET_WIDTH: 20,
  BULLET_HEIGHT: 5,
  BULLET_OFFSET: 30,
  BULLET_SPREAD: 0.05,
  BULLET_SPEED: 2000,
  BULLET_DAMAGE: 10,
  
  // Timing constants
  SHOOTING_COOLDOWN: 1000 / 10, // 10 shots per second
  ENEMY_UPDATE_RATE: 1000 / 50, // 50 FPS
  BULLET_UPDATE_RATE: 1000 / 50, // 50 FPS
  STATS_UPDATE_RATE: 1000, // 1 second
  PHYSICS_DELTA_TIME: 1 / 60, // 60 FPS physics
  
  // Game timing
  GAME_DURATION_MINUTES: 5,
  RESPAWN_COUNTDOWN_SECONDS: 30,
  GAME_ENDED_AUTO_RETURN_SECONDS: 30,
  
  // World boundaries
  WORLD_BOUNDARY: 5000,
} as const;

// ===== AMMO SYSTEM =====
export const AMMO_CONFIG = {
  MAX_MAGAZINE: 30,
  STARTING_RESERVE: 240,
  RELOAD_TIME_MS: 3000,
  SHOOTING_COOLDOWN: 1000 / 10, // 10 shots per second (matches server)
} as const;

// ===== VISUAL EFFECTS CONSTANTS =====
export const VISUAL_CONFIG = {
  // Background dimming opacity for overlays
  BACKGROUND_DIM: 'rgba(0, 0, 0, 0.4)',
  
  // Backdrop blur amount for glass morphism effects
  GLASS_BLUR: '10px',
  
  // Glass effect background opacity
  GLASS_BACKGROUND_OPACITY: 'rgba(255, 255, 255, 0.1)',
  
  // Glass effect border opacity
  GLASS_BORDER_OPACITY: 'rgba(255, 255, 255, 0.2)',
} as const;

// ===== NOTIFICATION COLORS =====
export const NOTIFICATION_COLORS = {
  // Glass base styling - greyish background
  GLASS_BASE: 'backdrop-blur-sm bg-gray-900/30 border border-gray-600/30',
  
  // Notification text colors
  TEXT_DEFAULT: 'text-white',
  TEXT_KILLER: 'text-red-300'
} as const;

// ===== FRONTEND RENDERING CONSTANTS =====
export const RENDERING_CONFIG = {
  // PIXI.js application constants
  PIXI: {
    width: 500,
    height: 500,
    backgroundAlpha: 1,
    antialias: true,
    resolution: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    resizeTo: typeof window !== 'undefined' ? window : undefined,
  },
  
  // Game visual constants
  GAME: {
    PLAYER_LENGTH: 70,
    ENEMY_SPRITE_SCALE: 2,
    ENEMY_ANCHOR: 0.5,
    ENEMY_POSITION_OFFSET_X: 32 - 4, // preserve exact math
    ENEMY_POSITION_OFFSET_Y: 32 - 4, // preserve exact math
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
  
  // Enemy UI bar configuration
  ENEMY_BAR: {
    WIDTH: 50,
    HEIGHT: 5,
    Y_OFFSET: 8,
  },
} as const;

// ===== SPAWN POINTS =====
export const SPAWN_POINTS = [
  [250, 2100],
  [2650, 2100], 
  [1450, 2100],
  [1450, 250],
  [1450, 3950]
] as const;

// ===== DEFAULT STATS =====
export const DEFAULT_STATS = {
  kills: 0,
  deaths: 0,
  damageDealt: 0,
  shotsFired: 0,
  shotsHit: 0,
  timeAlive: 0,
  gamesPlayed: 0,
} as const;

// ===== AUTHENTICATION CONSTANTS =====
export const AUTH_CONFIG = {
  SESSION: {
    secret: "secret", // todo: use environment variable for production
    resave: false,
    saveUninitialized: true,
  },
  
  GOOGLE_SCOPES: ["profile", "email"],
  
  ROUTES: {
    GOOGLE_LOGIN: "/auth/google",
    GOOGLE_CALLBACK: "/auth/google/callback",
    USER_INFO: "/auth/user",
    LOGOUT: "/auth/logout",
    LEGACY_LOGOUT: "/logout",
  },
} as const;

// ===== CALCULATED VALUES =====
export const CALCULATED_VALUES = {
  // Game duration in seconds (derived from GAME_DURATION_MINUTES)
  GAME_DURATION_SECONDS: GAME_CONFIG.GAME_DURATION_MINUTES * 60,
} as const;

// ===== SERVER CONFIGURATION =====
export const SERVER_CONFIG = {
  PORT: process.env.PORT || 8080,
} as const; 