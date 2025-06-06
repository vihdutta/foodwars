/**
 * game-ui-init.ts - Food Wars UI System Integration
 * Initializes and connects the comprehensive UI system with the game
 */

import { UIIntegration } from './ui/UIIntegration.js';

// Types
interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  gameMode: string;
  playerId: string | null;
  playerStats: any | null;
  matchData: any | null;
}

interface GameStateManager {
  events: Map<string, Function[]>;
  state: GameState;
  on(event: string, callback: Function): void;
  emit(event: string, data?: any): void;
  off(event: string, callback: Function): void;
  pauseGame(): void;
  resumeGame(): void;
  startGame(gameMode?: string): void;
  endGame(data?: any): void;
  startQuickPlay(): void;
  triggerPlayerSpawn(playerData: any): void;
  triggerPlayerDeath(deathData: any): void;
  triggerRoundStart(roundData: any): void;
}

interface UIConfig {
  pixiApp: any;
  socket: any;
  gameStateManager: GameStateManager;
  authManager: any;
  enableKeyboardShortcuts: boolean;
  enableDebugMode: boolean;
}

interface EventBus {
  emit(event: string, data?: any): void;
}

// Global UI Integration instance
let gameUISystem: UIIntegration | null = null;

/**
 * Initialize the Food Wars UI System
 */
export async function initializeFoodWarsUI(pixiApp: any, socket: any): Promise<UIIntegration> {
  console.log('🚀 Initializing Food Wars UI System...');

  try {
    // Create game state manager (mock for now - you can replace with real implementation)
    const gameStateManager = createGameStateManager();

    // Get auth manager from global scope
    const authManager = (window as any).authManager;

    // Create UI integration configuration
    const config: UIConfig = {
      pixiApp,
      socket,
      gameStateManager,
      authManager,
      enableKeyboardShortcuts: true,
      enableDebugMode: true
    };

    // Create and initialize UI integration system
    gameUISystem = new UIIntegration(config);
    await gameUISystem.initialize();

    // Setup game event connections
    setupGameEventConnections(gameStateManager);

    // Expose UI system globally for debugging and external access
    (window as any).gameUI = gameUISystem;

    console.log('✅ Food Wars UI System initialized successfully!');
    return gameUISystem;
  } catch (error) {
    console.error('❌ Failed to initialize Food Wars UI System:', error);
    throw error;
  }
}

/**
 * Create a game state manager (mock implementation)
 * Replace this with your actual game state management system
 */
function createGameStateManager(): GameStateManager {
  const eventEmitter = {
    events: new Map<string, Function[]>(),
    
    on(event: string, callback: Function): void {
      if (!this.events.has(event)) {
        this.events.set(event, []);
      }
      this.events.get(event)!.push(callback);
    },
    
    emit(event: string, data?: any): void {
      const callbacks = this.events.get(event);
      if (callbacks) {
        callbacks.forEach(callback => callback(data));
      }
    },
    
    off(event: string, callback: Function): void {
      const callbacks = this.events.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  };

  return {
    ...eventEmitter,
    
    // Game state
    state: {
      isPlaying: false,
      isPaused: false,
      gameMode: 'menu',
      playerId: null,
      playerStats: null,
      matchData: null
    },
    
    // Game control methods
    pauseGame(): void {
      this.state.isPaused = true;
      this.emit('state-changed', { isPaused: true });
    },
    
    resumeGame(): void {
      this.state.isPaused = false;
      this.emit('state-changed', { isPaused: false });
    },
    
    startGame(gameMode: string = 'battle-royale'): void {
      this.state.isPlaying = true;
      this.state.isPaused = false;
      this.state.gameMode = gameMode;
      this.emit('state-changed', {
        isPlaying: true,
        isPaused: false,
        gameMode
      });
    },
    
    endGame(data?: any): void {
      this.state.isPlaying = false;
      this.state.isPaused = false;
      this.emit('game-end', data);
    },
    
    startQuickPlay(): void {
      console.log('🎮 Starting quick play...');
      // Trigger the existing spawn button click
      const spawnButton = document.getElementById('spawn') as HTMLButtonElement;
      if (spawnButton) {
        spawnButton.click();
      }
    },
    
    // Player event triggers
    triggerPlayerSpawn(playerData: any): void {
      this.emit('player-spawn', playerData);
    },
    
    triggerPlayerDeath(deathData: any): void {
      this.emit('player-death', deathData);
    },
    
    triggerRoundStart(roundData: any): void {
      this.emit('round-start', roundData);
    }
  };
}

/**
 * Setup connections between game events and UI system
 */
function setupGameEventConnections(gameStateManager: GameStateManager): void {
  if (!gameUISystem) return;

  const uiManager = gameUISystem.getUIManager();
  const eventBus = uiManager.getEventBus();

  // Connect existing game events to UI system
  connectSocketEvents(eventBus);
  connectGameplayEvents(eventBus, gameStateManager);
  connectMenuEvents(eventBus, gameStateManager);
}

/**
 * Connect socket events to UI system
 */
function connectSocketEvents(eventBus: EventBus): void {
  const socket = (window as any).socket;
  if (!socket) return;

  // Player elimination events
  socket.on('playerKilled', (data: any) => {
    eventBus.emit('player-killed', {
      killerId: data.killerId,
      victimId: data.victimId,
      killerName: data.killerName,
      victimName: data.victimName,
      weapon: data.weapon,
      location: data.location
    });
  });

  // Achievement events
  socket.on('achievementUnlocked', (data: any) => {
    eventBus.emit('achievement-unlocked', data);
  });

  // Killstreak events
  socket.on('killstreak', (data: any) => {
    eventBus.emit('killstreak', {
      playerId: data.playerId,
      playerName: data.playerName,
      streakName: data.streakName,
      kills: data.kills
    });
  });

  // Connection events
  socket.on('connect', () => {
    eventBus.emit('server-message', {
      type: 'success',
      title: 'Connected',
      message: 'Ready to cook!',
      icon: '🌐',
      duration: 2000
    });
  });

  socket.on('disconnect', () => {
    eventBus.emit('connection-lost', {
      reason: 'Connection to server lost'
    });
  });

  // Match events
  socket.on('matchFound', (data: any) => {
    eventBus.emit('match-found', data);
  });

  console.log('🔌 Socket events connected to UI system');
}

/**
 * Connect gameplay events to UI system
 */
function connectGameplayEvents(eventBus: EventBus, gameStateManager: GameStateManager): void {
  // Listen for existing game events and forward to UI
  // Hook into existing spawn button
  const spawnButton = document.getElementById('spawn') as HTMLButtonElement;
  if (spawnButton) {
    const originalClick = spawnButton.onclick;
    spawnButton.onclick = (event: Event) => {
      // Trigger game state change
      gameStateManager.startGame();

      // Show game start notification
      eventBus.emit('game-event', {
        type: 'success',
        title: '🍳 Game Started!',
        message: 'Get cooking, chef!',
        duration: 3000
      });

      // Call original handler if it exists
      if (originalClick) {
        originalClick.call(spawnButton, event);
      }
    };
  }

  console.log('🎮 Gameplay events connected to UI system');
}

/**
 * Connect menu events to UI system
 */
function connectMenuEvents(eventBus: EventBus, gameStateManager: GameStateManager): void {
  // Room join functionality
  const joinRoomBtn = document.getElementById('joinRoomBtn') as HTMLButtonElement;
  const roomIdInput = document.getElementById('roomIdInput') as HTMLInputElement;
  const copyKitchenLinkBtn = document.getElementById('copyKitchenLinkBtn') as HTMLButtonElement;
  
  // Populate room input with current room ID on load
  if (roomIdInput) {
    const currentRoomId = getCurrentRoomIdForInput();
    roomIdInput.value = currentRoomId;
  }
  
  if (joinRoomBtn && roomIdInput) {
    joinRoomBtn.addEventListener('click', () => {
      const roomId = roomIdInput.value.trim();
      if (roomId) {
        // Create the kitchen link following gaming best practices
        const domain = window.location.origin;
        const region = 'us-east';
        const kitchenLink = `${domain}/#${region}:${roomId}`;
        
        // Navigate to the kitchen link and force refresh
        window.location.href = kitchenLink;
        (window.location as any).reload(true);
      } else {
        alert('Please enter a valid room ID');
      }
    });
  }
  
  // Copy kitchen link functionality
  if (copyKitchenLinkBtn) {
    copyKitchenLinkBtn.addEventListener('click', async () => {
      // Generate or get current room ID
      let roomId = roomIdInput ? roomIdInput.value.trim() : '';
      
      // If no room ID entered, generate a random one following gaming best practices
      if (!roomId) {
        roomId = generateRoomId();
        if (roomIdInput) {
          roomIdInput.value = roomId;
        }
      }
      
      // Create the kitchen link following gaming best practices
      const domain = window.location.origin;
      const region = 'us-east';
      const kitchenLink = `${domain}/#${region}:${roomId}`;
      
      try {
        await navigator.clipboard.writeText(kitchenLink);
        // Show success message instead of alert
        const kitchenLinkFeedback = document.getElementById('kitchen-link-feedback');
        const kitchenLinkMessage = document.getElementById('kitchen-link-message');
        if (kitchenLinkMessage && kitchenLinkFeedback) {
          kitchenLinkMessage.textContent = 'Kitchen link copied to clipboard!';
          kitchenLinkFeedback.classList.remove('hidden');
          setTimeout(() => {
            kitchenLinkFeedback.classList.add('hidden');
          }, 3000);
        }
      } catch (err) {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = kitchenLink;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        // Show success message instead of alert
        const kitchenLinkFeedback = document.getElementById('kitchen-link-feedback');
        const kitchenLinkMessage = document.getElementById('kitchen-link-message');
        if (kitchenLinkMessage && kitchenLinkFeedback) {
          kitchenLinkMessage.textContent = 'Kitchen link copied to clipboard!';
          kitchenLinkFeedback.classList.remove('hidden');
          setTimeout(() => {
            kitchenLinkFeedback.classList.add('hidden');
          }, 3000);
        }
      }
    });
  }
  
  console.log('📱 Menu events connected to UI system');
}

/**
 * Generate a random room ID following gaming best practices
 */
function generateRoomId(): string {
  const adjectives = ['SPICY', 'GOLDEN', 'CRISPY', 'FRESH', 'SMOKY', 'ZESTY', 'TENDER', 'JUICY'];
  const nouns = ['CHEF', 'GRILL', 'FEAST', 'DISH', 'COOK', 'FIRE', 'MEAL', 'BITE'];
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  
  return `${adjective}${noun}${number}`;
}

/**
 * Get current room ID for input display
 */
function getCurrentRoomIdForInput(): string {
  const hash = window.location.hash;
  if (hash.length <= 1) return "default";
  
  const hashValue = hash.slice(1); // remove the # symbol
  
  // Check if it's the new region format: us-east:roomId
  if (hashValue.includes(':')) {
    const parts = hashValue.split(':');
    if (parts.length >= 2) {
      // Extract just the room ID part for the input box
      return parts.slice(1).join(':');
    }
  }
  
  // Legacy format or direct room ID
  return hashValue;
}

/**
 * Get the current UI system instance
 */
export function getUISystem(): UIIntegration | null {
  return gameUISystem;
}

/**
 * Show a notification through the UI system
 */
export function showGameNotification(notification: any): any {
  if (gameUISystem) {
    return gameUISystem.showNotification(notification);
  }
  return null;
}

/**
 * Trigger a game event through the UI system
 */
export function triggerGameEvent(event: string, data?: any): void {
  if (gameUISystem) {
    const eventBus = gameUISystem.getUIManager().getEventBus();
    eventBus.emit(event, data);
  }
}

/**
 * Get the game state from the UI system
 */
export function getGameState(): any {
  if (gameUISystem) {
    return gameUISystem.getCurrentGameState();
  }
  return null;
}

/**
 * Cleanup UI system
 */
export function destroyUISystem(): void {
  if (gameUISystem) {
    gameUISystem.destroy();
    gameUISystem = null;
    delete (window as any).gameUI;
  }
} 