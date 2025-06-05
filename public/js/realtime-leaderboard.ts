/**
 * realtime-leaderboard.ts - in-game real-time leaderboard component
 * displays current game leaderboard when holding the visibility key
 */

// ===== TYPES =====

interface LeaderboardPlayer {
  socketId: string;
  username: string;
  kills: number;
  deaths: number;
  isDead: boolean;
  isCurrentPlayer: boolean;
}

interface ServerLocationInfo {
  region: string;
  latency: number;
}

// ===== LEADERBOARD MANAGER CLASS =====

export class RealtimeLeaderboardManager {
  private leaderboardElement: HTMLElement | null = null;
  private isVisible: boolean = false;
  private players: LeaderboardPlayer[] = [];
  private serverInfo: ServerLocationInfo = { region: 'Unknown', latency: 0 };
  private currentPlayerSocketId: string = '';

  constructor() {
    this.createLeaderboardElement();
    console.log('🏆 Real-time leaderboard manager initialized');
  }

  /**
   * creates the main leaderboard DOM element
   */
  private createLeaderboardElement(): void {
    this.leaderboardElement = document.createElement('div');
    this.leaderboardElement.id = 'realtime-leaderboard';
    this.leaderboardElement.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none';
    this.leaderboardElement.style.display = 'none';
    
    document.body.appendChild(this.leaderboardElement);
  }

  /**
   * shows the leaderboard
   */
  public show(): void {
    if (!this.leaderboardElement || this.isVisible) return;
    
    this.isVisible = true;
    this.leaderboardElement.style.display = 'block';
    this.renderLeaderboard();
    console.log('🏆 Real-time leaderboard shown');
  }

  /**
   * hides the leaderboard
   */
  public hide(): void {
    if (!this.leaderboardElement || !this.isVisible) return;
    
    this.isVisible = false;
    this.leaderboardElement.style.display = 'none';
    console.log('🏆 Real-time leaderboard hidden');
  }

  /**
   * updates leaderboard data
   */
  public updateData(
    players: LeaderboardPlayer[],
    currentPlayerSocketId: string,
    serverInfo?: ServerLocationInfo
  ): void {
    this.players = [...players];
    this.currentPlayerSocketId = currentPlayerSocketId;
    
    if (serverInfo) {
      this.serverInfo = serverInfo;
    }

    // mark current player and sort by kills descending, then by deaths ascending
    this.players = this.players.map(player => ({
      ...player,
      isCurrentPlayer: player.socketId === currentPlayerSocketId
    })).sort((a, b) => {
      if (a.kills !== b.kills) {
        return b.kills - a.kills; // Higher kills first
      }
      return a.deaths - b.deaths; // Lower deaths first for same kills
    });

    // re-render if visible
    if (this.isVisible) {
      this.renderLeaderboard();
    }
  }

  /**
   * calculates kill/death ratio
   */
  private calculateKD(kills: number, deaths: number): string {
    if (deaths === 0) {
      return kills === 0 ? '0.00' : kills.toFixed(2);
    }
    return (kills / deaths).toFixed(2);
  }

  /**
   * renders the complete leaderboard
   */
  private renderLeaderboard(): void {
    if (!this.leaderboardElement) return;

    // create main container with dark background instead of glass effect
    const container = document.createElement('div');
    container.className = 'bg-gray-900/95 border border-gray-700 rounded-2xl p-6 min-w-96 max-w-md shadow-2xl';

    // create header
    const header = document.createElement('div');
    header.className = 'text-center mb-4';
    header.innerHTML = `
      <h2 class="font-chef text-2xl text-chef-yellow mb-1">
        LEADERBOARD
      </h2>
      <p class="text-chef-orange text-sm font-game">
        Current Game Stats
      </p>
    `;

    // create table container
    const tableContainer = document.createElement('div');
    tableContainer.className = 'space-y-1';

    // create table header
    const headerRow = document.createElement('div');
    headerRow.className = 'grid grid-cols-12 gap-2 text-xs font-semibold text-chef-yellow/80 border-b border-white/20 pb-2 mb-2';
    headerRow.innerHTML = `
      <div class="col-span-5 text-left">CHEF</div>
      <div class="col-span-2 text-center">KILLS</div>
      <div class="col-span-2 text-center">DEATHS</div>
      <div class="col-span-3 text-center">K/D</div>
    `;

    tableContainer.appendChild(headerRow);

    // create player rows
    this.players.forEach((player, index) => {
      const row = this.createPlayerRow(player, index);
      tableContainer.appendChild(row);
    });

    // create server info row
    const serverRow = this.createServerRow();

    // assemble complete leaderboard
    container.appendChild(header);
    container.appendChild(tableContainer);
    container.appendChild(serverRow);

    // clear and update leaderboard
    this.leaderboardElement.innerHTML = '';
    this.leaderboardElement.appendChild(container);
  }

  /**
   * creates a player row element
   */
  private createPlayerRow(player: LeaderboardPlayer, index: number): HTMLElement {
    const row = document.createElement('div');
    
    // determine row styling
    let rowClasses = 'grid grid-cols-12 gap-2 py-2 px-2 rounded-lg text-sm font-game';
    
    if (player.isCurrentPlayer) {
      // current player gets white background
      rowClasses += ' bg-white/20 text-white font-semibold';
    } else if (player.isDead) {
      // dead players get red tint
      rowClasses += ' bg-red-900/30 text-red-200';
    } else {
      // alternating pattern for other players
      const bgClass = index % 2 === 0 ? 'bg-gray-800/30' : 'bg-gray-700/30';
      rowClasses += ` ${bgClass} text-white/90`;
    }
    
    row.className = rowClasses;

    // create rank indicator without emojis
    const rankText = index === 0 ? '#1' : `#${index + 1}`;
    
    // create chef name with truncation
    const chefName = player.username.length > 12 
      ? player.username.slice(0, 12) + '...' 
      : player.username;

    // add death indicator if applicable (without emoji)
    const statusIndicator = player.isDead ? ' [DEAD]' : '';

    row.innerHTML = `
      <div class="col-span-5 text-left flex items-center">
        <span class="mr-2 text-chef-yellow font-bold">${rankText}</span>
        <span class="truncate">${chefName}${statusIndicator}</span>
      </div>
      <div class="col-span-2 text-center font-bold text-chef-green">${player.kills}</div>
      <div class="col-span-2 text-center font-bold text-chef-red">${player.deaths}</div>
      <div class="col-span-3 text-center font-bold text-chef-orange">${this.calculateKD(player.kills, player.deaths)}</div>
    `;

    return row;
  }

  /**
   * creates the server information row
   */
  private createServerRow(): HTMLElement {
    const serverRow = document.createElement('div');
    serverRow.className = 'mt-4 pt-3 border-t border-white/20';
    
    const serverContainer = document.createElement('div');
    serverContainer.className = 'bg-gray-800/60 rounded-lg p-2 text-center';
    
    serverContainer.innerHTML = `
      <div class="text-xs text-white/70 font-game">
        <span class="text-chef-yellow">Server:</span>
        <span class="ml-2">${this.serverInfo.region}</span>
        <span class="ml-4 text-chef-green">${this.serverInfo.latency}ms</span>
      </div>
    `;

    serverRow.appendChild(serverContainer);
    return serverRow;
  }

  /**
   * gets current visibility state
   */
  public getVisibility(): boolean {
    return this.isVisible;
  }
} 