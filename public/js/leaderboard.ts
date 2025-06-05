/**
 * leaderboard.ts - handles leaderboard display and data fetching
 */

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_kills: number;
  total_deaths: number;
  avg_kdr: number;
  avg_accuracy: number;
  total_time_alive: number;
  total_games: number;
  last_played: string;
}

/**
 * Creates and manages the leaderboard component
 */
export class LeaderboardManager {
  private container: HTMLElement;
  private isVisible: boolean = false;

  constructor() {
    this.container = this.createLeaderboardContainer();
    this.attachToDOM();
    this.setupEventListeners();
    this.setupMainUISync();
    // Load data immediately on construction
    this.loadLeaderboard();
  }

  /**
   * Creates the leaderboard HTML structure positioned next to main island
   */
  private createLeaderboardContainer(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'leaderboard-container';
    container.className = 'fixed left-8 top-1/2 transform -translate-y-1/2 z-40 w-80 pointer-events-auto';
    container.style.display = 'block';
    
    container.innerHTML = `
      <div class="glass-effect rounded-xl p-6 h-[28rem] flex flex-col">
        <!-- Header -->
        <div class="flex items-center justify-center mb-4">
          <div class="flex items-center gap-2">
            <i class="fas fa-trophy text-chef-yellow text-xl"></i>
            <h2 class="text-white font-bold text-lg font-chef">TOP CHEFS</h2>
          </div>
        </div>
        
        <!-- Metric Selector -->
        <div class="mb-3">
          <select id="leaderboard-metric" class="w-full bg-white/20 border-2 border-chef-yellow/50 rounded-lg px-3 py-2 text-white text-sm focus:border-chef-yellow focus:outline-none leaderboard-dropdown">
            <option value="kills">🔥 Most Kills</option>
            <option value="kdr">⚔️ Best K/D Ratio</option>
            <option value="accuracy">🎯 Best Accuracy</option>
            <option value="time_alive">⏱️ Longest Survivor</option>
          </select>
        </div>
        
        <!-- Leaderboard List -->
        <div class="flex-1 overflow-y-auto">
          <div id="leaderboard-list" class="space-y-2">
            <!-- Leaderboard entries will be inserted here -->
          </div>
          
          <!-- Loading State -->
          <div id="leaderboard-loading" class="flex items-center justify-center h-full">
            <div class="text-white/70 text-center">
              <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
              <div>Loading leaderboard...</div>
            </div>
          </div>
          
          <!-- Empty State -->
          <div id="leaderboard-empty" class="flex items-center justify-center h-full" style="display: none;">
            <div class="text-white/70 text-center">
              <i class="fas fa-utensils text-3xl mb-2"></i>
              <div>No chefs have been ranked yet!</div>
              <div class="text-sm mt-1">Play some games to see rankings</div>
            </div>
          </div>
          
          <!-- Error State -->
          <div id="leaderboard-error" class="flex items-center justify-center h-full" style="display: none;">
            <div class="text-red-400 text-center">
              <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
              <div>Failed to load leaderboard</div>
              <button id="leaderboard-retry" class="text-chef-yellow hover:text-chef-orange text-sm mt-2 underline">
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    return container;
  }

  /**
   * Attaches the leaderboard to the DOM
   */
  private attachToDOM(): void {
    // Find the main UI container and add leaderboard as sibling
    const mainUI = document.getElementById('main-ui');
    if (mainUI) {
      // Insert leaderboard before main-ui so it appears to the left
      mainUI.parentNode?.insertBefore(this.container, mainUI);
    } else {
      console.warn('main-ui element not found, falling back to body');
      document.body.appendChild(this.container);
    }
  }

  /**
   * Sets up event listeners
   */
  private setupEventListeners(): void {
    // Metric selector
    const metricSelect = this.container.querySelector('#leaderboard-metric') as HTMLSelectElement;
    metricSelect?.addEventListener('change', () => this.loadLeaderboard());
    
    // Retry button
    const retryBtn = this.container.querySelector('#leaderboard-retry');
    retryBtn?.addEventListener('click', () => this.loadLeaderboard());
  }

  /**
   * Shows the leaderboard - now handled by main UI visibility
   */
  public show(): void {
    this.container.style.display = 'block';
    this.isVisible = true;
  }

  /**
   * Hides the leaderboard - now handled by main UI visibility  
   */
  public hide(): void {
    this.container.style.display = 'none';
    this.isVisible = false;
  }

  /**
   * Syncs leaderboard visibility with main UI
   */
  public syncWithMainUI(): void {
    const mainUI = document.getElementById('main-ui');
    if (mainUI) {
      const isMainUIVisible = mainUI.style.display !== 'none';
      if (isMainUIVisible) {
        this.show();
      } else {
        this.hide();
      }
    }
  }

  /**
   * Shows loading state
   */
  private showLoadingState(): void {
    (this.container.querySelector('#leaderboard-loading')! as HTMLElement).style.display = 'flex';
    (this.container.querySelector('#leaderboard-list')! as HTMLElement).style.display = 'none';
    (this.container.querySelector('#leaderboard-empty')! as HTMLElement).style.display = 'none';
    (this.container.querySelector('#leaderboard-error')! as HTMLElement).style.display = 'none';
  }

  /**
   * Shows error state
   */
  private showErrorState(): void {
    (this.container.querySelector('#leaderboard-loading')! as HTMLElement).style.display = 'none';
    (this.container.querySelector('#leaderboard-list')! as HTMLElement).style.display = 'none';
    (this.container.querySelector('#leaderboard-empty')! as HTMLElement).style.display = 'none';
    (this.container.querySelector('#leaderboard-error')! as HTMLElement).style.display = 'flex';
  }

  /**
   * Shows empty state
   */
  private showEmptyState(): void {
    (this.container.querySelector('#leaderboard-loading')! as HTMLElement).style.display = 'none';
    (this.container.querySelector('#leaderboard-list')! as HTMLElement).style.display = 'none';
    (this.container.querySelector('#leaderboard-empty')! as HTMLElement).style.display = 'flex';
    (this.container.querySelector('#leaderboard-error')! as HTMLElement).style.display = 'none';
  }

  /**
   * Shows leaderboard content
   */
  private showLeaderboardContent(): void {
    (this.container.querySelector('#leaderboard-loading')! as HTMLElement).style.display = 'none';
    (this.container.querySelector('#leaderboard-list')! as HTMLElement).style.display = 'block';
    (this.container.querySelector('#leaderboard-empty')! as HTMLElement).style.display = 'none';
    (this.container.querySelector('#leaderboard-error')! as HTMLElement).style.display = 'none';
  }

  /**
   * Loads leaderboard data and updates display
   */
  private async loadLeaderboard(): Promise<void> {
    const metricSelect = this.container.querySelector('#leaderboard-metric') as HTMLSelectElement;
    const metric = metricSelect.value || 'kills';

    this.showLoadingState();

    try {
      const leaderboard = await this.fetchLeaderboardData(metric);
      
      if (leaderboard.length === 0) {
        this.showEmptyState();
      } else {
        this.updateLeaderboardDisplay(leaderboard, metric);
        this.showLeaderboardContent();
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      this.showErrorState();
    }
  }

  /**
   * Fetches leaderboard data from API
   */
  private async fetchLeaderboardData(metric: string): Promise<LeaderboardEntry[]> {
    const response = await fetch(`/api/leaderboard?metric=${metric}&limit=10`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch leaderboard');
    }
    
    return result.data;
  }

  /**
   * Updates the leaderboard display with new data
   */
  private updateLeaderboardDisplay(leaderboard: LeaderboardEntry[], metric: string): void {
    const listContainer = this.container.querySelector('#leaderboard-list')!;
    
    listContainer.innerHTML = leaderboard.map((entry, index) => {
      const rank = index + 1;
      const mainValue = this.getMainValue(entry, metric);
      const badge = this.getRankBadge(rank);
      
      return `
        <div class="bg-white/10 rounded-lg p-3 hover:bg-white/20 transition-colors">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="text-chef-yellow font-bold text-lg w-6 text-center">
                ${badge}
              </div>
              <div>
                <div class="text-white font-semibold text-sm">${this.escapeHtml(entry.username)}</div>
                <div class="text-white/70 text-xs">${entry.total_games} games played</div>
              </div>
            </div>
            <div class="text-right">
              <div class="text-chef-yellow font-bold">${mainValue}</div>
              <div class="text-white/60 text-xs">${this.getSecondaryInfo(entry, metric)}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Gets the main value to display based on metric
   */
  private getMainValue(entry: LeaderboardEntry, metric: string): string {
    switch (metric) {
      case 'kills':
        return entry.total_kills.toString();
      case 'kdr':
        return entry.avg_kdr.toFixed(2);
      case 'accuracy':
        return entry.avg_accuracy.toFixed(1) + '%';
      case 'time_alive':
        return this.formatTime(entry.total_time_alive);
      default:
        return entry.total_kills.toString();
    }
  }

  /**
   * Gets secondary info to display
   */
  private getSecondaryInfo(entry: LeaderboardEntry, metric: string): string {
    switch (metric) {
      case 'kills':
        return `${entry.avg_kdr.toFixed(2)} K/D`;
      case 'kdr':
        return `${entry.total_kills} kills`;
      case 'accuracy':
        return `${entry.total_kills} kills`;
      case 'time_alive':
        return `${entry.total_kills} kills`;
      default:
        return `${entry.avg_kdr.toFixed(2)} K/D`;
    }
  }

  /**
   * Gets rank badge emoji or number
   */
  private getRankBadge(rank: number): string {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return rank.toString();
    }
  }

  /**
   * Formats time in seconds to readable format
   */
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Escapes HTML characters to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Cleanup method
   */
  public destroy(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  /**
   * Sets up automatic syncing with main UI visibility
   */
  private setupMainUISync(): void {
    const mainUI = document.getElementById('main-ui');
    if (mainUI) {
      // Initial sync
      this.syncWithMainUI();
      
      // Watch for style changes on main UI
      const observer = new MutationObserver(() => {
        this.syncWithMainUI();
      });
      
      observer.observe(mainUI, {
        attributes: true,
        attributeFilter: ['style']
      });
    }
  }
} 