# Quick Reference Guide

## Map Editor Controls

### Placing Objects
1. Click an object type in the toolbox
2. Click on canvas to place
3. Drag placed objects to move them

### Object Properties
- **Width/Height**: Adjust size (not for spikes)
- **Rotation**: 0-360° using input or slider
- **Spike Count**: Number of triangular spikes (1-20)
- **Attach to Platform**: Select moving platform from dropdown

### Moving Platform Properties
- **Move Distance**: How far platform travels (50-500px)
- **Move Speed**: Platform velocity (1-10)
- **Movement Mode**: 
  - Loop: Back and forth continuously
  - Once: One-time movement only
- **Requires Trigger**: Platform waits for player
- **Trigger Distance**: Activation range (50-1000px)

### Modes
- **Place Mode**: Default, click to place objects
- **Select Mode**: Click to select and edit objects
- **Delete Mode**: Click to remove objects

### Actions
- **Save to LocalStorage**: Auto-loads in game
- **Export Map**: Download JSON file
- **Import Map**: Load JSON file
- **Clear All**: Remove all objects

## Game Controls

### Keyboard
- **Arrow Keys / WASD**: Move left/right
- **Up Arrow / W / Space**: Jump
- **Space** (after win): Restart level

### Mobile
- **Left/Right Buttons**: Move
- **Jump Button**: Jump

## Object Behaviors

### Platforms
- **Platform**: Static, solid surface
- **Moving Platform**: Moves horizontally, carries player
  - Pushes player when hitting from side
  - Carries player when standing on top

### Hazards
- **Deadly Floor**: Red with X pattern, kills on touch
- **Spike**: Brown triangles, kills on touch
- **Trap**: Orange with yellow stripes, kills on touch

### Special
- **Start Position**: Green circle, player spawn point
- **End Flag**: Gold flag, reach to win level

## Tips

1. **Always place Start Position first** - defines where player spawns
2. **Place End Flag last** - marks the goal
3. **Test trigger distances** - too small = hard to activate, too large = activates too early
4. **Attach spikes to moving platforms** - creates moving hazards
5. **Use rotation on platforms** - creates angled surfaces
6. **Combine triggers with "once" mode** - creates puzzle elements
7. **Save frequently** - use LocalStorage or export to file

## Keyboard Shortcuts (Editor)

- **Delete key**: Delete selected object
- **Escape**: Deselect object
- **Ctrl+S**: Save to LocalStorage (browser dependent)

## Common Patterns

### Moving Spike Platform
1. Place moving platform
2. Place spikes
3. Select spikes
4. Attach to moving platform
5. Spikes now move with platform!

### Triggered Bridge
1. Place moving platform
2. Check "Requires Trigger"
3. Set trigger distance
4. Platform activates when player approaches

### Rotating Hazard
1. Place moving platform
2. Rotate platform (e.g., 45°)
3. Attach spikes
4. Rotate spikes (e.g., 90°)
5. Combined rotation creates spinning hazard!

## Troubleshooting

**Objects not appearing in game?**
- Make sure to save/export from editor
- Check browser console for errors
- Verify JSON format if importing

**Moving platform not moving?**
- Check if "Requires Trigger" is enabled
- Verify trigger distance if enabled
- Check move speed isn't 0

**Attached objects not moving?**
- Ensure parentId is set correctly
- Check that parent is a moving platform
- Verify relativeX/Y are calculated

**Player falls through platform?**
- Platforms must be solid (not deadly floor)
- Check platform placement (not too small)
- Verify collision groups in game code

**Can't place start/end position?**
- Only one of each allowed
- Placing new one removes old one automatically
