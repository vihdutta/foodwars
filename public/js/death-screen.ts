/**
 * death-screen.ts - death screen UI management
 * handles death screen display, stats, and respawn functionality
 */

// Type imports
import type { DeathInfo, PlayerStats } from './types.js';

// Constants imports
import { RESPAWN_COUNTDOWN_SECONDS } from './constants-loader.js';

// Countdown utility imports
import { startCountdown, stopCountdown, stopAllCountdowns, createCountdownElement } from './countdown-timer.js';

// Styling imports
import { applyGlassEffect, applyBackgroundDim, showMenuDimmer, hideMenuDimmer } from './styling.js';

// ===== DEATH SCREEN MANAGEMENT =====

// Auto-return timer removed - not needed since auto-respawn is faster

/**
 * creates and shows the death screen with stats and respawn options
 */
export function showDeathScreen(deathInfo: DeathInfo): void {
  // hide main UI and auth section
  const mainUI = document.getElementById("main-ui");
  const authSection = document.getElementById("auth-section");
  
  if (mainUI) mainUI.style.display = "none";
  if (authSection) authSection.style.display = "none";

  // show menu dimmer for death screen
  showMenuDimmer();

  // create death screen container
  const deathScreen = createDeathScreenContainer();
  
  // add death screen content
  const content = createDeathScreenContent(deathInfo);
  deathScreen.appendChild(content);
  
  // add to body
  document.body.appendChild(deathScreen);
  
  // start respawn countdown using new utility
  startCountdown({
    elementId: "countdown-timer",
    prefixText: "Auto-respawn in ",
    suffixText: " seconds",
    initialSeconds: RESPAWN_COUNTDOWN_SECONDS,
    onComplete: handleRespawn
  });
}

/**
 * hides the death screen and cleans up timers
 */
export function hideDeathScreen(): void {
  const deathScreen = document.getElementById("death-screen");
  if (deathScreen) {
    document.body.removeChild(deathScreen);
  }
  
  // hide menu dimmer when death screen closes
  hideMenuDimmer();
  
  // cleanup timers
  stopCountdown("countdown-timer");
}

/**
 * forces the death screen to close (used when game ends)
 */
export function forceCloseDeathScreen(): void {
  console.log("🏁 Force closing death screen due to game end");
  stopAllCountdowns(); // Stop all active countdowns when game ends
  hideDeathScreen();
}

/**
 * creates the main death screen container with chef-themed styling
 */
function createDeathScreenContainer(): HTMLElement {
  const container = document.createElement("div");
  container.id = "death-screen";
  container.className = "fixed inset-0 z-50 flex items-center justify-center";
  container.style.fontFamily = "'Fredoka One', cursive";
  container.style.background = "transparent"; // no background - using centralized menu dimmer
  
  return container;
}

/**
 * creates the death screen content with stats and buttons
 */
function createDeathScreenContent(deathInfo: DeathInfo): HTMLElement {
  const content = document.createElement("div");
  content.className = "rounded-3xl p-8 max-w-md w-full mx-4 text-center shadow-2xl";
  
  // apply glass effect using styling utility
  applyGlassEffect(content);
  
  const verbs = [
    "roasted", "grilled", "fried", "sautéed", "charred", "seared", "poached", "braised", "baked", "smoked"
  ];
  const randomVerb = verbs[Math.floor(Math.random() * verbs.length)];

  content.innerHTML = `
    <!-- Death Header -->
    <div class="mb-6">
      <div class="text-6xl mb-2">💀</div>
      <h1 class="text-3xl font-bold text-white mb-2">You've Been Cooked!</h1>
      <p class="text-orange-100 text-lg">
        <span class="text-red-300 font-bold">${deathInfo.killedBy}</span> 
        ${randomVerb} you with a ${deathInfo.killedByWeapon}
      </p>
    </div>

    <!-- Session Stats -->
    <div class="bg-black bg-opacity-30 rounded-2xl p-6 mb-6 border border-orange-300 border-opacity-50">
      <h2 class="text-xl font-bold text-orange-200 mb-4 flex items-center justify-center">
        📊 Session Stats
      </h2>
      
      <div class="grid grid-cols-2 gap-4 text-white">
        <div class="bg-orange-500 bg-opacity-30 rounded-xl p-3">
          <div class="text-2xl font-bold">${deathInfo.finalStats.kills}</div>
          <div class="text-sm text-orange-200">🔥 Eliminations</div>
        </div>
        
        <div class="bg-red-500 bg-opacity-30 rounded-xl p-3">
          <div class="text-2xl font-bold">${deathInfo.finalStats.deaths}</div>
          <div class="text-sm text-red-200">💀 Deaths</div>
        </div>
        
        <div class="bg-yellow-500 bg-opacity-30 rounded-xl p-3">
          <div class="text-2xl font-bold">${calculateAccuracy(deathInfo.finalStats)}%</div>
          <div class="text-sm text-yellow-200">🎯 Accuracy</div>
        </div>
        
        <div class="bg-green-500 bg-opacity-30 rounded-xl p-3">
          <div class="text-2xl font-bold">${formatTime(deathInfo.timeAlive)}</div>
          <div class="text-sm text-green-200">⏱️ Survived</div>
        </div>
        
        <div class="bg-blue-500 bg-opacity-30 rounded-xl p-3">
          <div class="text-2xl font-bold">${deathInfo.finalStats.damageDealt}</div>
          <div class="text-sm text-blue-200">💥 Damage</div>
        </div>
        
        <div class="bg-purple-500 bg-opacity-30 rounded-xl p-3">
          <div class="text-2xl font-bold">${calculateKDR(deathInfo.finalStats)}</div>
          <div class="text-sm text-purple-200">📈 K/D Ratio</div>
        </div>
      </div>
    </div>

    <!-- Respawn Options -->
    <div class="space-y-4">
      <button 
        id="respawn-button"
        class="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg border-2 border-orange-300 border-opacity-50"
      >
        🍳 Return to Kitchen
      </button>
      
      <div id="countdown-timer" class="text-orange-200 text-sm">
        Auto-respawn in <span class="font-bold text-white">30</span> seconds
      </div>
      
      <button 
        id="main-menu-button"
        class="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg border-2 border-gray-400 border-opacity-50"
      >
        🏠 Main Menu
      </button>
    </div>
  `;
  
  // add event listeners
  setupDeathScreenEventListeners(content);
  
  return content;
}

/**
 * sets up event listeners for death screen buttons
 */
function setupDeathScreenEventListeners(content: HTMLElement): void {
  const respawnButton = content.querySelector("#respawn-button") as HTMLButtonElement;
  const mainMenuButton = content.querySelector("#main-menu-button") as HTMLButtonElement;
  
  if (respawnButton) {
    respawnButton.addEventListener("click", handleRespawn);
  }
  
  if (mainMenuButton) {
    mainMenuButton.addEventListener("click", handleMainMenu);
  }
}

// Auto-return timer function removed - not needed since auto-respawn is faster

/**
 * handles respawn button click
 */
function handleRespawn(): void {
  hideDeathScreen();
  
  // trigger respawn by clicking the spawn button
  const spawnButton = document.getElementById("spawn") as HTMLButtonElement;
  if (spawnButton) {
    spawnButton.click();
  }
}

/**
 * handles main menu button click
 */
function handleMainMenu(): void {
  hideDeathScreen();
  
  // show main UI and auth section
  const mainUI = document.getElementById("main-ui");
  const authSection = document.getElementById("auth-section");
  
  if (mainUI) mainUI.style.display = "flex";
  if (authSection) authSection.style.display = "block";
  
  // show menu dimmer for main menu
  showMenuDimmer();
}

// ===== UTILITY FUNCTIONS =====

/**
 * calculates accuracy percentage
 */
function calculateAccuracy(stats: PlayerStats): number {
  if (stats.shotsFired === 0) return 0;
  return Math.round((stats.shotsHit / stats.shotsFired) * 100);
}

/**
 * calculates kill/death ratio
 */
function calculateKDR(stats: PlayerStats): number {
  if (stats.deaths === 0) return stats.kills;
  return Math.round((stats.kills / stats.deaths) * 100) / 100;
}

/**
 * formats time in seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 