/**
 * user-session.ts - user session management service
 * links authenticated users with socket connections for stats saving
 */

import type { UserInfo } from '../types/game.js';

// ===== TYPES =====

/**
 * user session information linked to socket
 */
export interface UserSession {
  socketId: string;
  userInfo: UserInfo;
  joinedAt: Date;
  lastActivity: Date;
}

// ===== SESSION STORAGE =====

// Maps socket ID to user info for authenticated players
const authenticatedSockets = new Map<string, UserInfo>();

// Maps user ID to socket ID for reverse lookup
const userToSocketMap = new Map<string, string>();

// ===== SESSION MANAGEMENT =====

/**
 * registers an authenticated user with their socket connection
 */
export function registerAuthenticatedUser(socketId: string, userInfo: UserInfo): void {
  // Remove any existing mapping for this user
  const existingSocketId = userToSocketMap.get(userInfo.id);
  if (existingSocketId) {
    authenticatedSockets.delete(existingSocketId);
  }

  // Store new mapping
  authenticatedSockets.set(socketId, userInfo);
  userToSocketMap.set(userInfo.id, socketId);

  console.log(`🔐 Registered authenticated user: ${userInfo.name} (${userInfo.id}) with socket ${socketId}`);
}

/**
 * unregisters a user session when socket disconnects
 */
export function unregisterUser(socketId: string): void {
  const userInfo = authenticatedSockets.get(socketId);
  if (userInfo) {
    authenticatedSockets.delete(socketId);
    userToSocketMap.delete(userInfo.id);
    console.log(`🔓 Unregistered user: ${userInfo.name} (socket ${socketId})`);
  }
}

/**
 * gets user info for a socket ID
 */
export function getUserInfo(socketId: string): UserInfo | null {
  return authenticatedSockets.get(socketId) || null;
}

/**
 * gets socket ID for a user ID
 */
export function getSocketId(userId: string): string | null {
  return userToSocketMap.get(userId) || null;
}

/**
 * checks if a socket is authenticated
 */
export function isAuthenticated(socketId: string): boolean {
  return authenticatedSockets.has(socketId);
}

/**
 * gets all authenticated sessions
 */
export function getAllAuthenticatedSessions(): UserSession[] {
  const sessions: UserSession[] = [];
  const now = new Date();
  
  for (const [socketId, userInfo] of authenticatedSockets.entries()) {
    sessions.push({
      socketId,
      userInfo,
      joinedAt: now, // We don't track join time currently, using current time
      lastActivity: now
    });
  }
  
  return sessions;
}

/**
 * gets count of authenticated users
 */
export function getAuthenticatedUserCount(): number {
  return authenticatedSockets.size;
}

/**
 * cleans up stale sessions (called periodically)
 */
export function cleanupStaleSessions(): void {
  // Currently just logs the count - could implement timeout logic here
  const count = authenticatedSockets.size;
  if (count > 0) {
    console.log(`🧹 Session cleanup: ${count} authenticated users active`);
  }
}

// ===== UTILITY FUNCTIONS =====

/**
 * validates user info before storing in session
 */
export function validateUserInfo(userInfo: any): userInfo is UserInfo {
  return (
    userInfo &&
    typeof userInfo === 'object' &&
    typeof userInfo.id === 'string' &&
    typeof userInfo.name === 'string' &&
    userInfo.id.length > 0 &&
    userInfo.name.length > 0
  );
}

/**
 * gets authenticated users in a specific room (if we had room tracking)
 */
export function getAuthenticatedUsersInRoom(roomId: string): UserInfo[] {
  // This would require additional room tracking
  // For now, return all authenticated users
  return Array.from(authenticatedSockets.values());
} 