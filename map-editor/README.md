# Map Editor

A visual drag-and-drop map editor for creating custom game levels.

## Features

### Object Types

1. **Platform** (Gray) - Standard solid platform
2. **Moving Platform** (Olive Green) - Platform that moves horizontally
3. **Deadly Floor** (Red with X) - Kills player on contact
4. **Spikes** (Brown triangles) - Deadly spikes
5. **Trap** (Orange with yellow stripes) - Deadly trap

### Controls

#### Placing Objects
1. Click an object type in the toolbox
2. Adjust width/height in the Properties section
3. Click on the canvas to place the object
4. Objects snap to a 10px grid for precision

#### Moving Objects
1. Click "Select Mode"
2. Click and drag any object to reposition it
3. Objects will snap to grid while dragging

#### Deleting Objects
1. Click "Delete Mode"
2. Click on any object to remove it

#### Other Controls
- **Zoom In/Out**: Use +/- buttons to zoom the canvas
- **Show Grid**: Toggle grid visibility
- **Clear All**: Remove all objects (with confirmation)

### Properties Panel

- **Width**: Set the width of the next object (20-500px)
- **Height**: Set the height of the next object (10-200px)
- **Move Distance**: (Moving platforms only) How far the platform moves
- **Move Speed**: (Moving platforms only) Speed of platform movement (1-10)

### Export/Import

#### Exporting a Map
1. Design your level
2. Click "Export Map"
3. A JSON file will download with your map data

#### Importing a Map
1. Click "Import Map"
2. Select a previously exported JSON file
3. The map will load into the editor

#### Using Maps in the Game
1. Export your map from the editor
2. Copy the JSON content
3. Use the map loader utility (see below)

## Running the Editor

```bash
# From the map-editor directory
npx http-server -p 8081
```

Then open `http://localhost:8081` in your browser.

## Map File Format

Maps are saved as JSON with this structure:

```json
{
  "worldWidth": 2400,
  "worldHeight": 600,
  "objects": [
    {
      "type": "platform",
      "color": "#4a4a4a",
      "x": 100,
      "y": 500,
      "width": 200,
      "height": 20
    },
    {
      "type": "moving-platform",
      "color": "#6b8e23",
      "x": 400,
      "y": 400,
      "width": 150,
      "height": 20,
      "moveDistance": 200,
      "moveSpeed": 2
    },
    {
      "type": "deadly-floor",
      "color": "#ff0000",
      "x": 300,
      "y": 580,
      "width": 80,
      "height": 20
    }
  ]
}
```

## Tips

- Start with ground platforms at the bottom
- Test your map by exporting and loading it in the game
- Use deadly floors sparingly to create challenge
- Moving platforms add dynamic gameplay
- Leave enough space for the player to jump between platforms
- The player spawns at position (100, 450) by default

## Keyboard Shortcuts

- **ESC**: Deselect current object
- **Delete**: Remove selected object
- **Ctrl+Z**: Undo last action (coming soon)

## Object Behavior in Game

- **Platforms**: Solid, player can stand on them
- **Moving Platforms**: Move horizontally, player moves with them
- **Deadly Floor**: Red platforms that reset player on contact
- **Spikes**: Instant death on contact
- **Traps**: Deadly obstacles with warning colors
