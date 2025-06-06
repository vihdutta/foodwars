/**
 * physics.ts - game physics and collision detection
 * handles player movement, bullet collisions, and wall interactions
 */

// Imports
import { 
  recordShotFired, 
  recordKill, 
  recordDeath, 
  sendDeathScreen, 
  broadcastKillNotification,
  recordShotHit 
} from "./stats.js";
import { incrementPlayerStat } from "../services/redis.js";
import { GAME_CONFIG } from "../constants.js";

// Type imports
import type {
  ServerPlayer,
  ClientPlayerInput,
  PlayerBounds,
  BulletData,
  WallData,
  RoomEmitter,
  GameSocket
} from "../types/game.js";

// ===== CONSTANTS =====

// bullet movement speed in pixels per second
const BULLET_SPEED = GAME_CONFIG.BULLET_SPEED;

// player movement constants
const PLAYER_BASE_SPEED = GAME_CONFIG.PLAYER_BASE_SPEED;
const PLAYER_SPRINT_BONUS = GAME_CONFIG.PLAYER_SPRINT_BONUS;
const BULLET_DAMAGE = GAME_CONFIG.BULLET_DAMAGE;

// world boundaries for bullet cleanup
const WORLD_BOUNDARY = GAME_CONFIG.WORLD_BOUNDARY;

// ===== COLLISION DETECTION =====

/**
 * checks if two rectangular bounding boxes are colliding
 */
export function checkCollision(aBox: PlayerBounds | BulletData | WallData, bBox: PlayerBounds | BulletData | WallData): boolean {
  return (
    aBox.x < bBox.x + bBox.width &&
    aBox.x + aBox.width > bBox.x &&
    aBox.y < bBox.y + bBox.height &&
    aBox.y + aBox.height > bBox.y
  );
}

// ===== PLAYER MOVEMENT =====

/**
 * determines and applies player movement based on input and wall collisions
 * serverPlayer: authoritative server state, clientInput: player input from client
 */
export function determinePlayerMovement(
  serverPlayer: ServerPlayer,
  playerBounds: PlayerBounds,
  clientInput: ClientPlayerInput,
  walls: Record<string, WallData>
): void {
  // calculate movement speed with sprint modifier
  let speed = PLAYER_BASE_SPEED;
  if (clientInput.keyboard.shift) {
    speed += PLAYER_SPRINT_BONUS;
  }

  // movement flags for each direction
  let canMoveUp = true;
  let canMoveLeft = true;
  let canMoveDown = true;
  let canMoveRight = true;

  // check potential collisions with walls before moving
  Object.entries(walls).forEach(([wallId, wall]: [string, WallData]) => {
    // check upward movement collision
    if (checkCollision(wall, { ...playerBounds, y: playerBounds.y - speed })) {
      canMoveUp = false;
    }
    
    // check leftward movement collision
    if (checkCollision(wall, { ...playerBounds, x: playerBounds.x - speed })) {
      canMoveLeft = false;
    }
    
    // check downward movement collision
    if (checkCollision(wall, { ...playerBounds, y: playerBounds.y + speed })) {
      canMoveDown = false;
    }
    
    // check rightward movement collision
    if (checkCollision(wall, { ...playerBounds, x: playerBounds.x + speed })) {
      canMoveRight = false;
    }
  });

  // apply movement based on keyboard input and collision checks
  if (clientInput.keyboard.w && canMoveUp) {
    serverPlayer.y -= speed;
  }
  if (clientInput.keyboard.a && canMoveLeft) {
    serverPlayer.x -= speed;
  }
  if (clientInput.keyboard.s && canMoveDown) {
    serverPlayer.y += speed;
  }
  if (clientInput.keyboard.d && canMoveRight) {
    serverPlayer.x += speed;
  }
}

// ===== BULLET COLLISION HANDLING =====

/**
 * handles collisions between bullets and players
 * applies damage and handles player death
 */
export async function bulletPlayerCollisions(
  io: RoomEmitter,
  socket: GameSocket,
  bullets: Record<string, BulletData>,
  players: Record<string, ServerPlayer>,
  clientInput: ClientPlayerInput,
  playerBounds: PlayerBounds,
  roomId: string
): Promise<void> {
  const currentPlayer = players[clientInput.id];
  if (!currentPlayer) return;

  // check collision between each bullet and the current player
  for (const [bulletId, bullet] of Object.entries(bullets)) {
    // only check collision if bullet wasn't fired by this player
    if (bullet.parent_id !== socket.id) {
      if (checkCollision(bullet, playerBounds)) {
        // find the shooter for stat tracking
        const shooter = players[bullet.parent_id];
        
        // record hit for shooter stats
        if (shooter) {
          recordShotHit(shooter, BULLET_DAMAGE);
          try {
            await incrementPlayerStat(roomId, bullet.parent_id, 'shotsHit', 1);
            await incrementPlayerStat(roomId, bullet.parent_id, 'damageDealt', BULLET_DAMAGE);
          } catch (error) {
            console.error(`❌ Failed to update hit stats for ${bullet.parent_id}:`, error);
          }
        }
        
        // apply damage to player
        currentPlayer.health -= BULLET_DAMAGE;
        
        // remove the bullet that hit
        delete bullets[bulletId];

        // handle player death
        if (currentPlayer.health <= 0) {
          console.log(`💀 ${bullet.parent_username} eliminated ${clientInput.username}`);
          
          // record kill and death stats
          if (shooter) {
            recordKill(shooter);
            try {
              await incrementPlayerStat(roomId, bullet.parent_id, 'kills', 1);
            } catch (error) {
              console.error(`❌ Failed to update kill stats for ${bullet.parent_id}:`, error);
            }
          }
          
          try {
            await incrementPlayerStat(roomId, clientInput.id, 'deaths', 1);
            
            // calculate and record time alive for this life
            const timeAliveThisLife = Math.floor((Date.now() - currentPlayer.sessionStartTime) / 1000);
            await incrementPlayerStat(roomId, clientInput.id, 'timeAlive', timeAliveThisLife);
          } catch (error) {
            console.error(`❌ Failed to update death stats for ${clientInput.id}:`, error);
          }
          
          const deathInfo = recordDeath(currentPlayer, bullet.parent_username);
          
          // send death screen to victim
          sendDeathScreen(socket, deathInfo);
          
          // broadcast kill notification with stats
          if (shooter) {
            broadcastKillNotification(io, bullet.parent_username, clientInput.username, shooter.stats);
          }
          
          // send death update to player
          socket.emit("clientUpdateSelf", currentPlayer);
          return;
        }
      }
    }
  }
}

/**
 * handles collisions between bullets and walls
 * removes bullets that hit walls
 */
export function bulletWallCollisions(
  walls: Record<string, WallData>,
  bullets: Record<string, BulletData>
): void {
  Object.entries(walls).forEach(([wallId, wall]: [string, WallData]) => {
    Object.entries(bullets).forEach(([bulletId, bullet]: [string, BulletData]) => {
      if (checkCollision(wall, bullet)) {
        // remove bullet that hit wall
        delete bullets[bulletId];
      }
    });
  });
}

// ===== BULLET MOVEMENT =====

/**
 * updates bullet positions and removes out-of-bounds bullets
 * broadcasts updated bullet positions to all clients
 */
export function updateBulletPosition(
  io: RoomEmitter,
  bullets: Record<string, BulletData>,
  dt: number
): void {
  // early return if no bullets to update
  if (Object.keys(bullets).length === 0) return;

  // update each bullet's position
  for (const id in bullets) {
    const bullet = bullets[id];
    
    // move bullet based on rotation and speed
    bullet.x += Math.cos(bullet.rotation) * BULLET_SPEED * dt;
    bullet.y += Math.sin(bullet.rotation) * BULLET_SPEED * dt;

    // remove bullets that are out of world bounds
    if (
      bullet.x > WORLD_BOUNDARY ||
      bullet.x < -WORLD_BOUNDARY ||
      bullet.y > WORLD_BOUNDARY ||
      bullet.y < -WORLD_BOUNDARY
    ) {
      delete bullets[id];
    }
  }

  // broadcast updated bullet positions to all clients
  io.emit("clientUpdateAllBullets", bullets);
}
  
