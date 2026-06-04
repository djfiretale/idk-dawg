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
    health: 100,
    maxHealth: 100
};

let score = 0;
let wave = 1;
let waveEnemiesDefeated = 0;
let waveEnemiesRequired = 5;
let enemies = [];
let projectiles = [];
let explosions = [];
let gameOver = false;
const keys = {};

// Weapon system
const weapons = {
    laser: {
        name: 'Laser',
        cooldown: 300,
        cooldownLeft: 0,
        damage: 1,
        projectileSpeed: 7,
        projectileCount: 1,
        description: 'Single fast projectile'
    },
    spread: {
        name: 'Spread Shot',
        cooldown: 500,
        cooldownLeft: 0,
        damage: 1,
        projectileSpeed: 6,
        projectileCount: 3,
        description: '3 projectiles at once'
    },
    aoe: {
        name: 'Aura',
        cooldown: 1000,
        cooldownLeft: 0,
        damage: 2,
        radius: 100,
        description: 'Damage around you'
    },
    explosive: {
        name: 'Missile',
        cooldown: 800,
        cooldownLeft: 0,
        damage: 3,
        explosionRadius: 80,
        projectileSpeed: 5,
        projectileCount: 1,
        description: 'Explosive projectiles'
    }
};

let activeWeapons = ['laser', 'spread'];

// Enemy class
class Enemy {
    constructor(x, y, health = 1) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.speed = 1.5 + (wave * 0.2);
        this.color = '#00FF00';
        this.health = health;
        this.maxHealth = health;
    }

    update() {
        if (gameOver) return;
        
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
        
        // Draw health bar above enemy
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x, this.y - 10, this.width, 5);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(this.x, this.y - 10, (this.health / this.maxHealth) * this.width, 5);
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
    constructor(x, y, dirX, dirY, isExplosive = false) {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 10;
        this.speed = isExplosive ? weapons.explosive.projectileSpeed : weapons.laser.projectileSpeed;
        this.color = isExplosive ? '#FF8800' : '#FFFF00';
        this.isExplosive = isExplosive;
        
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
        return this.x < -10 || this.x > canvas.width + 10 || 
               this.y < -10 || this.y > canvas.height + 10;
    }

    collidesWith(rect) {
        return this.x < rect.x + rect.width &&
               this.x + this.width > rect.x &&
               this.y < rect.y + rect.height &&
               this.y + this.height > rect.y;
    }
}

// Explosion class for visual effect
class Explosion {
    constructor(x, y, radius) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.life = 15;
        this.maxLife = 15;
    }

    draw() {
        ctx.fillStyle = `rgba(255, 165, 0, ${this.life / this.maxLife})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.life--;
    }
}

// Event listeners for keyboard
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// Shoot weapons
function shootWeapons() {
    if (gameOver || enemies.length === 0) return;
    
    activeWeapons.forEach(weaponName => {
        const weapon = weapons[weaponName];
        weapon.cooldownLeft--;
        
        if (weapon.cooldownLeft <= 0) {
            weapon.cooldownLeft = weapon.cooldown;
            
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
            
            if (weaponName === 'aoe') {
                // AOE damage around player
                enemies.forEach(enemy => {
                    const dx = enemy.x - player.x;
                    const dy = enemy.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < weapon.radius) {
                        enemy.health -= weapon.damage;
                    }
                });
                explosions.push(new Explosion(player.x, player.y, weapon.radius));
            } else if (weaponName === 'explosive') {
                // Explosive projectiles
                const angleOffset = Math.PI * 2 / weapon.projectileCount;
                const dx = nearest.x - player.x;
                const dy = nearest.y - player.y;
                const baseAngle = Math.atan2(dy, dx);
                
                for (let i = 0; i < weapon.projectileCount; i++) {
                    const angle = baseAngle + (i - weapon.projectileCount / 2) * angleOffset * 0.5;
                    projectiles.push(new Projectile(
                        player.x + player.width / 2,
                        player.y + player.height / 2,
                        Math.cos(angle),
                        Math.sin(angle),
                        true
                    ));
                }
            } else {
                // Regular projectiles
                const dx = nearest.x - player.x;
                const dy = nearest.y - player.y;
                const baseAngle = Math.atan2(dy, dx);
                const angleOffset = Math.PI * 2 / weapon.projectileCount;
                
                for (let i = 0; i < weapon.projectileCount; i++) {
                    const angle = baseAngle + (i - weapon.projectileCount / 2) * angleOffset * 0.3;
                    projectiles.push(new Projectile(
                        player.x + player.width / 2,
                        player.y + player.height / 2,
                        Math.cos(angle),
                        Math.sin(angle),
                        false
                    ));
                }
            }
        }
    });
}

// Update player position
function updatePlayer() {
    if (gameOver) return;
    
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
    if (gameOver) return;
    
    // Check if wave is complete
    if (waveEnemiesDefeated >= waveEnemiesRequired) {
        wave++;
        waveEnemiesDefeated = 0;
        waveEnemiesRequired = 5 + (wave * 2);
        
        // Upgrade a weapon
        const weaponToUpgrade = activeWeapons[Math.floor(Math.random() * activeWeapons.length)];
        const weapon = weapons[weaponToUpgrade];
        weapon.cooldown = Math.max(100, weapon.cooldown - 50);
        if (weapon.projectileCount !== undefined) {
            weapon.projectileCount++;
        }
    }
    
    // Spawn enemies to reach requirement
    if (enemies.length < waveEnemiesRequired) {
        const enemiesToSpawn = waveEnemiesRequired - enemies.length;
        
        for (let i = 0; i < enemiesToSpawn; i++) {
            let x, y;
            const side = Math.random();
            
            if (side < 0.25) {
                x = Math.random() * canvas.width;
                y = -30;
            } else if (side < 0.5) {
                x = Math.random() * canvas.width;
                y = canvas.height + 30;
            } else if (side < 0.75) {
                x = -30;
                y = Math.random() * canvas.height;
            } else {
                x = canvas.width + 30;
                y = Math.random() * canvas.height;
            }
            
            const health = 1 + Math.floor(wave / 3);
            enemies.push(new Enemy(x, y, health));
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
    ctx.fillRect(10, 10, (player.health / player.maxHealth) * 200, 20);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(10, 10, 200, 20);
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw
    if (!gameOver) {
        updatePlayer();
        spawnEnemies();
        shootWeapons();
    }
    
    // Update and draw enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        enemies[i].draw();
        
        // Check collision with player
        if (!gameOver && enemies[i].collidesWith(player)) {
            player.health -= 1;
            enemies.splice(i, 1);
        }
    }
    
    // Update and draw projectiles
    for (let i = projectiles.length - 1; i >= 0; i--) {
        projectiles[i].update();
        projectiles[i].draw();
        
        if (projectiles[i].isOffScreen()) {
            projectiles.splice(i, 1);
            continue;
        }
        
        // Check collision with enemies
        for (let j = enemies.length - 1; j >= 0; j--) {
            if (projectiles[i].collidesWith(enemies[j])) {
                enemies[j].health -= weapons.laser.damage;
                projectiles.splice(i, 1);
                
                if (projectiles[i]?.isExplosive) {
                    // Explosion damage
                    explosions.push(new Explosion(projectiles[i].x, projectiles[i].y, weapons.explosive.explosionRadius));
                    
                    for (let k = enemies.length - 1; k >= 0; k--) {
                        const dx = enemies[k].x - projectiles[i].x;
                        const dy = enemies[k].y - projectiles[i].y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < weapons.explosive.explosionRadius) {
                            enemies[k].health -= weapons.explosive.damage;
                        }
                    }
                }
                
                if (enemies[j].health <= 0) {
                    score += 10;
                    waveEnemiesDefeated++;
                    enemies.splice(j, 1);
                }
                break;
            }
        }
    }
    
    // Update and draw explosions
    for (let i = explosions.length - 1; i >= 0; i--) {
        explosions[i].update();
        explosions[i].draw();
        
        if (explosions[i].life <= 0) {
            explosions.splice(i, 1);
        }
    }
    
    // Draw player
    drawPlayer();
    
    // Draw UI
    ctx.fillStyle = '#000000';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, 220);
    ctx.fillText('Wave: ' + wave, 10, 250);
    ctx.fillText('Enemies: ' + enemies.length + '/' + waveEnemiesRequired, 10, 280);
    ctx.fillText('Active Weapons: ' + activeWeapons.map(w => weapons[w].name).join(', '), 10, 310);
    
    // Game over check
    if (player.health <= 0) {
        gameOver = true;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 30);
        ctx.font = '24px Arial';
        ctx.fillText('Final Score: ' + score, canvas.width / 2, canvas.height / 2 + 30);
        ctx.fillText('Wave Reached: ' + wave, canvas.width / 2, canvas.height / 2 + 70);
        ctx.font = '16px Arial';
        ctx.fillText('Refresh the page to play again', canvas.width / 2, canvas.height / 2 + 110);
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
