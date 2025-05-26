/**
 * countdown-timer.ts - reusable countdown timer utility
 * provides a unified countdown system for different UI screens
 */

// ===== COUNTDOWN TIMER UTILITY =====

interface CountdownConfig {
  elementId: string;           // ID of the element to update
  prefixText: string;          // Text before the countdown number
  suffixText: string;          // Text after the countdown number
  initialSeconds: number;      // Starting countdown value
  onComplete: () => void;      // Function to call when countdown reaches 0
  onUpdate?: (seconds: number) => void; // Optional callback for each update
}

interface CountdownInstance {
  config: CountdownConfig;
  currentSeconds: number;
  intervalId: NodeJS.Timeout | null;
  isActive: boolean;
}

// Global registry of active countdowns
const activeCountdowns = new Map<string, CountdownInstance>();

/**
 * starts a new countdown timer with the given configuration
 */
export function startCountdown(config: CountdownConfig): void {
  // Stop any existing countdown for this element
  stopCountdown(config.elementId);
  
  const instance: CountdownInstance = {
    config,
    currentSeconds: config.initialSeconds,
    intervalId: null,
    isActive: true
  };
  
  // Register the countdown
  activeCountdowns.set(config.elementId, instance);
  
  // Update display immediately
  updateCountdownDisplay(instance);
  
  // Start the countdown interval
  instance.intervalId = setInterval(() => {
    if (!instance.isActive) {
      stopCountdown(config.elementId);
      return;
    }
    
    instance.currentSeconds--;
    updateCountdownDisplay(instance);
    
    // Call optional update callback
    if (config.onUpdate) {
      config.onUpdate(instance.currentSeconds);
    }
    
    // Check if countdown is complete
    if (instance.currentSeconds <= 0) {
      stopCountdown(config.elementId);
      config.onComplete();
    }
  }, 1000);
}

/**
 * stops a countdown timer for the given element ID
 */
export function stopCountdown(elementId: string): void {
  const instance = activeCountdowns.get(elementId);
  if (instance) {
    instance.isActive = false;
    
    if (instance.intervalId) {
      clearInterval(instance.intervalId);
      instance.intervalId = null;
    }
    
    activeCountdowns.delete(elementId);
  }
}

/**
 * stops all active countdown timers
 */
export function stopAllCountdowns(): void {
  for (const [elementId] of activeCountdowns) {
    stopCountdown(elementId);
  }
}

/**
 * checks if a countdown is currently active for the given element
 */
export function isCountdownActive(elementId: string): boolean {
  const instance = activeCountdowns.get(elementId);
  return instance ? instance.isActive : false;
}

/**
 * gets the remaining seconds for a countdown
 */
export function getRemainingSeconds(elementId: string): number {
  const instance = activeCountdowns.get(elementId);
  return instance ? instance.currentSeconds : 0;
}

/**
 * updates the countdown display in the DOM
 */
function updateCountdownDisplay(instance: CountdownInstance): void {
  const element = document.getElementById(instance.config.elementId);
  if (element) {
    element.innerHTML = `${instance.config.prefixText}<span class="font-bold text-white">${instance.currentSeconds}</span>${instance.config.suffixText}`;
  }
}

/**
 * creates a countdown display element with consistent styling
 */
export function createCountdownElement(elementId: string, className: string = "text-orange-200 text-sm"): HTMLElement {
  const element = document.createElement("div");
  element.id = elementId;
  element.className = className;
  return element;
} 