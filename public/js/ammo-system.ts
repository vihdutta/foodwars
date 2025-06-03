/**
 * ammo-system.ts - modular ammo management system
 * handles magazine/reserve ammo, reloading mechanics, and state management
 */

import type { Text } from 'pixi.js';

// ===== CONSTANTS =====
const AMMO_CONFIG = {
    MAX_MAGAZINE: 30,
    STARTING_RESERVE: 240,
    RELOAD_TIME_MS: 3000,
    SHOOTING_COOLDOWN: 1000 / 10, // 10 shots per second (matches server)
} as const;

// ===== AMMO STATE =====
interface AmmoState {
    magazine: number;
    reserve: number;
    isReloading: boolean;
    reloadStartTime: number;
    lastShotTime: number;
}

let ammoState: AmmoState = {
    magazine: AMMO_CONFIG.MAX_MAGAZINE,
    reserve: AMMO_CONFIG.STARTING_RESERVE,
    isReloading: false,
    reloadStartTime: 0,
    lastShotTime: 0,
};

// ===== PUBLIC INTERFACE =====

/**
 * Check if player can fire (has ammo, not reloading, and not on cooldown)
 */
export function canFire(): boolean {
    const now = Date.now();
    const cooldownElapsed = now - ammoState.lastShotTime >= AMMO_CONFIG.SHOOTING_COOLDOWN;
    return ammoState.magazine > 0 && !ammoState.isReloading && cooldownElapsed;
}

/**
 * Consume one bullet from magazine
 * Returns true if bullet was consumed, false if no ammo or on cooldown
 */
export function fireBullet(): boolean {
    if (!canFire()) {
        return false;
    }
    
    ammoState.magazine--;
    ammoState.lastShotTime = Date.now();
    return true;
}

/**
 * Check if player can reload (not already reloading, magazine not full, has reserve ammo)
 */
export function canReload(): boolean {
    return !ammoState.isReloading && 
           ammoState.magazine < AMMO_CONFIG.MAX_MAGAZINE && 
           ammoState.reserve > 0;
}

/**
 * Start reload process
 * Returns true if reload started, false if cannot reload
 */
export function startReload(): boolean {
    if (!canReload()) {
        return false;
    }
    
    ammoState.isReloading = true;
    ammoState.reloadStartTime = Date.now();
    return true;
}

/**
 * Update reload progress and complete if time has elapsed
 * Should be called regularly in game loop
 */
export function updateReload(): void {
    if (!ammoState.isReloading) {
        return;
    }
    
    const elapsedTime = Date.now() - ammoState.reloadStartTime;
    if (elapsedTime >= AMMO_CONFIG.RELOAD_TIME_MS) {
        completeReload();
    }
}

/**
 * Check if currently reloading
 */
export function isReloading(): boolean {
    return ammoState.isReloading;
}

/**
 * Get current ammo state for display
 */
export function getAmmoState(): Readonly<AmmoState> {
    return { ...ammoState };
}

/**
 * Update ammo display UI element
 */
export function updateAmmoDisplay(ammoText: Text): void {
    ammoText.text = `${ammoState.magazine}/${ammoState.reserve}`;
}

/**
 * Update reload indicator UI element
 */
export function updateReloadIndicator(reloadText: Text): void {
    reloadText.visible = ammoState.isReloading;
}

/**
 * Reset ammo to starting state (for respawn/game start)
 */
export function resetAmmo(): void {
    ammoState.magazine = AMMO_CONFIG.MAX_MAGAZINE;
    ammoState.reserve = AMMO_CONFIG.STARTING_RESERVE;
    ammoState.isReloading = false;
    ammoState.reloadStartTime = 0;
    ammoState.lastShotTime = 0;
}

// ===== PRIVATE FUNCTIONS =====

/**
 * Complete the reload process
 */
function completeReload(): void {
    const bulletsNeeded = AMMO_CONFIG.MAX_MAGAZINE - ammoState.magazine;
    const bulletsToReload = Math.min(bulletsNeeded, ammoState.reserve);
    
    ammoState.magazine += bulletsToReload;
    ammoState.reserve -= bulletsToReload;
    ammoState.isReloading = false;
    ammoState.reloadStartTime = 0;
}

// ===== EXPORT CONFIGURATION =====
export const AMMO_CONSTANTS = AMMO_CONFIG; 