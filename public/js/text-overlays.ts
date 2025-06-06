/**
 * text-overlays.ts - Modular HTML text overlay system
 * Replaces Pixi.js text elements with clean HTML/CSS overlays
 */

import { isPlayerPlaying } from './client.js';

// TEXT_OVERLAY constants that seem to be missing from constants.ts
const TEXT_OVERLAY_STYLES = {
  FONT_FAMILY: 'monospace',
  SIZE_SMALL: '0.75rem',
};

const TEXT_OVERLAY_POSITIONS = {
  TOP_LEFT: { top: '1rem', left: '1rem' },
  TOP_RIGHT: { top: '1rem', right: '1rem' },
  TOP_CENTER: { top: '1rem', left: '50%', transform: 'translateX(-50%)' },
  BOTTOM_LEFT: { bottom: '1rem', left: '1rem' },
  BOTTOM_RIGHT: { bottom: '1rem', right: '1rem' },
  BOTTOM_CENTER: { bottom: '1rem', left: '50%', transform: 'translateX(-50%)' },
};

const TEXT_OVERLAY_VARIANTS = {
  PRIMARY: { color: '#ffffff', fontSize: '1rem', fontWeight: 'bold' },
  SECONDARY: { color: '#cccccc', fontSize: '0.875rem', fontWeight: 'normal' },
  TIMER: { color: '#ffff00', fontSize: '1.5rem', fontWeight: 'bold' },
};

// Types
interface OverlayOptions {
  updateCallback?: () => void;
  interval?: number;
  customStyles?: Partial<CSSStyleDeclaration>;
}

interface OverlayInfo {
  element: HTMLElement;
  updateCallback?: () => void;
  interval?: number;
}

// Extend HTMLElement to include intervalId
declare global {
  interface HTMLElement {
    intervalId?: NodeJS.Timeout;
  }
}

class TextOverlayManager {
  private overlays = new Map<string, OverlayInfo>();
  private container: HTMLElement;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'text-overlays-container';
    this.container.className = 'fixed inset-0 pointer-events-none z-40';
    this.container.style.fontFamily = TEXT_OVERLAY_STYLES.FONT_FAMILY;
    document.body.appendChild(this.container);
  }

  createBaseOverlay(id: string, text: string, position: string, variant: string, customStyles?: Partial<CSSStyleDeclaration>): HTMLElement {
    this.removeOverlay(id);
    
    const overlay = document.createElement('div');
    overlay.id = `overlay-${id}`;
    overlay.className = 'absolute select-none';
    overlay.textContent = text;
    
    this.applyPositioning(overlay, position);
    this.applyVariantStyling(overlay, variant);
    
    if (customStyles) {
      Object.assign(overlay.style, customStyles);
    }
    
    this.container.appendChild(overlay);
    return overlay;
  }

  applyPositioning(element: HTMLElement, position: string): void {
    const positionStyles = TEXT_OVERLAY_POSITIONS[position as keyof typeof TEXT_OVERLAY_POSITIONS];
    Object.assign(element.style, positionStyles);
  }

  applyVariantStyling(element: HTMLElement, variant: string): void {
    const variantStyles = TEXT_OVERLAY_VARIANTS[variant as keyof typeof TEXT_OVERLAY_VARIANTS];
    Object.assign(element.style, variantStyles);
    element.style.fontFamily = TEXT_OVERLAY_STYLES.FONT_FAMILY;
  }

  /**
   * Creates a text overlay element
   */
  createOverlay(id: string, text: string, position: string, variant: string, options: OverlayOptions = {}): HTMLElement {
    const overlay = this.createBaseOverlay(id, text, position, variant, options.customStyles);
    
    const overlayInfo: OverlayInfo = {
      element: overlay,
      updateCallback: options.updateCallback,
      interval: options.interval
    };
    
    this.overlays.set(id, overlayInfo);
    
    if (options.updateCallback && options.interval) {
      const intervalId = setInterval(() => {
        if (isPlayerPlaying()) {
          options.updateCallback!();
        }
      }, options.interval);
      overlay.intervalId = intervalId;
    }
    
    return overlay;
  }

  /**
   * Updates text content of an overlay
   */
  updateOverlay(id: string, text: string): void {
    const overlayInfo = this.overlays.get(id);
    if (overlayInfo) {
      overlayInfo.element.textContent = text;
    }
  }

  /**
   * Removes an overlay
   */
  removeOverlay(id: string): void {
    const overlayInfo = this.overlays.get(id);
    if (overlayInfo) {
      // Clear interval if exists
      const intervalId = overlayInfo.element.intervalId;
      if (intervalId) {
        clearInterval(intervalId);
      }
      
      // Remove element
      if (overlayInfo.element.parentNode) {
        overlayInfo.element.parentNode.removeChild(overlayInfo.element);
      }
      
      this.overlays.delete(id);
    }
  }

  /**
   * Shows all overlays when playing
   */
  show(): void {
    this.container.style.display = 'block';
  }

  /**
   * Hides all overlays
   */
  hide(): void {
    this.container.style.display = 'none';
  }

  /**
   * Get overlay element by id for external updates
   */
  getOverlay(id: string): HTMLElement | null {
    const overlayInfo = this.overlays.get(id);
    return overlayInfo ? overlayInfo.element : null;
  }
}

// Create global instance
const textOverlayManager = new TextOverlayManager();

// ===== SPECIFIC OVERLAY CREATION FUNCTIONS =====

const createStackedOverlay = (id: string, text: string, basePosition: string, variant: string, stackOffset: number, options?: OverlayOptions): HTMLElement => {
  const customStyles: Partial<CSSStyleDeclaration> = {};
  
  if (basePosition === 'TOP_LEFT') {
    customStyles.top = `calc(${TEXT_OVERLAY_POSITIONS.TOP_LEFT.top} + ${stackOffset * 2}rem)`;
  }
  
  return textOverlayManager.createOverlay(id, text, basePosition, variant, {
    ...options,
    customStyles
  });
};

/**
 * Creates coordinates overlay
 */
export function createCoordinatesOverlay(player: { x: number; y: number }): HTMLElement {
  return textOverlayManager.createOverlay('coordinates', `(${Math.round(player.x)}, ${Math.round(player.y)})`, 'BOTTOM_RIGHT', 'SECONDARY', {
    updateCallback: () => {
      textOverlayManager.updateOverlay('coordinates', `(${Math.round(player.x)}, ${Math.round(player.y)})`);
    },
    interval: 100
  });
}

/**
 * Creates FPS overlay
 */
export function createFPSOverlay(app: { ticker: { FPS: number } }): HTMLElement {
  return textOverlayManager.createOverlay('fps', 'FPS: 0', 'TOP_LEFT', 'PRIMARY', {
    updateCallback: () => {
      textOverlayManager.updateOverlay('fps', `FPS: ${app.ticker.FPS.toFixed(0)}`);
    },
    interval: 100
  });
}

/**
 * Creates socket ID overlay
 */
export function createSocketOverlay(socket: { id: string }): HTMLElement {
  return textOverlayManager.createOverlay('socket', `SOCKET: ${socket.id}`, 'BOTTOM_RIGHT', 'SECONDARY', {
    customStyles: {
      bottom: '0.5rem',
      fontSize: TEXT_OVERLAY_STYLES.SIZE_SMALL,
      opacity: '0.7'
    }
  });
}

/**
 * Creates bullet count overlay
 */
export function createBulletCountOverlay(): HTMLElement {
  return createStackedOverlay('bullets', 'Bullets: 0', 'TOP_LEFT', 'PRIMARY', 1);
}

/**
 * Creates ping overlay
 */
export function createPingOverlay(): HTMLElement {
  return createStackedOverlay('ping', 'Ping: 0ms', 'TOP_LEFT', 'PRIMARY', 2);
}

/**
 * Creates wall count overlay
 */
export function createWallCountOverlay(wallCount: number): HTMLElement {
  return createStackedOverlay('walls', `Walls: ${wallCount}`, 'TOP_LEFT', 'SECONDARY', 3);
}

/**
 * Creates timer overlay
 */
export function createTimerOverlay(): HTMLElement {
  return textOverlayManager.createOverlay('timer', '5:00', 'TOP_CENTER', 'TIMER');
}

/**
 * Creates version overlay
 */
export function createVersionOverlay(): HTMLElement {
  return textOverlayManager.createOverlay('version', 'v0.9.0', 'BOTTOM_LEFT', 'SECONDARY', {
    customStyles: {
      fontSize: '0.75rem',
      opacity: '0.6',
      color: '#cccccc'
    }
  });
}

// ===== UPDATE FUNCTIONS =====

/**
 * Updates bullet count
 */
export function updateBulletCount(count: number): void {
  textOverlayManager.updateOverlay('bullets', `Bullets: ${count}`);
}

/**
 * Updates ping
 */
export function updatePing(ping: number): void {
  textOverlayManager.updateOverlay('ping', `Ping: ${ping}ms`);
}

/**
 * Updates timer
 */
export function updateTimer(minutes: number, seconds: number): void {
  textOverlayManager.updateOverlay('timer', `${minutes}:${seconds.toString().padStart(2, '0')}`);
}

// ===== CONTROL FUNCTIONS =====

/**
 * Shows all text overlays
 */
export function showTextOverlays(): void {
  textOverlayManager.show();
}

/**
 * Hides all text overlays
 */
export function hideTextOverlays(): void {
  textOverlayManager.hide();
}

/**
 * Gets overlay element for external manipulation
 */
export function getTextOverlay(id: string): HTMLElement | null {
  return textOverlayManager.getOverlay(id);
}

/**
 * Compatibility function for legacy graphics.js exports
 */
export function text_overlays_init() {
  return {
    createCoordinatesOverlay,
    createFPSOverlay,
    createSocketOverlay,
    createBulletCountOverlay,
    createPingOverlay,
    createWallCountOverlay,
    createTimerOverlay,
    createVersionOverlay,
    updateBulletCount,
    updatePing,
    updateTimer,
    showTextOverlays,
    hideTextOverlays
  };
} 