/**
 * game-ui.ts - Modern HTML/CSS Game UI System
 * Replaces PIXI.js text elements with styled HTML elements for better modularity and appearance
 */

import { NOTIFICATION_COLORS } from './constants.js';

// ===== TYPES =====

interface UIElementConfig {
  id: string;
  label?: string;
  position: string;
  style: string;
  getValue: () => string;
  updateInterval?: number;
}

interface UIElement {
  config: UIElementConfig;
  element: HTMLElement;
  container: HTMLElement;
  intervalId?: NodeJS.Timeout;
}

interface CountdownConfig {
  elementId: string;
  position?: string;
  style?: string;
  prefixText: string;
  suffixText: string;
  initialSeconds: number;
  onUpdate?: (seconds: number) => void;
  onComplete: () => void;
}

// ===== UI MANAGER CLASS =====

class GameUIManager {
  private elements = new Map<string, UIElement>();
  private containers = new Map<string, HTMLElement>();
  private countdowns = new Map<string, NodeJS.Timeout>();
  private isVisible = false;

  constructor() {
    this.createContainers();
  }

  /**
   * Creates positioned containers for different UI areas
   */
  createContainers(): void {
    const positions = [
      { key: 'top-left', classes: 'fixed top-4 left-4 z-40 flex flex-col gap-2' },
      { key: 'top-right', classes: 'fixed top-4 right-4 z-40 flex flex-col gap-2' },
      { key: 'bottom-left', classes: 'fixed bottom-4 left-4 z-40 flex flex-col gap-2' },
      { key: 'bottom-right', classes: 'fixed bottom-4 right-4 z-40 flex flex-col gap-2' },
      { key: 'top-center', classes: 'fixed top-4 left-1/2 transform -translate-x-1/2 z-40 flex flex-col gap-2' },
      { key: 'bottom-center', classes: 'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-40 flex flex-col gap-2' }
    ];

    positions.forEach(({ key, classes }) => {
      const container = document.createElement('div');
      container.className = classes;
      container.id = `ui-container-${key}`;
      container.style.display = 'none'; // Hidden by default
      document.body.appendChild(container);
      this.containers.set(key, container);
    });
  }

  /**
   * Adds a UI element to the system
   */
  addElement(config: UIElementConfig): void {
    // Remove existing element if it exists
    this.removeElement(config.id);

    // Create the UI element
    const element = this.createElement(config);
    const container = this.containers.get(config.position);
    
    if (!container) {
      console.warn(`Container for position ${config.position} not found`);
      return;
    }

    container.appendChild(element.container);

    // Set up update interval if specified
    if (config.updateInterval) {
      element.intervalId = setInterval(() => {
        element.element.textContent = config.getValue();
      }, config.updateInterval);
    }

    // Store the element
    this.elements.set(config.id, element);

    // Update immediately
    element.element.textContent = config.getValue();
  }

  /**
   * Creates a styled UI element based on configuration
   */
  createElement(config: UIElementConfig): UIElement {
    const container = document.createElement('div');
    const element = document.createElement('div');

    // Apply base styling
    const baseClasses = `pointer-events-auto px-3 py-2 rounded-lg shadow-lg border transition-all duration-200 ${NOTIFICATION_COLORS.GLASS_BASE} ${NOTIFICATION_COLORS.TEXT_DEFAULT}`;

    // Apply style-specific classes
    let styleClasses = '';
    switch (config.style) {
      case 'minimal':
        styleClasses = 'text-xs font-mono';
        break;
      case 'large':
        styleClasses = 'text-lg font-bold';
        break;
      case 'accent':
        styleClasses = 'text-sm font-semibold border-l-4 border-chef-orange bg-orange-900/20';
        break;
      case 'countdown':
        styleClasses = 'text-sm font-bold bg-red-900/30 border-red-500/50 text-red-200 animate-pulse';
        break;
      default:
        styleClasses = 'text-sm font-medium';
    }

    container.className = `${baseClasses} ${styleClasses}`;

    // Add label and value elements
    if (config.label) {
      const label = document.createElement('span');
      label.className = 'text-gray-300 mr-2';
      label.textContent = config.label;
      container.appendChild(label);
    }

    element.className = 'text-white font-mono';
    container.appendChild(element);

    return {
      config,
      element,
      container
    };
  }

  /**
   * Removes a UI element from the system
   */
  removeElement(id: string): void {
    const element = this.elements.get(id);
    if (element) {
      // Clear interval if exists
      if (element.intervalId) {
        clearInterval(element.intervalId);
      }

      // Remove from DOM
      element.container.remove();

      // Remove from registry
      this.elements.delete(id);
    }

    // Also stop any countdown for this element
    this.stopCountdown(id);
  }

  /**
   * Updates a specific element's value
   */
  updateElement(id: string, value: string): void {
    const element = this.elements.get(id);
    if (element) {
      element.element.textContent = value;
    }
  }

  /**
   * Starts a countdown timer integrated with the UI system
   */
  startCountdown(config: CountdownConfig): void {
    // Stop any existing countdown for this element
    this.stopCountdown(config.elementId);

    // Create UI element for countdown if it doesn't exist
    if (!this.elements.has(config.elementId)) {
      this.addElement({
        id: config.elementId,
        label: '',
        position: config.position || 'top-center',
        style: config.style || 'countdown',
        getValue: () => `${config.prefixText}${config.initialSeconds}${config.suffixText}`
      });
    }

    let currentSeconds = config.initialSeconds;
    
    // Update display immediately
    this.updateElement(config.elementId, `${config.prefixText}${currentSeconds}${config.suffixText}`);

    // Start countdown interval
    const intervalId = setInterval(() => {
      currentSeconds--;
      this.updateElement(config.elementId, `${config.prefixText}${currentSeconds}${config.suffixText}`);

      // Call optional update callback
      if (config.onUpdate) {
        config.onUpdate(currentSeconds);
      }

      // Check if countdown is complete
      if (currentSeconds <= 0) {
        this.stopCountdown(config.elementId);
        config.onComplete();
      }
    }, 1000);

    this.countdowns.set(config.elementId, intervalId);
  }

  /**
   * Stops a countdown timer
   */
  stopCountdown(elementId: string): void {
    const intervalId = this.countdowns.get(elementId);
    if (intervalId) {
      clearInterval(intervalId);
      this.countdowns.delete(elementId);
    }
  }

  /**
   * Shows all UI elements
   */
  show(): void {
    this.isVisible = true;
    this.containers.forEach(container => {
      container.style.display = 'flex';
    });
  }

  /**
   * Hides all UI elements
   */
  hide(): void {
    this.isVisible = false;
    this.containers.forEach(container => {
      container.style.display = 'none';
    });
  }

  /**
   * Toggles visibility of UI elements
   */
  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Clears all UI elements and countdowns
   */
  clear(): void {
    this.elements.forEach((_, id) => {
      this.removeElement(id);
    });

    this.countdowns.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.countdowns.clear();
  }
}

// ===== GLOBAL UI MANAGER INSTANCE =====

const gameUI = new GameUIManager();

// ===== CONVENIENT SETUP FUNCTIONS =====

/**
 * Sets up the standard game UI elements
 */
export function initializeGameUI(app: any, socket: any, player: any): void {
  // Socket ID (minimal, bottom-left)
  gameUI.addElement({
    id: 'socket-id',
    label: 'Socket:',
    position: 'bottom-left',
    style: 'minimal',
    getValue: () => socket.id?.slice(0, 8) || 'Connecting...'
  });

  // Coordinates (bottom-left)
  gameUI.addElement({
    id: 'coordinates',
    label: 'Pos:',
    position: 'bottom-left',
    style: 'default',
    updateInterval: 100,
    getValue: () => `(${Math.round(player.x)}, ${Math.round(player.y)})`
  });

  // FPS (top-left)
  gameUI.addElement({
    id: 'fps',
    label: 'FPS:',
    position: 'top-left',
    style: 'default',
    updateInterval: 500,
    getValue: () => app.ticker.FPS.toFixed(0)
  });

  // Ping (top-left)
  gameUI.addElement({
    id: 'ping',
    label: 'Ping:',
    position: 'top-left',
    style: 'default',
    getValue: () => '0ms' // Will be updated by ping system
  });

  // Bullet count (top-right)
  gameUI.addElement({
    id: 'bullets',
    label: 'Bullets:',
    position: 'top-right',
    style: 'accent',
    getValue: () => '0' // Will be updated by game logic
  });

  // Wall count (debug, bottom-right)
  gameUI.addElement({
    id: 'walls',
    label: 'Walls:',
    position: 'bottom-right',
    style: 'minimal',
    getValue: () => {
      // Calculate wall count from tilemap
      const tileMap = [[1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 4, 4, 4, 4, 4, 4, 4, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 2, 4, 4, 4, 4, 4, 2, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 2, 2, 3, 3, 3, 2, 2, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 3, 3, 2, 2, 2, 2, 2, 3, 3, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 1, 1, 1, 1, 1, 1], [3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 3, 3, 3, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3], [3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3], [3, 3, 3, 3, 3, 2, 3, 3, 3, 2, 2, 2, 2, 2, 3, 3, 3, 2, 3, 3, 3, 3, 3], [3, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 3], [3, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 3], [3, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 3, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 3], [3, 4, 2, 2, 2, 2, 2, 2, 2, 2, 4, 3, 4, 2, 2, 2, 2, 2, 2, 2, 2, 4, 3], [3, 4, 4, 3, 2, 2, 2, 2, 2, 3, 4, 3, 4, 3, 2, 2, 2, 2, 2, 3, 4, 4, 3], [3, 4, 4, 3, 2, 2, 2, 2, 2, 3, 4, 4, 4, 3, 2, 2, 2, 2, 2, 3, 4, 4, 3], [3, 4, 4, 3, 2, 2, 2, 2, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 3, 4, 4, 3], [3, 4, 4, 3, 2, 2, 2, 2, 2, 3, 4, 4, 4, 3, 2, 2, 2, 2, 2, 3, 4, 4, 3], [3, 4, 4, 3, 2, 2, 2, 2, 2, 3, 4, 3, 4, 3, 2, 2, 2, 2, 2, 3, 4, 4, 3], [3, 4, 2, 2, 2, 2, 2, 2, 2, 2, 4, 3, 4, 2, 2, 2, 2, 2, 2, 2, 2, 4, 3], [3, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 3, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 3], [3, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 3], [3, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 2, 2, 2, 2, 2, 3], [3, 3, 3, 3, 3, 2, 3, 3, 3, 2, 2, 2, 2, 2, 3, 3, 3, 2, 3, 3, 3, 3, 3], [3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3], [3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 3, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3], [1, 1, 1, 1, 1, 1, 3, 2, 2, 2, 3, 3, 3, 2, 2, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 3, 3, 2, 2, 2, 2, 2, 3, 3, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 2, 2, 3, 3, 3, 2, 2, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 2, 4, 4, 4, 4, 4, 2, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 2, 4, 4, 4, 4, 4, 4, 4, 2, 3, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1, 1, 1]];
      return tileMap.flat().filter(tile => tile === 3).length.toString();
    }
  });

  // Game timer (top-center)
  gameUI.addElement({
    id: 'timer',
    label: '',
    position: 'top-center',
    style: 'large',
    getValue: () => '5:00' // Will be updated by game timer system
  });
}

/**
 * Sets up username display
 */
export function setupUsernameDisplay(username: string): void {
  gameUI.addElement({
    id: 'username',
    label: 'Chef:',
    position: 'bottom-left',
    style: 'accent',
    getValue: () => username
  });
}

// ===== EXPORT FUNCTIONS =====

export const gameUIManager = gameUI;

// Individual update functions for backwards compatibility
export function updateSocketDisplay(socketId: string): void {
  gameUI.updateElement('socket-id', socketId.slice(0, 8));
}

export function updatePingDisplay(ping: string): void {
  gameUI.updateElement('ping', ping);
}

export function updateBulletCount(count: number): void {
  gameUI.updateElement('bullets', count.toString());
}

export function updateTimer(timeString: string): void {
  gameUI.updateElement('timer', timeString);
}

export function updateUsername(username: string): void {
  gameUI.updateElement('username', username);
}

// Countdown functions (unified with UI system)
export function startGameCountdown(config: CountdownConfig): void {
  gameUI.startCountdown(config);
}

export function stopGameCountdown(elementId: string): void {
  gameUI.stopCountdown(elementId);
}

// Visibility controls
export function showGameUI(): void {
  gameUI.show();
}

export function hideGameUI(): void {
  gameUI.hide();
}

export function toggleGameUI(): void {
  gameUI.toggle();
}

export function clearGameUI(): void {
  gameUI.clear();
} 