const bulletSpeed = 2000; // pixels per second

export function checkCollision(aBox, bBox) {
  return (
    aBox.x < bBox.x + bBox.width &&
    aBox.x + aBox.width > bBox.x &&
    aBox.y < bBox.y + bBox.height &&
    aBox.y + aBox.height > bBox.y
  );
}

// what's the difference between plaeyr, playerBounds, playerData? seems inefficient. make it one...
export function determinePlayerMovement(
  player,
  playerBounds,
  playerData,
  walls
) {
  let speed = 3; // player speed
  if (playerData.keyboard.shift) speed += 1.5;

  let canMoveUp = true;
  let canMoveLeft = true;
  let canMoveDown = true;
  let canMoveRight = true;

  // Check potential collisions with walls before moving
  Object.entries(walls).forEach(([wallId, wall]) => {
    if (checkCollision(wall, { ...playerBounds, y: playerBounds.y - speed })) {
      canMoveUp = false;
    }
    if (checkCollision(wall, { ...playerBounds, x: playerBounds.x - speed })) {
      canMoveLeft = false;
    }
    if (checkCollision(wall, { ...playerBounds, y: playerBounds.y + speed })) {
      canMoveDown = false;
    }
    if (checkCollision(wall, { ...playerBounds, x: playerBounds.x + speed })) {
      canMoveRight = false;
    }
  });

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

  player.rotation = playerData.rotation;
}

export function bulletPlayerCollisions(
  io,
  socket,
  bullets,
  players,
  playerData,
  playerBounds
) {
  // Check collision between bullet and player
  // Object.entries(bullets).forEach(([bulletId, bullet]: [string, any]) => {
  Object.entries(bullets).forEach(([bulletId, bullet]) => {
    if (bullet.parent_id !== socket.id) {
      // if the bullet isn't fired from the same person check collision
      if (checkCollision(bullet, playerBounds)) {
        players[playerData.id].health -= 10;
        delete bullets[bulletId];

        if (players[playerData.id].health <= 0) {
          console.log(
            bullet.parent_username + " killed " + playerData.username
          );
          io.emit(
            "notification",
            bullet.parent_username + " killed " + playerData.username
          );
          socket.emit("clientUpdateSelf", players[playerData.id]);
          return;
        }
      }
    }
  });
}

export function bulletWallCollisions(walls, bullets) {
  Object.entries(walls).forEach(([wallId, wall]) => {
    Object.entries(bullets).forEach(([bulletId, bullet]) => {
      if (checkCollision(wall, bullet)) {
        delete bullets[bulletId];
      }
    });
  });
}


export function updateBulletPosition(io, bullets, dt) {
    if (Object.keys(bullets).length === 0) return;
  
    for (const id in bullets) {
      const b = bullets[id];
      b.x += Math.cos(b.rotation) * bulletSpeed * dt;
      b.y += Math.sin(b.rotation) * bulletSpeed * dt;
  
      if (b.x > 5000 || b.x < -5000 || b.y > 5000 || b.y < -5000) {
        delete bullets[id];
      }
    }
  
    io.emit("clientUpdateAllBullets", bullets);
  }
  
