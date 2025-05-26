/**
 * game-ended.ts - game ended screen UI management
 * handles game completion screen display and return to menu functionality
 */

// Type imports
import type { PlayerStats } from './types.js';

// Constants imports
import { GAME_DURATION_SECONDS, GAME_ENDED_AUTO_RETURN_SECONDS } from './constants.js';

// Countdown utility imports
import { startCountdown, stopCountdown } from './countdown-timer.js';

// Styling imports
import { applyGlassEffect, showMenuDimmer } from './styling.js';

// ===== GAME ENDED SCREEN MANAGEMENT =====

/**
 * creates and shows the game ended screen with final stats
 */
export function showGameEndedScreen(finalStats: PlayerStats, gameResults: Array<PlayerStats & { username: string; socketId: string }>): void {
  // hide main UI and auth section
  const mainUI = document.getElementById("main-ui");
  const authSection = document.getElementById("auth-section");
  
  if (mainUI) mainUI.style.display = "none";
  if (authSection) authSection.style.display = "none";

  // show menu dimmer for game ended screen
  showMenuDimmer();

  // create game ended screen container
  const gameEndedScreen = createGameEndedContainer();
  
  // add game ended screen content
  const content = createGameEndedContent(finalStats, gameResults);
  gameEndedScreen.appendChild(content);
  
  // add to body
  document.body.appendChild(gameEndedScreen);
  
  // start auto-return countdown using new utility
  startCountdown({
    elementId: "return-countdown-timer",
    prefixText: "Returning to main menu in ",
    suffixText: " seconds",
    initialSeconds: GAME_ENDED_AUTO_RETURN_SECONDS,
    onComplete: handleReturnToMenu
  });
}

/**
 * hides the game ended screen and returns to main menu
 */
export function hideGameEndedScreen(): void {
  const gameEndedScreen = document.getElementById("game-ended-screen");
  if (gameEndedScreen) {
    document.body.removeChild(gameEndedScreen);
  }
  
  // cleanup timer using new utility
  stopCountdown("return-countdown-timer");
  
  // show main UI and auth section
  const mainUI = document.getElementById("main-ui");
  const authSection = document.getElementById("auth-section");
  
  if (mainUI) mainUI.style.display = "flex";
  if (authSection) authSection.style.display = "block";
  
  // keep menu dimmer for main menu
  showMenuDimmer();
}

/**
 * creates the main game ended screen container
 */
function createGameEndedContainer(): HTMLElement {
  const container = document.createElement("div");
  container.id = "game-ended-screen";
  container.className = "fixed inset-0 z-50 flex items-center justify-center";
  container.style.fontFamily = "'Fredoka One', cursive";
  container.style.background = "transparent"; // using centralized menu dimmer
  
  return container;
}

/**
 * creates the game ended screen content with stats and return button
 */
function createGameEndedContent(finalStats: PlayerStats, gameResults: Array<PlayerStats & { username: string; socketId: string }>): HTMLElement {
  const content = document.createElement("div");
  content.className = "rounded-3xl p-8 max-w-lg w-full mx-4 text-center shadow-2xl";
  
  // apply glass effect using styling utility
  applyGlassEffect(content);
  
  const gameTimeMinutes = Math.floor(GAME_DURATION_SECONDS / 60);

  content.innerHTML = `
    <!-- Game Ended Header -->
    <div class="mb-6">
      <div class="text-6xl mb-2">🏁</div>
      <h1 class="text-4xl font-bold text-white mb-2">Kitchen Closed!</h1>
      <p class="text-orange-100 text-lg">
        The ${gameTimeMinutes}-minute cooking battle has ended
      </p>
    </div>

    <!-- Final Game Stats -->
    <div class="bg-black bg-opacity-30 rounded-2xl p-6 mb-6 border border-orange-300 border-opacity-50">
      <h2 class="text-xl font-bold text-orange-200 mb-4 flex items-center justify-center">
        📊 Final Kitchen Stats
      </h2>
      
      <div class="grid grid-cols-2 gap-4 text-white mb-4">
        <div class="bg-orange-500 bg-opacity-30 rounded-xl p-3">
          <div class="text-2xl font-bold">${finalStats.kills}</div>
          <div class="text-sm text-orange-200">🔥 Total Eliminations</div>
        </div>
        
        <div class="bg-red-500 bg-opacity-30 rounded-xl p-3">
          <div class="text-2xl font-bold">${finalStats.deaths}</div>
          <div class="text-sm text-red-200">💀 Times Cooked</div>
        </div>
        
        <div class="bg-yellow-500 bg-opacity-30 rounded-xl p-3">
          <div class="text-2xl font-bold">${calculateAccuracy(finalStats)}%</div>
          <div class="text-sm text-yellow-200">🎯 Accuracy</div>
        </div>
        
        <div class="bg-green-500 bg-opacity-30 rounded-xl p-3">
          <div class="text-2xl font-bold">${formatTime(finalStats.timeAlive)}</div>
          <div class="text-sm text-green-200">⏱️ Time Survived</div>
        </div>
        
        <div class="bg-blue-500 bg-opacity-30 rounded-xl p-3">
          <div class="text-2xl font-bold">${finalStats.damageDealt}</div>
          <div class="text-sm text-blue-200">💥 Damage Dealt</div>
        </div>
        
        <div class="bg-purple-500 bg-opacity-30 rounded-xl p-3">
          <div class="text-2xl font-bold">${calculateKDR(finalStats)}</div>
          <div class="text-sm text-purple-200">📈 K/D Ratio</div>
        </div>
      </div>

      <!-- Performance Badge -->
      <div class="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-3 text-center">
        <div class="text-lg font-bold text-white">${getPerformanceBadge(finalStats)}</div>
        <div class="text-sm text-yellow-100">Chef Performance</div>
      </div>
    </div>

    <!-- Return to Menu Button -->
    <div class="space-y-4">
      <button 
        id="return-menu-button"
        class="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-2xl text-xl transition-all duration-300 transform hover:scale-105 shadow-lg border-2 border-green-300 border-opacity-50"
      >
        🏠 Return to Main Menu
      </button>
      
      <div id="return-countdown-timer" class="text-orange-200 text-sm">
        Returning to main menu in <span class="font-bold text-white">30</span> seconds
      </div>

    </div>
  `;
  
  // add event listeners
  setupGameEndedEventListeners(content);
  
  return content;
}

/**
 * sets up event listeners for game ended screen buttons
 */
function setupGameEndedEventListeners(content: HTMLElement): void {
  const returnMenuButton = content.querySelector("#return-menu-button") as HTMLButtonElement;
  
  if (returnMenuButton) {
    returnMenuButton.addEventListener("click", handleReturnToMenu);
  }
}

/**
 * handles return to menu button click
 */
function handleReturnToMenu(): void {
  hideGameEndedScreen();
}

/**
 * determines performance badge based on stats
 */
function getPerformanceBadge(stats: PlayerStats): string {
  const kdr = calculateKDR(stats);
  const accuracy = calculateAccuracy(stats);
  
  if (kdr >= 3 && accuracy >= 80) return "🌟 Master Chef";
  if (kdr >= 2 && accuracy >= 60) return "🔥 Head Chef";
  if (kdr >= 1 && accuracy >= 40) return "👨‍🍳 Sous Chef";
  if (stats.kills >= 5) return "🗡️ Kitchen Warrior";
  if (accuracy >= 70) return "🎯 Precision Cook";
  if (stats.timeAlive >= 240) return "🛡️ Survivor";
  
  return "🍳 Apprentice Chef";
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