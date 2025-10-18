class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    preload() {
        // Create character sprite programmatically
        this.createCharacterSprite();
    }

    createCharacterSprite() {
        // Create a graphics object to draw the character
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        
        // Character dimensions
        const headSize = 8;
        const bodyWidth = 10;
        const bodyHeight = 12;
        const armWidth = 3;
        const armHeight = 8;
        const legWidth = 4;
        const legHeight = 10;
        
        // Draw character (black squares)
        graphics.fillStyle(0x000000, 1);
        
        // Head
        graphics.fillRect(6, 0, headSize, headSize);
        
        // Body
        graphics.fillRect(5, 8, bodyWidth, bodyHeight);
        
        // Arms (left and right)
        graphics.fillRect(1, 10, armWidth, armHeight); // Left arm
        graphics.fillRect(16, 10, armWidth, armHeight); // Right arm
        
        // Legs (left and right)
        graphics.fillRect(6, 20, legWidth, legHeight); // Left leg
        graphics.fillRect(10, 20, legWidth, legHeight); // Right leg
        
        // Generate texture from graphics
        graphics.generateTexture('player', 20, 30);
        graphics.destroy();
    }

    create() {
        // Set world bounds
        this.physics.world.setBounds(0, 0, 2400, 600);
        
        // Create custom map with platforms
        this.createMap();
        
        // Create player
        this.player = this.physics.add.sprite(100, 450, 'player');
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(false);
        this.player.body.setGravityY(800);
        
        // Add collision between player and platforms
        this.physics.add.collider(this.player, this.platforms);
        
        // Camera follows player
        this.cameras.main.setBounds(0, 0, 2400, 600);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
        
        // Keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();
        
        // Mobile touch controls
        this.createTouchControls();
        
        // Touch state
        this.touchLeft = false;
        this.touchRight = false;
        this.touchJump = false;
    }

    createMap() {
        this.platforms = this.physics.add.staticGroup();
        
        // Ground platforms
        this.createPlatform(0, 580, 400, 20, 0x4a4a4a);
        this.createPlatform(500, 580, 300, 20, 0x4a4a4a);
        this.createPlatform(900, 580, 400, 20, 0x4a4a4a);
        this.createPlatform(1400, 580, 500, 20, 0x4a4a4a);
        this.createPlatform(2000, 580, 400, 20, 0x4a4a4a);
        
        // Elevated platforms
        this.createPlatform(300, 480, 150, 15, 0x6b6b6b);
        this.createPlatform(600, 400, 120, 15, 0x6b6b6b);
        this.createPlatform(800, 320, 150, 15, 0x6b6b6b);
        this.createPlatform(1100, 450, 180, 15, 0x6b6b6b);
        this.createPlatform(1350, 380, 140, 15, 0x6b6b6b);
        this.createPlatform(1600, 300, 160, 15, 0x6b6b6b);
        this.createPlatform(1850, 420, 130, 15, 0x6b6b6b);
        this.createPlatform(2100, 350, 150, 15, 0x6b6b6b);
        
        // High platforms
        this.createPlatform(450, 250, 100, 15, 0x8b8b8b);
        this.createPlatform(950, 200, 120, 15, 0x8b8b8b);
        this.createPlatform(1500, 180, 110, 15, 0x8b8b8b);
        this.createPlatform(2000, 220, 130, 15, 0x8b8b8b);
    }

    createPlatform(x, y, width, height, color) {
        const graphics = this.add.graphics();
        graphics.fillStyle(color, 1);
        graphics.fillRect(0, 0, width, height);
        graphics.generateTexture('platform_' + x + '_' + y, width, height);
        graphics.destroy();
        
        const platform = this.platforms.create(x + width / 2, y + height / 2, 'platform_' + x + '_' + y);
        platform.setOrigin(0.5, 0.5);
        platform.refreshBody();
    }

    createTouchControls() {
        // Create joystick base (the outer circle)
        const joystickRadius = 60;
        const joystickX = 120;
        const joystickY = this.cameras.main.height - 120;
        
        // Joystick base (outer circle)
        this.joystickBase = this.add.circle(joystickX, joystickY, joystickRadius, 0x000000, 0.2);
        this.joystickBase.setScrollFactor(0);
        this.joystickBase.setInteractive();
        
        // Joystick thumb (inner circle)
        this.joystickThumb = this.add.circle(joystickX, joystickY, 30, 0x000000, 0.5);
        this.joystickThumb.setScrollFactor(0);
        
        // Store joystick position and active state
        this.joystick = {
            baseX: joystickX,
            baseY: joystickY,
            thumb: this.joystickThumb,
            isActive: false,
            radius: joystickRadius
        };
        
        // Touch events for joystick
        this.input.on('pointerdown', (pointer) => {
            if (pointer.x < this.cameras.main.width / 2) { // Only activate on left side of screen
                this.joystick.isActive = true;
                this.updateJoystick(pointer);
            }
        });
        
        this.input.on('pointermove', (pointer) => {
            if (this.joystick.isActive) {
                this.updateJoystick(pointer);
            }
        });
        
        this.input.on('pointerup', () => {
            this.resetJoystick();
        });
        
        // Jump button (kept from original)
        const buttonAlpha = 0.3;
        const buttonSize = 80;
        this.jumpButton = this.add.circle(this.cameras.main.width - 80, this.cameras.main.height - 80, buttonSize / 2, 0xff0000, buttonAlpha);
        this.jumpButton.setScrollFactor(0);
        this.jumpButton.setInteractive();
        
        this.add.text(this.cameras.main.width - 80, this.cameras.main.height - 80, '↑', {
            fontSize: '40px',
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0);
        
        this.jumpButton.on('pointerdown', () => { this.touchJump = true; });
        this.jumpButton.on('pointerup', () => { this.touchJump = false; });
        this.jumpButton.on('pointerout', () => { this.touchJump = false; });
    }
    
    updateJoystick(pointer) {
        // Calculate distance from joystick base to pointer
        const dx = pointer.x - this.joystick.baseX;
        const dy = pointer.y - this.joystick.baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Limit thumb to joystick radius
        const angle = Math.atan2(dy, dx);
        const limitedDistance = Math.min(distance, this.joystick.radius);
        
        // Update thumb position
        const thumbX = this.joystick.baseX + Math.cos(angle) * limitedDistance;
        const thumbY = this.joystick.baseY + Math.sin(angle) * limitedDistance;
        this.joystick.thumb.setPosition(thumbX, thumbY);
        
        // Calculate horizontal movement (-1 to 1)
        const moveX = dx / this.joystick.radius;
        
        // Set movement flags based on joystick position
        this.touchLeft = moveX < -0.2; // Slight dead zone
        this.touchRight = moveX > 0.2;  // Slight dead zone
    }
    
    resetJoystick() {
        this.joystick.isActive = false;
        this.joystick.thumb.setPosition(this.joystick.baseX, this.joystick.baseY);
        this.touchLeft = false;
        this.touchRight = false;
    }

    update() {
        // Horizontal movement
        if (this.cursors.left.isDown || this.touchLeft) {
            this.player.setVelocityX(-200);
        } else if (this.cursors.right.isDown || this.touchRight) {
            this.player.setVelocityX(200);
        } else {
            this.player.setVelocityX(0);
        }
        
        // Jump
        if ((this.cursors.up.isDown || this.touchJump) && this.player.body.touching.down) {
            this.player.setVelocityY(-400);
        }
        
        // Reset if player falls off the map
        if (this.player.y > 650) {
            this.player.setPosition(100, 450);
            this.player.setVelocity(0, 0);
        }
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#87CEEB',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [GameScene],
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);
