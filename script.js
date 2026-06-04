// Get the canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game variables
const player = {
    x: canvas.width / 2 - 25,
    y: canvas.height / 2 - 25,
    width: 50,
    height: 50,
    speed: 5,
    color: '#FF0000',
    health: 100
};

let score = 0;
let wave = 1;
let enemies = [];
let projectiles = [];
const keys = {};

// Enemy class
class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 2;
        this.color = '#00FF00';
        this.health = 1;
    }

    update() {
        // Move towards player
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    collidesWith(rect) {
        return this.x < rect.x + rect.width &&
               this.x + this.width > rect.x &&
               this.y < rect.y + rect.height &&
               this.y + this.height > rect.y;
    }
}

// Projectile class
class Projectile {
    constructor(x, y, dirX, dirY) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 10;
        this.speed = 7;
        this.color = '#FFFF00';
        
        // Normalize direction
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        this.dirX = dirX / length;
        this.dirY = dirY / length;
    }

    update() {
        this.x += this.dirX * this.speed;
        this.y += this.dirY * this.speed;
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    isOffScreen() {
        return this.x < 0 || this.x > canvas.width || 
               this.y < 0 || this.y > canvas.height;
    }

    collidesWith(rect) {
        return this.x < rect.x + rect.width &&
               this.x + this.width > rect.x &&
               this.y < rect.y + rect.height &&
               this.y + this.height > rect.y;
    }
}

// Event listeners for keyboard
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Auto-shoot towards nearest enemy
function autoShoot() {
    if (enemies.length === 0) return;
    
    // Find nearest enemy
    let nearest = enemies[0];
    let minDistance = Infinity;
    
    for (let enemy of enemies) {
        const dx = enemy.x - player.x;
        const dy = enemy.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < minDistance) {
            minDistance = distance;
            nearest = enemy;
        }
    }
    
    // Shoot at nearest enemy
    const dx = nearest.x - player.x;
    const dy = nearest.y - player.y;
    projectiles.push(new Projectile(player.x + player.width/2, player.y + player.height/2, dx, dy));
}

// Update player position
function updatePlayer() {
    if (keys['ArrowUp'] && player.y > 0) {
        player.y -= player.speed;
    }
    if (keys['ArrowDown'] && player.y + player.height < canvas.height) {
        player.y += player.speed;
    }
    if (keys['ArrowLeft'] && player.x > 0) {
        player.x -= player.speed;
    }
    if (keys['ArrowRight'] && player.x + player.width < canvas.width) {
        player.x += player.speed;
    }
}

// Spawn enemies
function spawnEnemies() {
    // Spawn more enemies as waves progress
    const enemiesToSpawn = Math.floor(wave / 2) + 2;
    
    if (enemies.length < enemiesToSpawn) {
        for (let i = enemies.length; i < enemiesToSpawn; i++) {
            let x, y;
            const side = Math.random();
            
            if (side < 0.25) {
                // Top
                x = Math.random() * canvas.width;
                y = -30;
            } else if (side < 0.5) {
                // Bottom
                x = Math.random() * canvas.width;
                y = canvas.height + 30;
            } else if (side < 0.75) {
                // Left
                x = -30;
                y = Math.random() * canvas.height;
            } else {
                // Right
                x = canvas.width + 30;
                y = Math.random() * canvas.height;
            }
            
            enemies.push(new Enemy(x, y));
        }
    }
}

// Draw the player
function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Draw health bar
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(10, 10, 200, 20);
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(10, 10, (player.health / 100) * 200, 20);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(10, 10, 200, 20);
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw
    updatePlayer();
    spawnEnemies();
    autoShoot();
    
    // Update and draw enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        enemies[i].draw();
        
        // Check collision with player
        if (enemies[i].collidesWith(player)) {
            player.health -= 0.5;
            enemies.splice(i, 1);
        }
    }
    
    // Update and draw projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update();
        projectiles[i].draw();
        
        // Remove if off screen
        if (projectiles[i].isOffScreen()) {
            projectiles.splice(i, 1);
            continue;
        }
        
        // Check collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (projectiles[i].collidesWith(enemies[j])) {
                enemies[j].health--;
                projectiles.splice(i, 1);
                
                if (enemies[j].health <= 0) {
                    score += 10;
                    enemies.splice(j, 1);
                    
                    // Increase wave every 5 kills
                    if (score % 50 === 0) {
                        wave++;
                    }
                }
                break;
            }
        }
    }
    
    // Draw player
    drawPlayer();
    
    // Draw UI
    ctx.fillStyle = '#000000';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, 220);
    ctx.fillText('Wave: ' + wave, 10, 250);
    ctx.fillText('Enemies: ' + enemies.length, 10, 280);
    
    // Game over check
    if (player.health <= 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        ctx.font = '24px Arial';
        ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2 + 50);
        ctx.textAlign = 'left';
        return;
    }
}

// Game loop
function gameLoop() {
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();
