/**
 * notifications.ts - Efficient HTML notification system
 */

import { NOTIFICATION_COLORS } from './constants.js';
import { isPlayerPlaying, getCurrentUsername } from './client.js';

class NotificationManager {
  private container: HTMLElement;
  private notifications = new Set<HTMLElement>();

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none';
    document.body.appendChild(this.container);
  }

  show(message: string, duration = 6000): void {
    // Only show notifications when player is playing
    if (!isPlayerPlaying()) return;

    const notification = document.createElement('div');
    
    // Check if this is a kill notification where current player is the killer
    const currentUsername = getCurrentUsername();
    const isKillerNotification = message.startsWith(`${currentUsername} eliminated`);
    
    // Apply red background for killer notifications, default for others
    const backgroundClass = isKillerNotification 
      ? 'backdrop-blur-sm bg-red-600/80 border border-red-500/50' 
      : NOTIFICATION_COLORS.GLASS_BASE;
    
    notification.className = `pointer-events-auto px-4 py-3 rounded-xl shadow-2xl border-l-4 text-lg flex justify-between items-center transform transition-all duration-300 opacity-0 translate-x-full ${backgroundClass} ${NOTIFICATION_COLORS.TEXT_DEFAULT}`;
    notification.style.fontFamily = 'Fredoka One, cursive';
    
    notification.innerHTML = `<span class="flex-1">${message}</span><button class="ml-3 opacity-70 hover:opacity-100 transition-opacity">×</button>`;

    notification.lastElementChild!.addEventListener('click', () => this.remove(notification));

    this.container.appendChild(notification);
    this.notifications.add(notification);

    // Trigger animation
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0)';
    });

    setTimeout(() => this.remove(notification), duration);
  }

  private remove(notification: HTMLElement): void {
    if (!this.notifications.has(notification)) return;

    this.notifications.delete(notification);
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';

    setTimeout(() => notification.remove(), 300);
  }
}

const notifications = new NotificationManager();

// Simple notification function
export function notification(text: string): void {
  notifications.show(text);
}

// Compatibility function
export function notification_init() {
  return { notificationContainer: null, notification };
} 