/**
 * constants.ts - frontend constants (now importing from backend)
 * re-exports constants from the unified backend constants file
 */

// Import all constants from the unified backend file
import { 
  GAME_CONFIG, 
  VISUAL_CONFIG, 
  NOTIFICATION_COLORS,
  CALCULATED_VALUES
} from '../../src/constants.js';

// Re-export timing constants with original names for compatibility
export const RESPAWN_COUNTDOWN_SECONDS = GAME_CONFIG.RESPAWN_COUNTDOWN_SECONDS;
export const GAME_ENDED_AUTO_RETURN_SECONDS = GAME_CONFIG.GAME_ENDED_AUTO_RETURN_SECONDS;
export const GAME_DURATION_SECONDS = CALCULATED_VALUES.GAME_DURATION_SECONDS;

// Re-export visual effects constants with original names
export const BACKGROUND_DIM = VISUAL_CONFIG.BACKGROUND_DIM;
export const GLASS_BLUR = VISUAL_CONFIG.GLASS_BLUR;
export const GLASS_BACKGROUND_OPACITY = VISUAL_CONFIG.GLASS_BACKGROUND_OPACITY;
export const GLASS_BORDER_OPACITY = VISUAL_CONFIG.GLASS_BORDER_OPACITY;

// Re-export notification colors (already named correctly)
export { NOTIFICATION_COLORS }; 