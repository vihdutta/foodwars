/**
 * physics.ts - game physics and collision detection
 * handles player movement, bullet collisions, and wall interactions
 */

// bullet movement speed in pixels per second
const BULLET_SPEED = 2000;

// player movement constants
const PLAYER_BASE_SPEED = 3;
const PLAYER_SPRINT_BONUS = 1.5;
const BULLET_DAMAGE = 10;

// world boundaries for bullet cleanup
const WORLD_BOUNDARY = 5000;

/**
 * checks if two rectangular bounding boxes are colliding
 */
export function checkCollision(aBox: any, bBox: any): boolean {
  return (
    aBox.x < bBox.x + bBox.width &&
    aBox.x + aBox.width > bBox.x &&
    aBox.y < bBox.y + bBox.height &&
    aBox.y + aBox.height > bBox.y
  );
}

/**
 * determines and applies player movement based on input and wall collisions
 * note: player, playerBounds, playerData could be consolidated for efficiency
 */
export function determinePlayerMovement(
  player: any,
  playerBounds: any,
  playerData: any,
  walls: Record<string, any>
): void {
  // calculate movement speed with sprint modifier
  let speed = PLAYER_BASE_SPEED;
  if (playerData.keyboard.shift) {
    speed += PLAYER_SPRINT_BONUS;
  }

  // movement flags for each direction
  let canMoveUp = true;
  let canMoveLeft = true;
  let canMoveDown = true;
  let canMoveRight = true;

  // check potential collisions with walls before moving
  Object.entries(walls).forEach(([wallId, wall]) => {
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
  if (playerData.keyboard.w && canMoveUp) {
    player.y -= speed;
  }
  if (playerData.keyboard.a && canMoveLeft) {
    player.x -= speed;
  }
  if (playerData.keyboard.s && canMoveDown) {
    player.y += speed;
  }
  if (playerData.keyboard.d && canMoveRight) {
    player.x += speed;
  }

  // update player rotation
  player.rotation = playerData.rotation;
}

/**
 * handles collisions between bullets and players
 * applies damage and handles player death
 */
export function bulletPlayerCollisions(
  io: any,
  socket: any,
  bullets: Record<string, any>,
  players: Record<string, any>,
  playerData: any,
  playerBounds: any
): void {
  // check collision between each bullet and the current player
  Object.entries(bullets).forEach(([bulletId, bullet]: [string, any]) => {
    // only check collision if bullet wasn't fired by this player
    if (bullet.parent_id !== socket.id) {
      if (checkCollision(bullet, playerBounds)) {
        // apply damage to player
        players[playerData.id].health -= BULLET_DAMAGE;
        
        // remove the bullet that hit
        delete bullets[bulletId];

        // handle player death
        if (players[playerData.id].health <= 0) {
          const killMessage = bullet.parent_username + " killed " + playerData.username;
          console.log(killMessage);
          
          // broadcast kill notification to all players
          io.emit("notification", killMessage);
          
          // send death update to player
          socket.emit("clientUpdateSelf", players[playerData.id]);
          return;
        }
      }
    }
  });
}

/**
 * handles collisions between bullets and walls
 * removes bullets that hit walls
 */
export function bulletWallCollisions(
  walls: Record<string, any>,
  bullets: Record<string, any>
): void {
  Object.entries(walls).forEach(([wallId, wall]) => {
    Object.entries(bullets).forEach(([bulletId, bullet]: [string, any]) => {
      if (checkCollision(wall, bullet)) {
        // remove bullet that hit wall
        delete bullets[bulletId];
      }
    });
  });
}

/**
 * updates bullet positions and removes out-of-bounds bullets
 * broadcasts updated bullet positions to all clients
 */
export function updateBulletPosition(
  io: any,
  bullets: Record<string, any>,
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
  
