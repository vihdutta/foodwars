const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const server = createServer(app);
const io = new Server(server);

let players = {};
let bullets = {};
let walls = {};
const bulletSpeed = 10;
const playerLength = 70;

// io connections
io.on("connection", (socket) => {
  console.log("SERVER: socket", socket.id, "connected");
  io.emit("notification", socket.id + " connected");

  // Handle ping-pong
  socket.on('ping', (timestamp) => {
    socket.emit('pong', timestamp);
  });

  // updates the player
  socket.on("serverUpdateSelf", (playerData) => {
    if (players[playerData.id]) {
      if (players[playerData.id].health <= 0) {
        players[playerData.id] = {
          ...playerData,
          health: 100,
          x: 0,
          y: 0
        };
        return;
      }
    } else {
      players[playerData.id] = {
        ...playerData,
        health: 100,
        x: 0,
        y: 0
      };
      return;
    }

    let speed = 3; // player speed
    if (playerData.keyboard.shift) {
      speed += 1.5;
    }

    const player = players[playerData.id];
    const playerBounds = {
      x: player.x,
      y: player.y,
      width: playerLength,
      height: playerLength,
    };

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

    // Check collision between bullet and player
    Object.entries(bullets).forEach(([bulletId, bullet]) => {
      if (bullet.parent_id !== socket.id) { // if the bullet isn't fired from the same person check collision
        if (checkCollision(bullet, playerBounds)) {
          players[playerData.id].health -= 10;
          delete bullets[bulletId];

          if (players[playerData.id].health <= 0) {
            console.log(bullet.parent_username + " killed " + playerData.username);
            io.emit("notification", bullet.parent_username + " killed " + playerData.username);
            socket.emit("clientUpdateSelf", players[playerData.id]);
            return;
          }
        }
      }
    });

    // Check collision between wall and bullet
    Object.entries(walls).forEach(([wallId, wall]) => {
      Object.entries(bullets).forEach(([bulletId, bullet]) => {
        if (checkCollision(wall, bullet)) {
          delete bullets[bulletId];
        }
      });
    });

    players[playerData.id] = {
      ...playerData,
      health: players[playerData.id].health,
      x: player.x,
      y: player.y
    };
    socket.emit("clientUpdateSelf", players[playerData.id]);
  });

  socket.on("serverUpdateNewBullet", (bullet) => {
    if (
      players[socket.id] &&
      players[socket.id].hasOwnProperty("health") &&
      players[socket.id].health <= 0
    ) {
      return;
    }

    bullets[bullet.id] = bullet;
    io.emit("clientUpdateNewBullet", bullet);
  });

  socket.on('addWall', (wallData) => {
    walls[wallData.id] = wallData;
  });

  socket.on("disconnect", () => {
    console.log("SERVER: socket", socket.id, "disconnected");
    io.emit("notification", socket.id + " disconnected");
    delete players[socket.id];
  });
});

// Sending x every y seconds
// Send all player data to clients every 10ms excluding the player's own data
setInterval(() => {
  for (const playerSocketId in players) {
    const enemies = { ...players };
    delete enemies[playerSocketId];

    if (enemies[playerSocketId]) {
      if (enemies[playerSocketId].health <= 0) {
        delete enemies[playerSocketId];
      }
    }
    // Emit the updated data to the current player
    io.to(playerSocketId).emit("clientUpdateAllEnemies", enemies);
  }
}, 10);

// Calculate bullet trajectory (server side) (200 times per second)
setInterval(() => {
  for (const bulletId in bullets) {
    const bullet = bullets[bulletId];
    bullet.x += Math.cos(bullet.rotation) * bulletSpeed;
    bullet.y += Math.sin(bullet.rotation) * bulletSpeed;

    if (
      bullet.x > 5000 ||
      bullet.x < -5000 ||
      bullet.y > 5000 ||
      bullet.y < -5000
    ) {
      delete bullets[bulletId];
    }
  }
  io.emit("clientUpdateAllBullets", bullets);
}, 1);

// check for disconnected players and remove them
setInterval(() => {
  for (const playerSocketId in players) {
    if (playerSocketId === "undefined") {
      delete players[playerSocketId];
    }
  }
}, 1500);

// HELPER FUNCTIONS
function checkCollision(aBox, bBox) {
  return (
    aBox.x < bBox.x + bBox.width &&
    aBox.x + aBox.width > bBox.x &&
    aBox.y < bBox.y + bBox.height &&
    aBox.y + aBox.height > bBox.y
  );
}

// final setup
const PORT = process.env.PORT || 8080;
app.use(express.static("public"));
app.use("/pixi", express.static("./node_modules/pixi.js/dist/"));

server.listen(PORT, () => {
  console.log("SERVER STARTED");
});
