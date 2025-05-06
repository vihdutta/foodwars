const spawnPoints = [[250, 2100], [2650, 2100], [1450, 2100], [1450, 250], [1450, 3950]];
// spawn player based on the spawn points farthest from other players
export function bestSpawnPoint(players) {
    if (Object.keys(players).length === 0) {
        return spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    }
    let maxDistance = 0;
    let bestSpawnPoint = spawnPoints[0];
    spawnPoints.forEach((spawnPoint) => {
        let minDistance = Infinity;
        Object.values(players).forEach((player) => {
            const distance = Math.sqrt(Math.pow(player.x - spawnPoint[0], 2) + Math.pow(player.y - spawnPoint[1], 2));
            if (distance < minDistance) {
                minDistance = distance;
            }
        });
        if (minDistance > maxDistance) {
            maxDistance = minDistance;
            bestSpawnPoint = spawnPoint;
        }
    });
    return bestSpawnPoint;
}
//# sourceMappingURL=spawn.js.map