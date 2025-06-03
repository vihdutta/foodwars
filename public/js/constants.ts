/**
 * constants.ts - frontend styling constants
 * centralized styling values used across the entire frontend
 */

// ===== VISUAL EFFECTS CONSTANTS =====

// background dimming opacity for overlays
export const BACKGROUND_DIM = 'rgba(0, 0, 0, 0.4)';

// backdrop blur amount for glass morphism effects
export const GLASS_BLUR = '10px';

// glass effect background opacity
export const GLASS_BACKGROUND_OPACITY = 'rgba(255, 255, 255, 0.1)';

// glass effect border opacity
export const GLASS_BORDER_OPACITY = 'rgba(255, 255, 255, 0.2)';

// ===== NOTIFICATION COLORS =====

export const NOTIFICATION_COLORS = {
  // Glass base styling - greyish background
  GLASS_BASE: 'backdrop-blur-sm bg-gray-900/30 border border-gray-600/30',
  
  // Notification text colors
  TEXT_DEFAULT: 'text-white',
  TEXT_KILLER: 'text-red-300'
} as const;

// ===== TIMING CONSTANTS =====

// death screen auto-respawn countdown in seconds
export const RESPAWN_COUNTDOWN_SECONDS = 30; 

// game ended screen auto-return to menu timeout in seconds
export const GAME_ENDED_AUTO_RETURN_SECONDS = 30;

// game duration in seconds (should match server GAME_DURATION_MINUTES * 60)
export const GAME_DURATION_SECONDS = 5 * 60;