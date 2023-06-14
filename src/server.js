const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const server = createServer(app);
const io = new Server(server);

let players = {};
let bullets = {};
const bulletSpeed = 15;
const playerLength = 70;

// io connections
io.on('connection', (socket) => { 
    console.log("SERVER: socket", socket.id, "connected");
    io.emit("notification", socket.id + " connected");

    // updates the player
    socket.on("serverUpdateSelf", (playerData) => {
        if (players[playerData.id]) {
            if (players[playerData.id].health <= 0) {
                return;
            }            
        }


        let speed = 7;
        if (playerData.keyboard.shift) {
            speed += 5;
        }

        if (playerData.keyboard.w) {
            playerData.y -= speed;
        }
        if (playerData.keyboard.a) {
            playerData.x -= speed;
        }
        if (playerData.keyboard.s) {
            playerData.y += speed;
        }
        if (playerData.keyboard.d) {
            playerData.x += speed;
        }

        const playerBounds = {
            x: playerData.x,
            y: playerData.y,
            width: playerLength,
            height: playerLength
          };

        Object.entries(bullets).forEach(([key, bullet]) => {
            if (bullet.parent !== socket.id) {
                if (checkCollision(bullet, playerBounds)) {
                    playerData.health -= 10;
                    delete bullets[key];

                    // ## Fire clientUpdateAllBullets?
                }
            }
        });
        
        socket.emit("clientUpdateSelf", playerData);
        players[playerData.id] = playerData;
        
        if (playerData.health <= 0) {
            console.log(socket.id + " died");
            io.emit("notification", socket.id + " died");
            socket.disconnect();
            
            // ## Fire clientUpdateAllEnemies
        }
        
    });
    
    socket.on("serverUpdateNewBullet", (bulletData) => {
        if (players[socket.id] && players[socket.id].hasOwnProperty('health') && players[socket.id].health <= 0) {
            return;
        }

        bullets[bulletData.id] = bulletData;
        io.emit("clientUpdateNewBullet", bulletData);
        // ## Fire clientUpdateAllBullets?
        
    });

    socket.on("disconnect", () => {
        console.log("SERVER: socket", socket.id, "disconnected");
        io.emit("notification", socket.id + " disconnected");
        delete players[socket.id]; 

        // ## Fire clientUpdateAllEnemies with the new player object.
    });
});

// ## Maybe bind this interval to an event. For example, make this trigger on player death or disconnect
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

        if (bullet.x > 10000 || bullet.x < -10000 || bullet.y > 10000 || bullet.y < -10000 ) {
            delete bullets[bulletId];
        }
    }
}, 1);

// ## Maybe use onunload/onbeforeunload on the client to notify the server then let the server fire the clientUpdateAllEnemies event.
setInterval(() => {
    for (const playerSocketId in players) {
        if (playerSocketId === "undefined") {
            delete players[playerSocketId];
        }
    }
    //console.log("Players", players);
    // console.log(Object.keys(bullets).length);
}, 1500);

// HELPER FUNCTIONS
function checkCollision(aBox, bBox) {
    return aBox.x < bBox.x + bBox.width &&
           aBox.x + aBox.width > bBox.x &&
           aBox.y < bBox.y + bBox.height &&
           aBox.y + aBox.height > bBox.y;
  }

// final setup
const port = 6969;
app.use(express.static('public'));
app.use('/pixi', express.static('./node_modules/pixi.js/dist/'));
server.listen(port);
console.log("SERVER STARTED");
