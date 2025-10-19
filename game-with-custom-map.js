class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: "GameScene" });
    this.customMapData = null;
    this.currentLevel = 1;
  }

  init(data) {
    // Get level data passed from game config or URL
    this.customMapData = data.levelData || null;
    this.currentLevel = data.level || 1;
    console.log(`Initializing Level ${this.currentLevel}`);
  }

  preload() {
    // Create character sprite programmatically
    this.createCharacterSprite();

    // If no level data was passed, try localStorage (for backwards compatibility)
    if (!this.customMapData) {
      const savedMap = localStorage.getItem("customMap");
      if (savedMap) {
        try {
          this.customMapData = JSON.parse(savedMap);
        } catch (e) {
          console.error("Error loading custom map:", e);
        }
      }
    }
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
    graphics.generateTexture("player", 20, 30);
    graphics.destroy();
  }

  create() {
    // Set world bounds
    const worldWidth = this.customMapData?.worldWidth || 2400;
    const worldHeight = this.customMapData?.worldHeight || 600;
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    // Initialize groups
    this.platforms = this.physics.add.staticGroup();
    this.deadlyObjects = this.physics.add.group(); // Changed to dynamic group
    this.movingPlatforms = this.physics.add.group();
    this.spikes = this.physics.add.group(); // Changed to dynamic group
    this.traps = this.physics.add.group(); // Changed to dynamic group
    this.ladders = this.physics.add.staticGroup();
    this.checkpoints = this.physics.add.group(); // Changed to dynamic group for overlap detection
    
    // Store initial states for moving platforms that reset on death
    this.movingPlatformInitialStates = [];

    // Start and end positions
    this.startPosition = null;
    this.endFlag = null;
    this.currentCheckpoint = null; // Track last activated checkpoint

    // Create map
    if (this.customMapData) {
      this.loadCustomMap();
    } else {
      this.createDefaultMap();
    }

    // Create player at start position or default
    const startX = this.startPosition ? this.startPosition.x : 100;
    const startY = this.startPosition ? this.startPosition.y : 450;
    this.player = this.physics.add.sprite(startX, startY, "player");
    this.player.setBounce(0.1);
    this.player.setCollideWorldBounds(false);
    this.player.body.setGravityY(1000);

    // Set up player physics body for better collision detection
    this.player.body.setSize(14, 30); // Adjust size to match player sprite
    this.player.body.setOffset(3, 0); // Center the body
    this.player.body.active = true; // Explicitly set body to active
    
    console.log(
      `Player created at (${this.player.x}, ${this.player.y}). Body active: ${this.player.body ? this.player.body.active : "N/A"}, enable: ${this.player.body ? this.player.body.enable : "N/A"}`,
    );

    // Add collisions
    this.physics.add.collider(this.player, this.platforms, (player, platform) => {
      // Check if platform is hot (deadly)
      if (platform.getData("isHot")) {
        this.playerDeath("Hot platform");
      }
    });
    this.physics.add.collider(
      this.player,
      this.movingPlatforms,
      this.handlePlatformCollision,
      null,
      this,
    );

    // Add end flag overlap if it exists
    if (this.endFlagSprite) {
      this.physics.add.overlap(
        this.player,
        this.endFlagSprite,
        this.reachEndFlag,
        null,
        this,
      );
    }

    // Add checkpoint overlap
    this.physics.add.overlap(
      this.player,
      this.checkpoints,
      this.activateCheckpoint,
      null,
      this,
    );

    // Add deadly object overlaps with custom collision check for rotation
    this.physics.add.overlap(
      this.player,
      this.deadlyObjects,
      (player, deadlyObject) => {
        console.log("Player overlapped with Deadly Object!"); // Debug log
        this.playerDeath(deadlyObject);
      },
      (player, deadlyObject) => {
        // Custom process callback for rotated collision detection
        return this.checkRotatedCollision(player, deadlyObject);
      },
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.spikes,
      (player, spikeObject) => {
        console.log("Player overlapped with Spikes!"); // Debug log
        this.playerDeath(spikeObject);
      },
      (player, spikeObject) => {
        return this.checkRotatedCollision(player, spikeObject);
      },
      this,
    );
    this.physics.add.overlap(
      this.player,
      this.traps,
      (player, trapObject) => {
        console.log("Player overlapped with Trap!"); // Debug log
        this.playerDeath(trapObject);
      },
      (player, trapObject) => {
        return this.checkRotatedCollision(player, trapObject);
      },
      this,
    );

    // Camera follows player - remove vertical bounds restriction for better following
    this.cameras.main.setBounds(0, -worldHeight, worldWidth, worldHeight * 3);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2.5);

    // Set camera deadzone to allow player to move before camera follows
    const cameraWidth = this.cameras.main.width;
    const cameraHeight = this.cameras.main.height;
    this.cameras.main.setDeadzone(cameraWidth * 0.2, cameraHeight * 0.2);
    
    // Create a separate fixed UI camera (no zoom, no scroll)
    this.uiCamera = this.cameras.add(0, 0, this.cameras.main.width, this.cameras.main.height);
    this.uiCamera.setScroll(0, 0);
    this.uiCamera.setZoom(1); // No zoom for UI
    
    // Make UI camera ignore all game objects (it will only render UI elements)
    this.uiCamera.ignore([
      this.platforms,
      this.deadlyObjects,
      this.movingPlatforms,
      this.spikes,
      this.traps,
      this.ladders,
      this.checkpoints,
      this.player
    ]);
    
    // Store reference to endFlagSprite if it exists
    if (this.endFlagSprite) {
      this.uiCamera.ignore(this.endFlagSprite);
    }

    // Keyboard controls
    this.cursors = this.input.keyboard.createCursorKeys();
    
    // Pause functionality
    this.isPaused = false;
    this.pauseMenu = null;
    this.input.keyboard.on('keydown-ESC', () => {
      this.togglePause();
    });

    // Mobile touch controls
    this.createTouchControls();

    // Touch state
    this.touchLeft = false;
    this.touchRight = false;
    this.touchJump = false;
    
    // Ladder state
    this.isOnLadder = false;
    this.currentLadder = null;

    // Add ladder overlap detection
    this.physics.add.overlap(
      this.player,
      this.ladders,
      this.handleLadderOverlap,
      null,
      this,
    );
    
    // Spawn point (use start position if available)
    this.spawnPoint = {
      x: this.startPosition ? this.startPosition.x : 100,
      y: this.startPosition ? this.startPosition.y : 450,
    };

    // Game state
    this.lives = 10;
    this.maxLives = 10;
    this.levelComplete = false;
    this.gameOver = false;
    
    // Create UI
    this.createUI();
  }

  loadCustomMap() {
    // First pass: Create all non-attached objects
    this.customMapData.objects.forEach((obj) => {
      // Skip attached objects in first pass
      if (obj.parentId) {
        return;
      }

      // Get rotation from object or default to 0
      const rotation = obj.rotation || 0;

      switch (obj.type) {
        case "platform":
          this.createPlatform(obj.x, obj.y, obj.width, obj.height, obj.color, obj);
          break;
        case "moving-platform":
          this.createMovingPlatform(obj);
          break;
        case "deadly-floor":
          this.createDeadlyFloor(obj.x, obj.y, obj.width, obj.height, rotation);
          break;
        case "spike":
          // Use new spike properties
          const spikeCount = obj.spikeCount || 5;
          const spikeSize = obj.spikeSize || 30;
          this.createSpikesWithCount(
            obj.x,
            obj.y,
            spikeCount,
            spikeSize,
            obj.color,
            rotation,
          );
          break;
        case "trap":
          this.createTrap(obj.x, obj.y, obj.width, obj.height, rotation);
          break;
        case "ladder":
          this.createLadder(obj.x, obj.y, obj.width, obj.height, obj.color);
          break;
        case "start-position":
          this.startPosition = {
            x: obj.x + obj.width / 2,
            y: obj.y + obj.height / 2,
          };
          this.createStartMarker(obj.x, obj.y, obj.width, obj.height);
          break;
        case "end-flag":
          this.endFlag = {
            x: obj.x + obj.width / 2,
            y: obj.y + obj.height / 2,
            width: obj.width,
            height: obj.height,
          };
          this.createEndFlag(obj.x, obj.y, obj.width, obj.height);
          break;
        case "checkpoint":
          this.createCheckpoint(obj.x, obj.y, obj.width, obj.height, obj.id);
          break;
      }
    });
    
    // Second pass: Create attached objects
    this.customMapData.objects.forEach((obj) => {
      if (obj.parentId) {
        // Find the parent platform
        const parentPlatform = this.movingPlatforms.getChildren().find(
          (platform) => platform.getData("id") === obj.parentId
        );
        
        if (parentPlatform) {
          this.createAttachedObject(obj, parentPlatform);
        } else {
          console.warn(`Parent platform not found for attached object:`, obj);
        }
      }
    });
  }

  createDefaultMap() {
    // Ground platforms
    this.createPlatform(0, 580, 400, 20, "#4a4a4a");
    this.createPlatform(500, 580, 300, 20, "#4a4a4a");
    this.createPlatform(900, 580, 400, 20, "#4a4a4a");
    this.createPlatform(1400, 580, 500, 20, "#4a4a4a");
    this.createPlatform(2000, 580, 400, 20, "#4a4a4a");

    // Elevated platforms
    this.createPlatform(300, 480, 150, 15, "#6b6b6b");
    this.createPlatform(600, 400, 120, 15, "#6b6b6b");
    this.createPlatform(800, 320, 150, 15, "#6b6b6b");

    // Add some deadly floors
    this.createDeadlyFloor(420, 580, 60, 20);
    this.createDeadlyFloor(1320, 580, 60, 20);

    // Add spikes
    this.createSpikes(750, 560, 100, 20);
  }

  createPlatform(x, y, width, height, color, objData = null) {
    const colorHex =
      typeof color === "string" ? parseInt(color.replace("#", "0x")) : color;
    const graphics = this.add.graphics();
    graphics.fillStyle(colorHex, 1);
    graphics.fillRect(0, 0, width, height);
    const key = "platform_" + x + "_" + y + "_" + Date.now();
    graphics.generateTexture(key, width, height);
    graphics.destroy();

    const platform = this.platforms.create(x + width / 2, y + height / 2, key);
    platform.setOrigin(0.5, 0.5);
    platform.refreshBody();
    
    // Add trigger effect properties if present
    if (objData && objData.hasTriggerEffect) {
      platform.setData("hasTriggerEffect", true);
      platform.setData("effectTriggerDistance", objData.effectTriggerDistance || 200);
      platform.setData("effectType", objData.effectType || "collapse");
      platform.setData("effectTimeout", objData.effectTimeout || 3);
      platform.setData("effectTriggered", false);
      platform.setData("effectActive", false);
      platform.setData("originalColor", colorHex);
      platform.setData("originalKey", key);
      platform.setData("width", width);
      platform.setData("height", height);
      
      console.log(`Platform with trigger effect created: ${objData.effectType}`);
    }
  }

  createMovingPlatform(obj) {
    console.log("Creating moving platform with data:", obj);

    const colorHex =
      typeof obj.color === "string"
        ? parseInt(obj.color.replace("#", "0x"))
        : obj.color;

    // Calculate movement direction based on rotation
    const rotationRad = ((obj.rotation || 0) * Math.PI) / 180;
    const moveDirX = Math.cos(rotationRad);
    const moveDirY = Math.sin(rotationRad);

    // Calculate start and end positions
    const startX = obj.x + obj.width / 2;
    const startY = obj.y + obj.height / 2;
    const moveDistance = obj.moveDistance || 200;
    const moveSpeed = obj.moveSpeed || 2;

    // Calculate target position
    const targetX = startX + moveDirX * moveDistance;
    const targetY = startY + moveDirY * moveDistance;

    // Create platform
    const graphics = this.add.graphics();
    graphics.fillStyle(colorHex, 1);
    graphics.fillRect(0, 0, obj.width, obj.height);
    const textureKey =
      "moving_platform_" + obj.x + "_" + obj.y + "_" + Date.now();
    graphics.generateTexture(textureKey, obj.width, obj.height);
    graphics.destroy();

    const platform = this.physics.add.sprite(startX, startY, textureKey);
    platform.setOrigin(0.5, 0.5);
    platform.body.setAllowGravity(false);
    platform.body.setImmovable(true);
    platform.body.moves = true;

    // Calculate initial velocity
    const initialVelocityX = moveDirX * moveSpeed * 60; // Convert to pixels per second
    const initialVelocityY = moveDirY * moveSpeed * 60;
    
    // Initialize velocity based on rotation and trigger requirement
    // If requires trigger, start with zero velocity
    if (obj.requireTrigger) {
      platform.body.velocity.x = 0;
      platform.body.velocity.y = 0;
    } else {
      platform.body.velocity.x = initialVelocityX;
      platform.body.velocity.y = initialVelocityY;
      
      // Ensure the velocity is properly rotated with the platform
      if (obj.rotation) {
        const angle = obj.rotation * (Math.PI / 180);
        const speed = Math.sqrt(
          platform.body.velocity.x * platform.body.velocity.x +
            platform.body.velocity.y * platform.body.velocity.y,
        );
        platform.body.velocity.x = Math.cos(angle) * speed * Math.sign(moveDirX);
        platform.body.velocity.y = Math.sin(angle) * speed * Math.sign(moveDirY);
      }
    }

    // Store movement data
    platform.setData("id", obj.id);
    platform.setData("startX", startX);
    platform.setData("startY", startY);
    platform.setData("targetX", targetX);
    platform.setData("targetY", targetY);
    platform.setData("moveDistance", moveDistance);
    platform.setData("moveSpeed", moveSpeed);
    platform.setData("moveMode", obj.moveMode || "loop");
    platform.setData("requireTrigger", obj.requireTrigger || false);
    platform.setData("triggerDistance", obj.triggerDistance || 200);
    platform.setData("triggered", false);
    platform.setData("direction", 1);
    platform.setData("previousX", platform.x);
    platform.setData("previousY", platform.y);
    platform.setData("rotation", obj.rotation || 0);
    platform.setData("moveAngle", rotationRad);
    platform.setData("moveDirX", moveDirX);
    platform.setData("moveDirY", moveDirY);
    platform.setData("attachedObjects", []);
    platform.setData("resetOnDeath", obj.resetOnDeath || false);
    platform.setPushable(false); // Player can't push platform
    
    // Store initial state globally if resetOnDeath is enabled
    if (obj.resetOnDeath) {
      // Store the initial velocity (0 if requires trigger, otherwise normal velocity)
      const storedVelocityX = obj.requireTrigger ? 0 : initialVelocityX;
      const storedVelocityY = obj.requireTrigger ? 0 : initialVelocityY;
      
      this.movingPlatformInitialStates.push({
        platform: platform,
        startX: startX,
        startY: startY,
        triggered: false,
        direction: 1,
        velocityX: storedVelocityX,
        velocityY: storedVelocityY,
        requireTrigger: obj.requireTrigger || false
      });
    }

    console.log(
      `Platform created with rotation: ${obj.rotation}°, direction: (${moveDirX.toFixed(2)}, ${moveDirY.toFixed(2)})`,
    );

    // Apply rotation to the platform
    if (obj.rotation) {
      // Set the visual rotation
      platform.setAngle(obj.rotation);

      // Update the physics body rotation
      platform.body.rotation = obj.rotation * (Math.PI / 180);

      // For non-zero rotations, we need to adjust the body offset
      const normalizedRotation = Phaser.Math.Angle.Normalize(
        obj.rotation * (Math.PI / 180),
      );

      // Calculate the rotated width and height
      const cos = Math.abs(Math.cos(normalizedRotation));
      const sin = Math.abs(Math.sin(normalizedRotation));
      const rotatedWidth = obj.width * cos + obj.height * sin;
      const rotatedHeight = obj.width * sin + obj.height * cos;

      // Update the body size to account for rotation
      platform.body.setSize(rotatedWidth, rotatedHeight);

      // Center the body
      platform.body.setOffset(
        (platform.width - rotatedWidth) / 2,
        (platform.height - rotatedHeight) / 2,
      );
    } else {
      // No rotation, just set the size normally
      platform.body.setSize(obj.width, obj.height);
    }

    this.movingPlatforms.add(platform);
  }

  createDeadlyFloor(x, y, width, height, rotation = 0) {
    // Create a clean deadly floor with solid red color
    const graphics = this.add.graphics();
    
    // Use solid crimson red color
    graphics.fillStyle(0xDC143C, 1);
    graphics.fillRect(0, 0, width, height);

    // Generate a texture from the graphics
    const textureKey = "deadly_floor_" + x + "_" + y + "_" + Date.now();
    graphics.generateTexture(textureKey, width, height);
    graphics.destroy();

    // Create a sprite with the generated texture
    const floor = this.physics.add.sprite(
      x + width / 2,
      y + height / 2,
      textureKey,
    );
    floor.setOrigin(0.5, 0.5);
    floor.setAngle(rotation);

    // Set up physics body
    floor.body.setImmovable(true);
    floor.body.allowGravity = false;
    floor.body.moves = false;

    // Adjust collision box for rotation
    if (rotation !== 0) {
      const rad = (rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const rotatedWidth = width * cos + height * sin;
      const rotatedHeight = width * sin + height * cos;
      floor.body.setSize(rotatedWidth, rotatedHeight);
    }

    // Add to the deadly objects group
    this.deadlyObjects.add(floor);
    floor.body.active = true; // Explicitly set body to active
    console.log(
      `Deadly Floor created at (${x}, ${y}), added to deadlyObjects group. Body active: ${floor.body ? floor.body.active : "N/A"}, enable: ${floor.body ? floor.body.enable : "N/A"}`,
    );

    return floor;
  }

  createSpikes(x, y, width, height, rotation = 0) {
    // For spikes, we'll use the count and size from the object properties
    const spikeCount = Math.max(1, Math.floor(width / 30)); // Adjust based on width
    const spikeSize = 30; // Default value, will be overridden if provided

    // Create a container to hold all spikes
    const container = this.add.container(x, y);

    // Calculate total width based on spike count and size
    const totalWidth = spikeCount * spikeSize;

    // Create a graphics object for the spikes
    const graphics = this.add.graphics();
    graphics.fillStyle(0x8b4513, 1);

    // Draw each spike
    for (let i = 0; i < spikeCount; i++) {
      const sx = i * spikeSize - totalWidth / 2 + spikeSize / 2;
      graphics.beginPath();
      graphics.moveTo(sx, spikeSize / 2);
      graphics.lineTo(sx - spikeSize / 2, -spikeSize / 2);
      graphics.lineTo(sx + spikeSize / 2, -spikeSize / 2);
      graphics.closePath();
      graphics.fillPath();
    }

    // Add graphics to container
    container.add(graphics);

    // Set the rotation of the container
    container.rotation = rotation * (Math.PI / 180);

    // Calculate the rotated dimensions
    const rad = rotation * (Math.PI / 180);
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const rotatedWidth = totalWidth * cos + spikeSize * sin;
    const rotatedHeight = totalWidth * sin + spikeSize * cos;

    // Create a physics body for the container
    this.physics.world.enable(container);
    container.body.setSize(rotatedWidth, rotatedHeight);
    container.body.setOffset(-rotatedWidth / 2, -rotatedHeight / 2);
    container.body.setImmovable(true);
    container.body.allowGravity = false;

    // Add to the spikes group
    this.spikes.add(container);
    container.body.active = true; // Explicitly set body to active
    console.log(
      `Spikes created at (${x}, ${y}), added to spikes group. Body active: ${container.body ? container.body.active : "N/A"}, enable: ${container.body ? container.body.enable : "N/A"}`,
    );

    // Store the original dimensions for reference
    container.width = totalWidth;
    container.height = spikeSize;

    return container;
  }

  createSpikesWithCount(x, y, spikeCount, spikeSize, color, rotation = 0) {
    // Create clean, professional spikes
    const graphics = this.add.graphics();
    const totalWidth = spikeCount * spikeSize;

    // Set the color for the spikes
    const colorValue =
      typeof color === "string"
        ? parseInt(color.replace("#", "0x"))
        : color || 0x505050;

    // Draw each spike with clean triangular shape
    graphics.fillStyle(colorValue, 1);
    for (let i = 0; i < spikeCount; i++) {
      const spikeX = i * spikeSize;
      
      graphics.beginPath();
      graphics.moveTo(spikeX, spikeSize);
      graphics.lineTo(spikeX + spikeSize / 2, 0);
      graphics.lineTo(spikeX + spikeSize, spikeSize);
      graphics.closePath();
      graphics.fillPath();
    }

    // Generate a texture from the graphics
    const textureKey = "spikes_" + x + "_" + y + "_" + Date.now();
    graphics.generateTexture(textureKey, totalWidth, spikeSize);
    graphics.destroy();

    // Create a sprite with the generated texture
    // For rotation, we need to position at center and rotate around center
    let spriteX, spriteY;
    if (rotation !== 0) {
      // When rotated, position at center for proper rotation
      spriteX = x + totalWidth / 2;
      spriteY = y + spikeSize / 2;
      const spikes = this.physics.add.sprite(spriteX, spriteY, textureKey);
      spikes.setOrigin(0.5, 0.5); // Center origin for rotation
      spikes.setAngle(rotation);
      
      // Adjust collision box for rotation
      const rad = (rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const rotatedWidth = totalWidth * cos + spikeSize * sin;
      const rotatedHeight = totalWidth * sin + spikeSize * cos;
      spikes.body.setSize(rotatedWidth, rotatedHeight);
      
      // Set up physics body
      spikes.body.setImmovable(true);
      spikes.body.allowGravity = false;
      spikes.body.moves = false;
      
      // Add to the spikes group
      this.spikes.add(spikes);
      return spikes;
    } else {
      // No rotation, use top-left positioning
      const spikes = this.physics.add.sprite(x, y, textureKey);
      spikes.setOrigin(0, 0); // Top-left origin
      spikes.setAngle(rotation);
      
      // Set up physics body
      spikes.body.setImmovable(true);
      spikes.body.allowGravity = false;
      spikes.body.moves = false;
      
      // Add to the spikes group
      this.spikes.add(spikes);
      return spikes;
    }
  }

  createStartMarker(x, y, width, height) {
    const graphics = this.add.graphics();
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2;

    // Draw green circle
    graphics.fillStyle(0x00ff00, 1);
    graphics.fillCircle(centerX, centerY, radius);

    // Draw border
    graphics.lineStyle(2, 0x000000, 1);
    graphics.strokeCircle(centerX, centerY, radius);

    const key = "start_marker_" + Date.now();
    graphics.generateTexture(key, width, height);
    graphics.destroy();

    // Create as visual sprite (not collidable)
    const marker = this.add.sprite(x + width / 2, y + height / 2, key);
    marker.setOrigin(0.5, 0.5);
    marker.setAlpha(0.7);

    // Add "START" text
    this.add
      .text(x + width / 2, y + height / 2, "S", {
        fontSize: "24px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
  }

  createCheckpoint(x, y, width, height, id) {
    const graphics = this.add.graphics();
    
    // Draw checkpoint flag pole
    const poleX = width / 2 - 2;
    const poleY = 0;
    const poleHeight = height;
    
    graphics.fillStyle(0x808080, 1); // Gray pole
    graphics.fillRect(poleX, poleY, 4, poleHeight);
    
    // Draw checkpoint flag (initially gray/inactive)
    const flagWidth = width * 0.6;
    const flagHeight = height * 0.4;
    const flagY = height * 0.2;
    
    graphics.fillStyle(0xaaaaaa, 1); // Gray flag (inactive)
    graphics.fillRect(poleX + 4, flagY, flagWidth, flagHeight);
    
    // Draw flag border
    graphics.lineStyle(2, 0x000000, 1);
    graphics.strokeRect(poleX + 4, flagY, flagWidth, flagHeight);
    
    const key = "checkpoint_inactive_" + Date.now();
    graphics.generateTexture(key, width, height);
    graphics.destroy();
    
    // Create as physics sprite
    const checkpoint = this.physics.add.sprite(
      x + width / 2,
      y + height / 2,
      key,
    );
    checkpoint.setOrigin(0.5, 0.5);
    checkpoint.body.setAllowGravity(false);
    checkpoint.body.setImmovable(true);
    checkpoint.body.moves = false; // Checkpoint doesn't move
    checkpoint.setData("id", id);
    checkpoint.setData("activated", false);
    checkpoint.setData("x", x + width / 2);
    checkpoint.setData("y", y + height / 2);
    checkpoint.setData("width", width);
    checkpoint.setData("height", height);
    
    // Add to checkpoints group
    this.checkpoints.add(checkpoint);
    checkpoint.body.debugBodyColor = 0x00ff00; // Green debug color for checkpoints
    
    // Add "CP" text
    const cpText = this.add
      .text(x + width / 2, y + height / 2, "CP", {
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    
    // Store text reference for later color change
    checkpoint.setData("text", cpText);
    
    console.log(`Checkpoint created at (${x}, ${y})`);
  }

  activateCheckpoint(player, checkpoint) {
    console.log("Checkpoint overlap detected!");
    
    // Only activate if not already activated
    if (checkpoint.getData("activated")) {
      console.log("Checkpoint already activated, skipping...");
      return;
    }
    
    // Mark as activated
    checkpoint.setData("activated", true);
    
    // Update current checkpoint - store the checkpoint position
    this.currentCheckpoint = {
      x: checkpoint.getData("x"),
      y: checkpoint.getData("y"),
    };
    
    console.log(`✓ Checkpoint activated! Will respawn at (${this.currentCheckpoint.x}, ${this.currentCheckpoint.y})`);
    
    // Create active checkpoint texture (green)
    const width = checkpoint.getData("width");
    const height = checkpoint.getData("height");
    const graphics = this.add.graphics();
    
    // Draw checkpoint flag pole
    const poleX = width / 2 - 2;
    const poleY = 0;
    const poleHeight = height;
    
    graphics.fillStyle(0x808080, 1); // Gray pole
    graphics.fillRect(poleX, poleY, 4, poleHeight);
    
    // Draw checkpoint flag (green/active)
    const flagWidth = width * 0.6;
    const flagHeight = height * 0.4;
    const flagY = height * 0.2;
    
    graphics.fillStyle(0x00ff00, 1); // Green flag (active)
    graphics.fillRect(poleX + 4, flagY, flagWidth, flagHeight);
    
    // Draw flag border
    graphics.lineStyle(2, 0x000000, 1);
    graphics.strokeRect(poleX + 4, flagY, flagWidth, flagHeight);
    
    const key = "checkpoint_active_" + Date.now();
    graphics.generateTexture(key, width, height);
    graphics.destroy();
    
    // Update checkpoint texture
    checkpoint.setTexture(key);
    
    // Update text color
    const cpText = checkpoint.getData("text");
    if (cpText) {
      cpText.setColor("#000000"); // Black text on green
    }
    
    // Show activation message
    const message = this.add
      .text(checkpoint.x, checkpoint.y - 40, "Checkpoint Saved!", {
        fontSize: "16px",
        fontStyle: "bold",
        color: "#00ff00",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    
    // Fade out message
    this.tweens.add({
      targets: message,
      alpha: 0,
      y: checkpoint.y - 60,
      duration: 1500,
      onComplete: () => {
        message.destroy();
      },
    });
  }

  createEndFlag(x, y, width, height) {
    const graphics = this.add.graphics();
    const poleX = 5;
    const poleY = 0;
    const poleHeight = height;
    const flagWidth = width - 10;
    const flagHeight = 30;

    // Draw pole
    graphics.fillStyle(0x654321, 1);
    graphics.fillRect(poleX, poleY, 5, poleHeight);

    // Draw flag
    graphics.fillStyle(0xffd700, 1);
    graphics.beginPath();
    graphics.moveTo(poleX + 5, poleY + 5);
    graphics.lineTo(poleX + 5 + flagWidth, poleY + 5 + flagHeight / 2);
    graphics.lineTo(poleX + 5, poleY + 5 + flagHeight);
    graphics.closePath();
    graphics.fillPath();

    // Draw flag border
    graphics.lineStyle(2, 0x000000, 1);
    graphics.beginPath();
    graphics.moveTo(poleX + 5, poleY + 5);
    graphics.lineTo(poleX + 5 + flagWidth, poleY + 5 + flagHeight / 2);
    graphics.lineTo(poleX + 5, poleY + 5 + flagHeight);
    graphics.closePath();
    graphics.strokePath();

    const key = "end_flag_" + Date.now();
    graphics.generateTexture(key, width, height);
    graphics.destroy();

    // Create as physics sprite for collision detection
    this.endFlagSprite = this.physics.add.sprite(
      x + width / 2,
      y + height / 2,
      key,
    );
    this.endFlagSprite.setOrigin(0.5, 0.5);
    this.endFlagSprite.body.setAllowGravity(false);
    this.endFlagSprite.body.setImmovable(true);

    // Add "END" text
    this.add
      .text(x + width / 2 + 5, y + 20, "END", {
        fontSize: "10px",
        fontStyle: "bold",
        color: "#000000",
      })
      .setOrigin(0.5);

    // Return the sprite so overlap can be added after player is created
    return this.endFlagSprite;
  }

  reachEndFlag() {
    if (this.levelComplete) return;

    this.levelComplete = true;

    // Stop player movement
    this.player.setVelocity(0, 0);
    
    // Disable player physics
    this.player.body.setEnable(false);

    // Unlock next level if using level system
    if (typeof unlockNextLevel !== 'undefined') {
      unlockNextLevel(this.currentLevel);
    }

    // Show victory screen
    this.showVictory();
  }
  
  showVictory() {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Dark overlay
    const overlay = this.add.rectangle(
      centerX,
      centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.85,
    );
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);
    
    // Make UI camera ignore popup elements
    this.uiCamera.ignore(overlay);

    // Victory panel - scaled down for zoom
    const panelWidth = 350;
    const panelHeight = 280;
    const panel = this.add.rectangle(
      centerX,
      centerY,
      panelWidth,
      panelHeight,
      0x1a1a1a,
      1,
    );
    panel.setScrollFactor(0);
    panel.setDepth(1001);
    panel.setStrokeStyle(3, 0xffd700);
    
    this.uiCamera.ignore(panel);

    // Victory title - scaled down
    const victoryText = this.add
      .text(centerX, centerY - 90, "🎉 VICTORY! 🎉", {
        fontSize: "32px",
        fontStyle: "bold",
        color: "#ffd700",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    victoryText.setScrollFactor(0);
    victoryText.setDepth(1002);
    
    this.uiCamera.ignore(victoryText);

    // Stats - scaled down
    const statsText = this.add
      .text(centerX, centerY - 30, `Lives Remaining: ${this.lives}/${this.maxLives}`, {
        fontSize: "18px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    statsText.setScrollFactor(0);
    statsText.setDepth(1002);
    
    this.uiCamera.ignore(statsText);

    // Buttons - adjusted spacing for smaller panel
    const nextLevel = this.currentLevel + 1;
    const hasNextLevel = typeof LEVELS_CONFIG !== 'undefined' && 
                         LEVELS_CONFIG.levels.find(l => l.id === nextLevel);
    
    if (hasNextLevel) {
      this.createMenuButton(centerX, centerY + 15, "Next Level", () => {
        window.location.href = `index.html?level=${nextLevel}`;
      });
      
      this.createMenuButton(centerX, centerY + 65, "Play Again", () => {
        window.location.href = `index.html?level=${this.currentLevel}`;
      });
      
      this.createMenuButton(centerX, centerY + 115, "Main Menu", () => {
        window.location.href = "menu.html";
      });
    } else {
      this.createMenuButton(centerX, centerY + 30, "Play Again", () => {
        window.location.href = `index.html?level=${this.currentLevel}`;
      });

      this.createMenuButton(centerX, centerY + 80, "Main Menu", () => {
        window.location.href = "menu.html";
      });
    }

    // Celebration effect
    this.cameras.main.flash(500, 255, 215, 0);
    
    // Confetti effect
    this.time.addEvent({
      delay: 100,
      callback: () => {
        const x = Phaser.Math.Between(0, this.cameras.main.width);
        const confetti = this.add.circle(x, -20, 5, Phaser.Math.Between(0x000000, 0xffffff));
        confetti.setScrollFactor(0);
        confetti.setDepth(999);
        
        this.tweens.add({
          targets: confetti,
          y: this.cameras.main.height + 20,
          angle: 360,
          duration: 2000,
          onComplete: () => confetti.destroy(),
        });
      },
      repeat: 20,
    });
  }
  
  showGameOver() {
    this.gameOver = true;
    
    // Stop player
    this.player.setVelocity(0, 0);
    this.player.body.setEnable(false);
    
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Dark overlay
    const overlay = this.add.rectangle(
      centerX,
      centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.85,
    );
    overlay.setScrollFactor(0);
    overlay.setDepth(1000);
    
    this.uiCamera.ignore(overlay);

    // Game over panel - scaled down for zoom
    const panelWidth = 350;
    const panelHeight = 250;
    const panel = this.add.rectangle(
      centerX,
      centerY,
      panelWidth,
      panelHeight,
      0x1a1a1a,
      1,
    );
    panel.setScrollFactor(0);
    panel.setDepth(1001);
    panel.setStrokeStyle(3, 0xff0000);
    
    this.uiCamera.ignore(panel);

    // Game over title - scaled down
    const gameOverText = this.add
      .text(centerX, centerY - 80, "GAME OVER", {
        fontSize: "36px",
        fontStyle: "bold",
        color: "#ff0000",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
    gameOverText.setScrollFactor(0);
    gameOverText.setDepth(1002);
    
    this.uiCamera.ignore(gameOverText);

    // Message - scaled down
    const messageText = this.add
      .text(centerX, centerY - 30, "You ran out of lives!", {
        fontSize: "18px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    messageText.setScrollFactor(0);
    messageText.setDepth(1002);
    
    this.uiCamera.ignore(messageText);

    // Buttons - adjusted spacing
    this.createMenuButton(centerX, centerY + 30, "Try Again", () => {
      this.scene.restart();
    });

    this.createMenuButton(centerX, centerY + 80, "Main Menu", () => {
      window.location.href = "menu.html";
    });

    // Sad effect
    this.cameras.main.shake(300, 0.01);
    this.cameras.main.fade(300, 0, 0, 0);
    this.time.delayedCall(300, () => {
      this.cameras.main.fadeIn(300);
    });
  }
  
  createMenuButton(x, y, text, callback) {
    const buttonWidth = 220;
    const buttonHeight = 40;
    
    // Button background
    const button = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x4a4a4a);
    button.setScrollFactor(0);
    button.setDepth(1002);
    button.setStrokeStyle(2, 0xffffff);
    button.setInteractive({ useHandCursor: true });
    
    // Button text - scaled down
    const buttonText = this.add
      .text(x, y, text, {
        fontSize: "20px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    buttonText.setScrollFactor(0);
    buttonText.setDepth(1003);
    
    // Make UI camera ignore popup buttons
    this.uiCamera.ignore([button, buttonText]);
    
    // Hover effects
    button.on("pointerover", () => {
      button.setFillStyle(0x6a6a6a);
      button.setStrokeStyle(3, 0xffd700);
      buttonText.setScale(1.05);
    });
    
    button.on("pointerout", () => {
      button.setFillStyle(0x4a4a4a);
      button.setStrokeStyle(3, 0xffffff);
      buttonText.setScale(1);
    });
    
    button.on("pointerdown", () => {
      button.setFillStyle(0x2a2a2a);
      buttonText.setScale(0.95);
    });
    
    button.on("pointerup", () => {
      button.setFillStyle(0x6a6a6a);
      buttonText.setScale(1.05);
      callback();
    });
    
    return { button, buttonText };
  }

  createTrap(x, y, width, height, rotation = 0) {
    // Create a clean, professional trap with orange color
    const graphics = this.add.graphics();

    // Draw trap with solid orange color
    graphics.fillStyle(0xFF8800, 1);
    graphics.fillRect(0, 0, width, height);

    // Generate a texture from the graphics
    const textureKey = "trap_" + x + "_" + y + "_" + Date.now();
    graphics.generateTexture(textureKey, width, height);
    graphics.destroy();

    // Create a sprite with the generated texture
    const trap = this.physics.add.sprite(
      x + width / 2,
      y + height / 2,
      textureKey,
    );
    trap.setOrigin(0.5, 0.5);

    // Set up physics body
    trap.body.setImmovable(true);
    trap.body.allowGravity = false;
    trap.body.moves = false;

    // Handle rotation if specified
    if (rotation) {
      trap.setAngle(rotation);
      // Update physics body for rotation
      const cos = Math.abs(Math.cos((rotation * Math.PI) / 180));
      const sin = Math.abs(Math.sin((rotation * Math.PI) / 180));
      const rotatedWidth = width * cos + height * sin;
      const rotatedHeight = width * sin + height * cos;
      trap.body.setSize(rotatedWidth, rotatedHeight);
      trap.body.setOffset(
        (width - rotatedWidth) / 2,
        (height - rotatedHeight) / 2,
      );
    } else {
      trap.body.setSize(width, height);
    }

    // Add to the traps group
    this.traps.add(trap);
    trap.body.active = true; // Explicitly set body to active
    console.log(
      `Trap created at (${x}, ${y}), added to traps group. Body active: ${trap.body ? trap.body.active : "N/A"}, enable: ${trap.body ? trap.body.enable : "N/A"}`,
    );

    return trap;
  }

  createLadder(x, y, width, height, color) {
    const colorHex =
      typeof color === "string" ? parseInt(color.replace("#", "0x")) : color || 0x8B4513;
    
    const graphics = this.add.graphics();
    const railWidth = Math.max(5, width * 0.15); // Side rails
    const rungSpacing = 20; // Space between rungs
    const rungHeight = 3;
    
    // Draw left rail
    graphics.fillStyle(colorHex, 1);
    graphics.fillRect(0, 0, railWidth, height);
    
    // Draw right rail
    graphics.fillRect(width - railWidth, 0, railWidth, height);
    
    // Draw rungs
    const numRungs = Math.floor(height / rungSpacing);
    for (let i = 0; i <= numRungs; i++) {
      const rungY = i * rungSpacing;
      if (rungY + rungHeight <= height) {
        graphics.fillRect(0, rungY, width, rungHeight);
      }
    }
    
    // Generate texture
    const textureKey = "ladder_" + x + "_" + y + "_" + Date.now();
    graphics.generateTexture(textureKey, width, height);
    graphics.destroy();
    
    // Create ladder sprite
    const ladder = this.ladders.create(x + width / 2, y + height / 2, textureKey);
    ladder.setOrigin(0.5, 0.5);
    ladder.refreshBody();
    
    // Store ladder bounds for easier collision detection
    ladder.setData("bounds", {
      left: x,
      right: x + width,
      top: y,
      bottom: y + height
    });
    
    console.log(`Ladder created at (${x}, ${y}) with size ${width}x${height}`);
    
    return ladder;
  }

  handleLadderOverlap(player, ladder) {
    // Check if player is actually within the ladder bounds
    const bounds = ladder.getData("bounds");
    if (!bounds) return;
    
    const playerInLadder = 
      player.x >= bounds.left && 
      player.x <= bounds.right &&
      player.y >= bounds.top && 
      player.y <= bounds.bottom;
    
    if (playerInLadder) {
      this.isOnLadder = true;
      this.currentLadder = ladder;
    }
  }

  createAttachedObject(obj, parentPlatform) {
    // In the editor, relativeX/Y is calculated from top-left corners
    // But in the game, the parent platform's x/y is its CENTER (origin 0.5, 0.5)
    // So we need to convert: subtract half the parent's width/height to get top-left
    const parentCenterX = parentPlatform.x;
    const parentCenterY = parentPlatform.y;
    const parentWidth = parentPlatform.displayWidth;
    const parentHeight = parentPlatform.displayHeight;
    
    // Convert parent center to top-left
    const parentTopLeftX = parentCenterX - parentWidth / 2;
    const parentTopLeftY = parentCenterY - parentHeight / 2;
    
    const relativeX = obj.relativeX || 0;
    const relativeY = obj.relativeY || 0;
    
    // Calculate absolute position: parent's top-left + relative offset
    const absoluteX = parentTopLeftX + relativeX;
    const absoluteY = parentTopLeftY + relativeY;
    
    // Store attachment info (keep relative positions for updates)
    const attachedData = {
      obj: obj,
      relativeX: relativeX,
      relativeY: relativeY,
      sprite: null,
    };

    // Create the visual sprite for the attached object
    switch (obj.type) {
      case "spike":
        attachedData.sprite = this.createAttachedSpike(obj, parentPlatform, absoluteX, absoluteY);
        break;
      case "platform":
      case "trap":
      case "deadly-floor":
        attachedData.sprite = this.createAttachedPlatform(obj, parentPlatform, absoluteX, absoluteY);
        break;
    }

    const attachedObjects = parentPlatform.getData("attachedObjects");
    attachedObjects.push(attachedData);
    parentPlatform.setData("attachedObjects", attachedObjects);
  }

  createAttachedSpike(obj, parentPlatform, absoluteX, absoluteY) {
    const graphics = this.add.graphics();
    const colorHex =
      typeof obj.color === "string"
        ? parseInt(obj.color.replace("#", "0x"))
        : obj.color;
    graphics.fillStyle(colorHex, 1);

    const spikeCount = obj.spikeCount || 5;
    const spikeSize = obj.spikeSize || 30;
    const totalWidth = spikeCount * spikeSize;

    for (let i = 0; i < spikeCount; i++) {
      const sx = i * spikeSize;
      graphics.beginPath();
      graphics.moveTo(sx, spikeSize);
      graphics.lineTo(sx + spikeSize / 2, 0);
      graphics.lineTo(sx + spikeSize, spikeSize);
      graphics.closePath();
      graphics.fillPath();
    }

    const key = "attached_spike_" + Date.now() + "_" + Math.random();
    graphics.generateTexture(key, totalWidth, spikeSize);
    graphics.destroy();

    let spike;
    if (obj.rotation && obj.rotation !== 0) {
      // When rotated, position at center for proper rotation
      spike = this.spikes.create(absoluteX + totalWidth / 2, absoluteY + spikeSize / 2, key);
      spike.setOrigin(0.5, 0.5); // Center origin for rotation
      spike.setAngle(obj.rotation);
      
      // Adjust collision box for rotation
      const rad = (obj.rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(rad));
      const sin = Math.abs(Math.sin(rad));
      const rotatedWidth = totalWidth * cos + spikeSize * sin;
      const rotatedHeight = totalWidth * sin + spikeSize * cos;
      spike.body.setSize(rotatedWidth, rotatedHeight);
    } else {
      // No rotation, use top-left positioning
      spike = this.spikes.create(absoluteX, absoluteY, key);
      spike.setOrigin(0, 0); // Top-left origin
    }
    
    spike.refreshBody();
    return spike;
  }

  createAttachedPlatform(obj, parentPlatform, absoluteX, absoluteY) {
    const colorHex =
      typeof obj.color === "string"
        ? parseInt(obj.color.replace("#", "0x"))
        : obj.color;
    const graphics = this.add.graphics();
    graphics.fillStyle(colorHex, 1);
    graphics.fillRect(0, 0, obj.width, obj.height);

    const key = "attached_platform_" + Date.now() + "_" + Math.random();
    graphics.generateTexture(key, obj.width, obj.height);
    graphics.destroy();

    let sprite;
    if (obj.type === "deadly-floor") {
      sprite = this.deadlyObjects.create(
        absoluteX + obj.width / 2,
        absoluteY + obj.height / 2,
        key,
      );
    } else if (obj.type === "trap") {
      sprite = this.traps.create(
        absoluteX + obj.width / 2,
        absoluteY + obj.height / 2,
        key,
      );
    } else {
      sprite = this.platforms.create(
        absoluteX + obj.width / 2,
        absoluteY + obj.height / 2,
        key,
      );
    }

    sprite.setOrigin(0.5, 0.5);
    sprite.refreshBody();

    if (obj.rotation) {
      sprite.setAngle(obj.rotation);
    }

    return sprite;
  }

  checkRotatedCollision(player, object) {
    // If object has no rotation or very small rotation, use default AABB collision
    const rotation = object.angle || 0;
    if (Math.abs(rotation) < 1) {
      return true; // Use default Phaser collision
    }

    // For rotated objects, check if player point is inside rotated rectangle
    const playerX = player.x;
    const playerY = player.y;
    const objectX = object.x;
    const objectY = object.y;

    // Get the object's original dimensions
    const objectWidth = object.displayWidth;
    const objectHeight = object.displayHeight;

    // Rotate player position relative to object center
    const rad = (-rotation * Math.PI) / 180; // Negative because we're rotating the point backwards
    const dx = playerX - objectX;
    const dy = playerY - objectY;
    const rotatedX = dx * Math.cos(rad) - dy * Math.sin(rad);
    const rotatedY = dx * Math.sin(rad) + dy * Math.cos(rad);

    // Check if rotated point is inside the unrotated rectangle
    const halfWidth = objectWidth / 2;
    const halfHeight = objectHeight / 2;
    const isInside =
      rotatedX >= -halfWidth &&
      rotatedX <= halfWidth &&
      rotatedY >= -halfHeight &&
      rotatedY <= halfHeight;

    return isInside;
  }

  handlePlatformCollision(player, platform) {
    // Check if player is standing on top of the platform
    // Use Phaser's built-in touching detection which is more reliable
    if (player.body.touching.down && platform.body.touching.up) {
      // Player is definitely on top of this platform
      player.isOnMovingPlatform = true;
      player.movingPlatform = platform;
    }

    // Allow normal collision handling - this is crucial for proper physics
    return true;
  }

  createUI() {
    // Get camera viewport dimensions
    const cam = this.cameras.main;
    
    // Lives display - will be rendered by UI camera only
    this.livesText = this.add.text(10, 10, `Lives: ${this.lives}/${this.maxLives}`, {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: { x: 10, y: 5 }
    });
    this.livesText.setScrollFactor(0);
    this.livesText.setOrigin(0, 0);
    this.livesText.setDepth(100000);
    
    // Pause button (top right) - will be rendered by UI camera only
    this.pauseButton = this.add.text(
      cam.width - 10,
      10,
      '⏸',
      {
        fontSize: '28px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: { x: 8, y: 4 }
      }
    );
    this.pauseButton.setOrigin(1, 0);
    this.pauseButton.setScrollFactor(0);
    this.pauseButton.setDepth(100000);
    this.pauseButton.setInteractive({ useHandCursor: true });
    this.pauseButton.on('pointerdown', () => {
      this.togglePause();
    });
    
    // Make main camera ignore UI elements (they'll only be seen by UI camera)
    this.cameras.main.ignore([this.livesText, this.pauseButton]);
    
    console.log(`UI created - Camera: ${cam.width}x${cam.height}`);
    console.log(`Lives: pos(${this.livesText.x}, ${this.livesText.y}), visible: ${this.livesText.visible}, depth: ${this.livesText.depth}`);
    console.log(`Pause: pos(${this.pauseButton.x}, ${this.pauseButton.y}), visible: ${this.pauseButton.visible}, depth: ${this.pauseButton.depth}`);
  }
  
  togglePause() {
    if (this.levelComplete || this.gameOver) {
      return; // Don't allow pause when game is over
    }
    
    if (this.isPaused) {
      this.resumeGame();
    } else {
      this.pauseGame();
    }
  }
  
  pauseGame() {
    this.isPaused = true;
    this.physics.pause();
    
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Create pause menu container
    this.pauseMenu = this.add.container(0, 0);
    this.pauseMenu.setDepth(2000);

    // Dark overlay
    const overlay = this.add.rectangle(
      centerX,
      centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7,
    );
    overlay.setScrollFactor(0);

    // Pause panel - scaled down for zoom
    const panel = this.add.rectangle(
      centerX,
      centerY,
      300,
      260,
      0x1a1a1a,
      1,
    );
    panel.setScrollFactor(0);
    panel.setStrokeStyle(3, 0xffd700);

    // Pause title - scaled down
    const pauseText = this.add
      .text(centerX, centerY - 80, "PAUSED", {
        fontSize: "32px",
        fontStyle: "bold",
        color: "#ffd700",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    pauseText.setScrollFactor(0);

    // Add elements to container
    this.pauseMenu.add([overlay, panel, pauseText]);

    // Buttons - adjusted spacing
    const resumeBtn = this.createMenuButton(centerX, centerY - 10, "Resume", () => {
      this.resumeGame();
    });
    this.pauseMenu.add([resumeBtn.button, resumeBtn.buttonText]);

    const restartBtn = this.createMenuButton(centerX, centerY + 40, "Restart", () => {
      this.resumeGame();
      this.scene.restart();
    });
    this.pauseMenu.add([restartBtn.button, restartBtn.buttonText]);

    const menuBtn = this.createMenuButton(centerX, centerY + 90, "Main Menu", () => {
      window.location.href = "menu.html";
    });
    this.pauseMenu.add([menuBtn.button, menuBtn.buttonText]);
  }
  
  resumeGame() {
    this.isPaused = false;
    this.physics.resume();
    
    if (this.pauseMenu) {
      this.pauseMenu.destroy();
      this.pauseMenu = null;
    }
  }

  createTouchControls() {
    // Detect if device is mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     ('ontouchstart' in window) || 
                     (navigator.maxTouchPoints > 0);
    
    // Only create controls on mobile devices
    if (!isMobile) {
      console.log('Desktop detected - skipping mobile controls');
      return;
    }
    
    console.log('Mobile detected - creating touch controls');
    
    // Create semi-transparent control buttons for mobile - scaled down for zoom
    const buttonAlpha = 0.5;
    const buttonRadius = 30; // Reduced from 45
    const buttonSize = 70; // Reduced from 100
    const buttonColor = 0x333333;
    const activeColor = 0x555555;

    // Helper function to create circular button texture with perfect circle
    const createButtonTexture = (key, color, alpha) => {
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(color, alpha);
      // Draw circle at center of square canvas
      graphics.fillCircle(buttonSize / 2, buttonSize / 2, buttonRadius);
      graphics.lineStyle(2, 0xffffff, 0.3);
      graphics.strokeCircle(buttonSize / 2, buttonSize / 2, buttonRadius);
      graphics.generateTexture(key, buttonSize, buttonSize);
      graphics.destroy();
    };

    // Create button textures
    createButtonTexture('controlButton', buttonColor, buttonAlpha);
    createButtonTexture('controlButtonActive', activeColor, 0.7);
    createButtonTexture('jumpButton', 0xff3333, buttonAlpha);
    createButtonTexture('jumpButtonActive', 0xff5555, 0.8);

    // Store button references for multi-touch
    this.touchButtons = [];
    
    // Left button - scaled down and ensure no stretching
    this.leftButton = this.add.image(60, this.cameras.main.height - 60, 'controlButton');
    this.leftButton.setScrollFactor(0);
    this.leftButton.setDepth(100000); // Very high depth
    this.leftButton.setDisplaySize(buttonSize, buttonSize); // Ensure square aspect ratio
    this.leftButton.setInteractive(
      new Phaser.Geom.Circle(buttonSize / 2, buttonSize / 2, buttonRadius + 10),
      Phaser.Geom.Circle.Contains
    );
    this.touchButtons.push(this.leftButton);

    this.leftButtonText = this.add
      .text(60, this.cameras.main.height - 60, "←", {
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100001);

    // Right button - scaled down and ensure no stretching
    this.rightButton = this.add.image(140, this.cameras.main.height - 60, 'controlButton');
    this.rightButton.setScrollFactor(0);
    this.rightButton.setDepth(100000); // Very high depth
    this.rightButton.setDisplaySize(buttonSize, buttonSize); // Ensure square aspect ratio
    this.rightButton.setInteractive(
      new Phaser.Geom.Circle(buttonSize / 2, buttonSize / 2, buttonRadius + 10),
      Phaser.Geom.Circle.Contains
    );
    this.touchButtons.push(this.rightButton);

    this.rightButtonText = this.add
      .text(140, this.cameras.main.height - 60, "→", {
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100001);

    // Jump button - scaled down and ensure no stretching
    this.jumpButton = this.add.image(
      this.cameras.main.width - 60,
      this.cameras.main.height - 60,
      'jumpButton'
    );
    this.jumpButton.setScrollFactor(0);
    this.jumpButton.setDepth(100000); // Very high depth
    this.jumpButton.setDisplaySize(buttonSize, buttonSize); // Ensure square aspect ratio
    this.jumpButton.setInteractive(
      new Phaser.Geom.Circle(buttonSize / 2, buttonSize / 2, buttonRadius + 10),
      Phaser.Geom.Circle.Contains
    );
    this.touchButtons.push(this.jumpButton);

    this.jumpButtonText = this.add
      .text(this.cameras.main.width - 60, this.cameras.main.height - 60, "↑", {
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(100001);

    // Multi-touch support - track active pointers
    this.activePointers = new Map();
    
    // Debug text to show touch state - scaled down and higher depth
    this.touchDebugText = this.add.text(this.cameras.main.width / 2, 50, 'Touch: None', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    })
    .setOrigin(0.5)
    .setScrollFactor(0)
    .setDepth(100000);
    
    console.log('Touch controls initialized with multi-touch support');
    console.log(`Phaser active pointers: ${this.input.pointersTotal}`);

    // Helper to update debug text
    const updateDebugText = () => {
      const active = Array.from(this.activePointers.values());
      this.touchDebugText.setText(`Touch: ${active.length > 0 ? active.join(' + ') : 'None'} | L:${this.touchLeft} R:${this.touchRight} J:${this.touchJump}`);
    };

    // Left button events with smooth feedback
    this.leftButton.on("pointerdown", (pointer) => {
      this.touchLeft = true;
      this.activePointers.set(pointer.id, 'left');
      this.leftButton.setTexture('controlButtonActive');
      this.leftButton.setScale(0.95);
      updateDebugText();
      console.log(`Left pressed (pointer ${pointer.id}), active: ${Array.from(this.activePointers.values()).join(', ')}`);
    });
    this.leftButton.on("pointerup", (pointer) => {
      this.activePointers.delete(pointer.id);
      if (!Array.from(this.activePointers.values()).includes('left')) {
        this.touchLeft = false;
        this.leftButton.setTexture('controlButton');
        this.leftButton.setScale(1);
      }
      updateDebugText();
    });
    this.leftButton.on("pointerout", (pointer) => {
      this.activePointers.delete(pointer.id);
      if (!Array.from(this.activePointers.values()).includes('left')) {
        this.touchLeft = false;
        this.leftButton.setTexture('controlButton');
        this.leftButton.setScale(1);
      }
      updateDebugText();
    });

    // Right button events with smooth feedback
    this.rightButton.on("pointerdown", (pointer) => {
      this.touchRight = true;
      this.activePointers.set(pointer.id, 'right');
      this.rightButton.setTexture('controlButtonActive');
      this.rightButton.setScale(0.95);
      updateDebugText();
      console.log(`Right pressed (pointer ${pointer.id}), active: ${Array.from(this.activePointers.values()).join(', ')}`);
    });
    this.rightButton.on("pointerup", (pointer) => {
      this.activePointers.delete(pointer.id);
      if (!Array.from(this.activePointers.values()).includes('right')) {
        this.touchRight = false;
        this.rightButton.setTexture('controlButton');
        this.rightButton.setScale(1);
      }
      updateDebugText();
    });
    this.rightButton.on("pointerout", (pointer) => {
      this.activePointers.delete(pointer.id);
      if (!Array.from(this.activePointers.values()).includes('right')) {
        this.touchRight = false;
        this.rightButton.setTexture('controlButton');
        this.rightButton.setScale(1);
      }
      updateDebugText();
    });

    // Jump button events with smooth feedback
    this.jumpButton.on("pointerdown", (pointer) => {
      this.touchJump = true;
      this.activePointers.set(pointer.id, 'jump');
      this.jumpButton.setTexture('jumpButtonActive');
      this.jumpButton.setScale(0.95);
      updateDebugText();
      console.log(`Jump pressed (pointer ${pointer.id}), active: ${Array.from(this.activePointers.values()).join(', ')}`);
    });
    this.jumpButton.on("pointerup", (pointer) => {
      this.activePointers.delete(pointer.id);
      if (!Array.from(this.activePointers.values()).includes('jump')) {
        this.touchJump = false;
        this.jumpButton.setTexture('jumpButton');
        this.jumpButton.setScale(1);
      }
      updateDebugText();
    });
    this.jumpButton.on("pointerout", (pointer) => {
      this.activePointers.delete(pointer.id);
      if (!Array.from(this.activePointers.values()).includes('jump')) {
        this.touchJump = false;
        this.jumpButton.setTexture('jumpButton');
        this.jumpButton.setScale(1);
      }
      updateDebugText();
    });
  }

  playerDeath(source = null) {
    let deathCause = "Unknown";
    if (typeof source === "string") {
      deathCause = source;
    } else if (source && source.texture && source.texture.key) {
      deathCause = `Collision with ${source.texture.key}`;
    } else if (source && source.name) {
      deathCause = `Collision with ${source.name}`; // For container objects like spikes
    } else if (source) {
      deathCause = "Collision with an object";
    }

    console.log(`Player died! Cause: ${deathCause}`); // Debug log

    // Decrease lives
    this.lives--;
    this.livesText.setText(`Lives: ${this.lives}/${this.maxLives}`);
    
    // Check for game over
    if (this.lives <= 0) {
      this.showGameOver();
      return;
    }

    // Reset player to last checkpoint or spawn point
    const respawnPoint = this.currentCheckpoint || this.spawnPoint;
    console.log(`Respawning at: (${respawnPoint.x}, ${respawnPoint.y}) - Using ${this.currentCheckpoint ? 'CHECKPOINT' : 'START POSITION'}`);
    this.player.setPosition(respawnPoint.x, respawnPoint.y);
    this.player.setVelocity(0, 0);

    // Reset any movement flags
    this.player.isOnMovingPlatform = false;
    this.player.movingPlatform = null;
    this.isOnLadder = false;
    this.currentLadder = null;
    
    // Re-enable gravity in case player died on ladder
    this.player.body.setAllowGravity(true);
    
    // Reset moving platforms that have resetOnDeath enabled
    this.movingPlatformInitialStates.forEach((state) => {
      const platform = state.platform;
      
      // Reset position
      platform.setPosition(state.startX, state.startY);
      
      // Reset velocity
      platform.body.velocity.x = state.velocityX;
      platform.body.velocity.y = state.velocityY;
      
      // Reset data
      platform.setData("triggered", state.triggered);
      platform.setData("direction", state.direction);
      platform.setData("previousX", state.startX);
      platform.setData("previousY", state.startY);
      
      console.log(`Reset moving platform to (${state.startX}, ${state.startY})`);
    });
    
    // Reset platforms with trigger effects
    this.platforms.getChildren().forEach((platform) => {
      if (platform.getData("hasTriggerEffect")) {
        const effectType = platform.getData("effectType");
        const wasActive = platform.getData("effectActive");
        
        // Reset trigger state
        platform.setData("effectTriggered", false);
        platform.setData("effectActive", false);
        
        // Restore platform to original state based on effect type
        if (wasActive) {
          switch (effectType) {
            case "collapse":
              // Restore visibility and physics
              platform.setAlpha(1);
              platform.body.enable = true;
              console.log("Restored collapsed platform");
              break;
              
            case "sticky":
              // Restore original texture
              const originalKey = platform.getData("originalKey");
              if (originalKey) {
                platform.setTexture(originalKey);
              }
              platform.setData("isSticky", false);
              console.log("Restored sticky platform");
              break;
              
            case "hot":
              // Restore original texture
              const origKey = platform.getData("originalKey");
              if (origKey) {
                platform.setTexture(origKey);
              }
              platform.setData("isHot", false);
              console.log("Restored hot platform");
              break;
          }
        }
      }
    });

    // Add death effect
    this.cameras.main.shake(200, 0.01);

    // Flash the screen red briefly
    this.cameras.main.flash(200, 255, 0, 0, false);
  }

  update() {
    // Don't allow movement if level is complete, game over, or paused
    if (this.levelComplete || this.gameOver || this.isPaused) {
      return;
    }

    // Reset moving platform flag at the start of each frame
    // It will be set again by handlePlatformCollision if player is still on a platform
    if (this.player.isOnMovingPlatform) {
      // Check if player is still touching down, if not, clear the flag
      if (!this.player.body.touching.down) {
        this.player.isOnMovingPlatform = false;
        this.player.movingPlatform = null;
      }
    }
    
    // Check if player is still on ladder
    if (this.isOnLadder && this.currentLadder) {
      const bounds = this.currentLadder.getData("bounds");
      const stillOnLadder = 
        this.player.x >= bounds.left && 
        this.player.x <= bounds.right &&
        this.player.y >= bounds.top && 
        this.player.y <= bounds.bottom;
      
      if (!stillOnLadder) {
        this.isOnLadder = false;
        this.currentLadder = null;
      }
    } else {
      this.isOnLadder = false;
      this.currentLadder = null;
    }

    // Handle ladder climbing
    if (this.isOnLadder) {
      // Disable gravity when on ladder
      this.player.body.setAllowGravity(false);
      
      // Vertical movement on ladder
      if (this.cursors.up.isDown || this.touchJump) {
        this.player.setVelocityY(-150); // Climb up
      } else if (this.cursors.down.isDown) {
        this.player.setVelocityY(150); // Climb down
      } else {
        this.player.setVelocityY(0); // Stop vertical movement
      }
      
      // Horizontal movement on ladder (can move left/right to get off)
      if (this.cursors.left.isDown || this.touchLeft) {
        this.player.setVelocityX(-150);
      } else if (this.cursors.right.isDown || this.touchRight) {
        this.player.setVelocityX(150);
      } else {
        this.player.setVelocityX(0);
      }
      
      // Skip normal movement logic when on ladder
      // Continue to moving platform updates
    } else {
      // Re-enable gravity when not on ladder
      this.player.body.setAllowGravity(true);

      // Calculate base player horizontal velocity based on input
      let playerHorizontalVelocity = 0;
      let baseSpeed = 200;
      
      // Check if player is on a sticky platform
      let isOnStickyPlatform = false;
      if (this.player.body.touching.down) {
        this.platforms.getChildren().forEach((platform) => {
          if (platform.getData("isSticky") && platform.body) {
            // Check if player is actually standing on this platform
            const playerBottom = this.player.body.bottom;
            const platformTop = platform.body.top;
            const horizontalOverlap = 
              this.player.body.right > platform.body.left &&
              this.player.body.left < platform.body.right;
            
            // Player is on platform if their bottom is near the platform top
            if (horizontalOverlap && Math.abs(playerBottom - platformTop) < 5) {
              isOnStickyPlatform = true;
              console.log("Player on sticky platform - speed reduced!");
            }
          }
        });
      }
      
      // Reduce speed significantly if on sticky platform
      const moveSpeed = isOnStickyPlatform ? baseSpeed * 0.3 : baseSpeed;
      
      if (this.cursors.left.isDown || this.touchLeft) {
        playerHorizontalVelocity = -moveSpeed;
      } else if (this.cursors.right.isDown || this.touchRight) {
        playerHorizontalVelocity = moveSpeed;
      }

      // Apply player horizontal velocity
      this.player.setVelocityX(playerHorizontalVelocity);

      // Jump - allow jumping when on the ground or on a moving platform
      const canJump = this.player.body.touching.down || this.player.isOnMovingPlatform;
      if ((this.cursors.up.isDown || this.touchJump) && canJump) {
        this.player.setVelocityY(-330);
        // Player is no longer on a platform if they jump
        this.player.isOnMovingPlatform = false;
        this.player.movingPlatform = null;
      }
    }

    // Update moving platforms
    this.movingPlatforms.getChildren().forEach((platform) => {
      // Get platform properties
      const moveSpeed = platform.getData("moveSpeed") || 1;
      const moveDistance = platform.getData("moveDistance") || 100;
      const moveDirX = platform.getData("moveDirX") || 1;
      const moveDirY = platform.getData("moveDirY") || 0;
      const startX = platform.getData("startX") || platform.x;
      const startY = platform.getData("startY") || platform.y;
      const moveMode = platform.getData("moveMode") || "loop";
      const requireTrigger = platform.getData("requireTrigger") || false;
      const triggerDistance = platform.getData("triggerDistance") || 100;
      let triggered = platform.getData("triggered") || false;
      let direction = platform.getData("direction") || 1;

      // Get previous position from last frame
      const previousX = platform.getData("previousX") || platform.x;
      const previousY = platform.getData("previousY") || platform.y;

      // Check trigger condition
      if (requireTrigger && !triggered) {
        const distanceToPlayer = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          platform.x,
          platform.y,
        );

        if (distanceToPlayer <= triggerDistance) {
          triggered = true;
          platform.setData("triggered", true);
        }
      }

      // Only move if not requiring trigger or already triggered
      if (!requireTrigger || triggered) {
        // Calculate distance from start position
        const distanceFromStart = Phaser.Math.Distance.Between(
          startX,
          startY,
          platform.x,
          platform.y,
        );

        // Calculate velocity based on direction
        const velocityX = moveSpeed * direction * moveDirX * 60;
        const velocityY = moveSpeed * direction * moveDirY * 60;

        // Handle movement bounds
        if (moveMode === "once") {
          // One-time movement
          if (direction === 1 && distanceFromStart >= moveDistance) {
            // Stop at end position
            platform.body.velocity.set(0, 0);
            platform.setData("direction", 0); // Stop moving
          } else if (direction === -1 && distanceFromStart <= 1) {
            // Stop at start position
            platform.body.velocity.set(0, 0);
            platform.setData("direction", 0); // Stop moving
          } else {
            // Move normally with velocity
            platform.body.velocity.x = velocityX;
            platform.body.velocity.y = velocityY;
          }
        } else {
          // Loop (back and forth)
          if (distanceFromStart >= moveDistance && direction === 1) {
            // Reached end, reverse direction
            direction = -1;
            platform.setData("direction", direction);
            platform.body.velocity.x = -velocityX;
            platform.body.velocity.y = -velocityY;
          } else if (distanceFromStart <= 1 && direction === -1) {
            // Reached start, reverse direction
            direction = 1;
            platform.setData("direction", direction);
            platform.body.velocity.x = velocityX;
            platform.body.velocity.y = velocityY;
          } else {
            // Continue moving with current velocity
            platform.body.velocity.x = velocityX;
            platform.body.velocity.y = velocityY;
          }
        }

        // Store current position for next frame
        platform.setData("previousX", platform.x);
        platform.setData("previousY", platform.y);
      }

      // Update attached objects positions
      const attachedObjects = platform.getData("attachedObjects") || [];
      attachedObjects.forEach((attachedData) => {
        if (attachedData.sprite && attachedData.sprite.active) {
          // Convert platform center to top-left, then add relative offset
          const platformTopLeftX = platform.x - platform.displayWidth / 2;
          const platformTopLeftY = platform.y - platform.displayHeight / 2;
          
          // Calculate new absolute position based on child's origin
          const childObj = attachedData.obj;
          
          if (childObj.type === "spike") {
            const spikeCount = childObj.spikeCount || 5;
            const spikeSize = childObj.spikeSize || 30;
            const totalWidth = spikeCount * spikeSize;
            
            if (childObj.rotation && childObj.rotation !== 0) {
              // Centered origin for rotated spikes
              attachedData.sprite.x = platformTopLeftX + attachedData.relativeX + totalWidth / 2;
              attachedData.sprite.y = platformTopLeftY + attachedData.relativeY + spikeSize / 2;
            } else {
              // Top-left origin for non-rotated spikes
              attachedData.sprite.x = platformTopLeftX + attachedData.relativeX;
              attachedData.sprite.y = platformTopLeftY + attachedData.relativeY;
            }
          } else {
            // Platforms, traps, deadly floors use centered origin (0.5, 0.5)
            attachedData.sprite.x = platformTopLeftX + attachedData.relativeX + childObj.width / 2;
            attachedData.sprite.y = platformTopLeftY + attachedData.relativeY + childObj.height / 2;
          }
          
          // Update physics body if it exists
          if (attachedData.sprite.body) {
            attachedData.sprite.body.updateFromGameObject();
          }
        }
      });
    });

    // Update platforms with trigger effects
    this.platforms.getChildren().forEach((platform) => {
      if (platform.getData("hasTriggerEffect")) {
        const effectTriggered = platform.getData("effectTriggered");
        const effectActive = platform.getData("effectActive");
        const effectType = platform.getData("effectType");
        const triggerDistance = platform.getData("effectTriggerDistance");
        
        // Check if player is within trigger distance
        if (!effectTriggered) {
          const distanceToPlayer = Phaser.Math.Distance.Between(
            this.player.x,
            this.player.y,
            platform.x,
            platform.y
          );
          
          if (distanceToPlayer <= triggerDistance) {
            // Trigger the effect
            platform.setData("effectTriggered", true);
            const timeout = platform.getData("effectTimeout") * 1000; // Convert to ms
            
            console.log(`Platform effect triggered: ${effectType}, timeout: ${timeout}ms`);
            
            // Schedule the effect activation
            this.time.delayedCall(timeout, () => {
              this.activatePlatformEffect(platform);
            });
          }
        }
      }
    });
    
    // Reset if player falls off the map (increased threshold to 200 pixels below world)
    if (this.player.y > this.physics.world.bounds.height + 200) {
      this.playerDeath("Fell off map");
    }
  }
  
  activatePlatformEffect(platform) {
    if (!platform || !platform.active) return;
    
    const effectType = platform.getData("effectType");
    platform.setData("effectActive", true);
    
    console.log(`Activating platform effect: ${effectType}`);
    
    switch (effectType) {
      case "collapse":
        // Make platform disappear
        platform.setAlpha(0);
        platform.body.enable = false;
        console.log("Platform collapsed!");
        break;
        
      case "sticky":
        // Change color to green and mark as sticky
        const width = platform.getData("width");
        const height = platform.getData("height");
        const graphics = this.add.graphics();
        graphics.fillStyle(0x00ff00, 1); // Green color
        graphics.fillRect(0, 0, width, height);
        const stickyKey = "sticky_platform_" + Date.now();
        graphics.generateTexture(stickyKey, width, height);
        graphics.destroy();
        
        platform.setTexture(stickyKey);
        platform.setData("isSticky", true);
        console.log("Platform turned sticky!");
        break;
        
      case "hot":
        // Change color to red and make it deadly
        const w = platform.getData("width");
        const h = platform.getData("height");
        const gfx = this.add.graphics();
        gfx.fillStyle(0xff0000, 1); // Red color
        gfx.fillRect(0, 0, w, h);
        const hotKey = "hot_platform_" + Date.now();
        gfx.generateTexture(hotKey, w, h);
        gfx.destroy();
        
        platform.setTexture(hotKey);
        platform.setData("isHot", true);
        console.log("Platform turned hot (deadly)!");
        break;
    }
  }
}


