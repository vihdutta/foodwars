const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const server = createServer(app);
const io = new Server(server);

let players = {};
let bullets = {};
const bulletSpeed = 15;
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

    let speed = 4;
    if (playerData.keyboard.shift) {
      speed += 2;
    }

    if (playerData.keyboard.w) {
        players[playerData.id].y -= speed;
    }
    if (playerData.keyboard.a) {
        players[playerData.id].x -= speed;
    }
    if (playerData.keyboard.s) {
        players[playerData.id].y += speed;
    }
    if (playerData.keyboard.d) {
        players[playerData.id].x += speed;
    }

    const playerBounds = {
      x: players[playerData.id].x,
      y: players[playerData.id].y,
      width: playerLength,
      height: playerLength,
    };

    Object.entries(bullets).forEach(([bulletId, bullet]) => {
      if (bullet.parent_id !== socket.id) { // if the bullet isn't fired from the same person check collision
        if (Math.abs(bullet.x - playerBounds.x) > 5 && Math.abs(bullet.y - playerBounds.y) > 5) {
          return;
        }
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

    players[playerData.id] = { ...playerData, 
        health: players[playerData.id].health,
        x: players[playerData.id].x,
        y: players[playerData.id].y
    };
    socket.emit("clientUpdateSelf", players[playerData.id]);
  });

  socket.on("serverUpdateNewBullet", (bulletData) => {
    if (
      players[socket.id] &&
      players[socket.id].hasOwnProperty("health") &&
      players[socket.id].health <= 0
    ) {
      return;
    }

    bullets[bulletData.id] = bulletData;
    io.emit("clientUpdateNewBullet", bulletData);
  });

  socket.on("disconnect", () => {
    console.log("SERVER: socket", socket.id, "disconnected");
    io.emit("notification", socket.id + " disconnected");
    delete players[socket.id];
  });
});

// Sending x every y seconds
// Send all player data to clients every 5ms (200 times per second) excluding the player's own data
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
  io.emit("clientUpdateAllBullets", bullets);
  for (const bulletId in bullets) {
    const bullet = bullets[bulletId];
    bullet.x += Math.cos(bullet.rotation) * bulletSpeed;
    bullet.y += Math.sin(bullet.rotation) * bulletSpeed;

    if (
      bullet.x > 10000 ||
      bullet.x < -10000 ||
      bullet.y > 10000 ||
      bullet.y < -10000
    ) {
      delete bullets[bulletId];
    }
  }
}, 1);

setInterval(() => {
  for (const playerSocketId in players) {
    if (playerSocketId === "undefined") {
      delete players[playerSocketId];
    }
  }
  //console.log("Players", players);
  //console.log(Object.keys(bullets).length);
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
const port = 6969;
app.use(express.static("public"));
app.use("/pixi", express.static("./node_modules/pixi.js/dist/"));

server.listen(port, () => {
  console.log("SERVER STARTED");
});
