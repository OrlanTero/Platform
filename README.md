# 2D Platform Mobile Game

A simple 2D platformer game built with Phaser 3, featuring a stick-figure character made of black squares, with a powerful visual map editor.

## Features

### Game Features
- **Simple Character**: Black square-based character with head, body, arms, and legs
- **Physics-based Movement**: Jump, move left/right with smooth physics
- **Custom Map Support**: Load maps created in the visual editor
- **Mobile Controls**: Touch buttons for mobile devices
- **Keyboard Controls**: Arrow keys for desktop
- **Camera Follow**: Smooth camera that follows the player
- **Scrolling World**: Large map with horizontal scrolling
- **Deadly Obstacles**: Spikes, traps, and deadly floors
- **Moving Platforms**: Dynamic platforms that move horizontally

### Map Editor Features
- **Visual Drag-and-Drop**: Create maps visually with mouse
- **Multiple Object Types**: Platforms, moving platforms, spikes, traps, deadly floors
- **Adjustable Properties**: Customize size, movement speed, and distance
- **Export/Import**: Save and load maps as JSON files
- **Grid Snapping**: Precise object placement
- **Zoom Controls**: Zoom in/out for detailed editing

## Controls

### Desktop
- **Left Arrow**: Move left
- **Right Arrow**: Move right
- **Up Arrow**: Jump

### Mobile
- **Left Button** (bottom-left): Move left
- **Right Button** (bottom-left): Move right
- **Jump Button** (bottom-right): Jump

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the game server:**
   ```bash
   npx http-server -p 8080
   ```

3. **Open in browser:**
   - Game: `http://localhost:8080`
   - Map Editor: `http://localhost:8080/map-editor`
   - Map Loader: `http://localhost:8080/load-custom-map.html`

## Using the Map Editor

### Creating a Custom Map

1. **Open the Map Editor:**
   ```
   http://localhost:8080/map-editor
   ```

2. **Design Your Level:**
   - Click an object type in the toolbox (Platform, Moving Platform, Deadly Floor, Spikes, Trap)
   - Adjust width/height in the Properties panel
   - Click on the canvas to place objects
   - Use "Select Mode" to drag and reposition objects
   - Use "Delete Mode" to remove objects

3. **Export Your Map:**
   - Click "Export Map" button
   - Save the JSON file

4. **Load Your Map in the Game:**
   - Go to `http://localhost:8080/load-custom-map.html`
   - Upload your exported JSON file
   - Click "Play with Loaded Map"

### Object Types

- **Platform** (Gray): Standard solid platform
- **Moving Platform** (Green): Moves horizontally back and forth
- **Deadly Floor** (Red with X): Kills player on contact
- **Spikes** (Brown triangles): Deadly spikes
- **Trap** (Orange/Yellow): Deadly trap obstacle

## Game Mechanics

- **Movement**: Character can jump and move left/right
- **Gravity**: Physics-based gravity system
- **Platforms**: Solid surfaces the player can stand on
- **Moving Platforms**: Player moves with the platform
- **Deadly Objects**: Red floors, spikes, and traps reset player position
- **Camera**: Follows player smoothly through the world
- **Respawn**: Falling off the map or touching deadly objects respawns player at start

## Project Structure

```
Laro/
├── index.html                    # Main game entry point
├── game.js                       # Original game (simple map)
├── game-with-custom-map.js       # Enhanced game with custom map support
├── load-custom-map.html          # Map loader utility
├── map-editor/                   # Map editor folder
│   ├── index.html               # Editor interface
│   ├── style.css                # Editor styles
│   ├── editor.js                # Editor logic
│   └── README.md                # Editor documentation
├── package.json
└── README.md
```

## Customization

### Game Code (`game-with-custom-map.js`)
- **Character size**: Modify dimensions in `createCharacterSprite()`
- **Movement speed**: Change velocity values in `update()` (currently 200)
- **Jump height**: Adjust jump velocity (currently -400)
- **Gravity**: Modify `setGravityY()` value (currently 800)
- **Spawn point**: Change `this.spawnPoint` coordinates

### Map Editor
- **Grid size**: Modify snap value in `placeObject()` (currently 10px)
- **Default dimensions**: Change `currentWidth` and `currentHeight`
- **Canvas size**: Adjust `worldWidth` and `worldHeight`

## Tips for Map Design

1. **Start with ground platforms** at the bottom of the map
2. **Test frequently** by exporting and playing your map
3. **Use deadly objects sparingly** to create challenge without frustration
4. **Space platforms appropriately** - player can jump about 150-200px horizontally
5. **Add moving platforms** for dynamic gameplay
6. **Create a clear path** from start to finish

## Troubleshooting

- **Map not loading**: Check browser console for errors, ensure JSON is valid
- **Objects not appearing**: Verify object coordinates are within world bounds
- **Player falling through platforms**: Ensure platforms are in the `platforms` group
- **Moving platforms not moving**: Check `moveDistance` and `moveSpeed` values

Enjoy creating and playing your custom levels! 🎮
