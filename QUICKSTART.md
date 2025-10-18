# Quick Start Guide

## 🎮 Play the Game

1. Start the server:
   ```bash
   npx http-server -p 8080
   ```

2. Open in browser: `http://localhost:8080`

3. Use arrow keys (desktop) or touch buttons (mobile) to play!

---

## 🗺️ Create Custom Maps

### Step 1: Open the Map Editor
Navigate to: `http://localhost:8080/map-editor`

### Step 2: Design Your Level

**Add Objects:**
1. Click an object type in the left toolbox:
   - **Platform** - Gray solid platform
   - **Moving Platform** - Green moving platform
   - **Deadly Floor** - Red death floor
   - **Spikes** - Brown deadly spikes
   - **Trap** - Orange/yellow trap

2. Adjust size in Properties panel (width/height)

3. Click on canvas to place object

**Move Objects:**
1. Click "Select Mode" button
2. Drag objects to reposition them

**Delete Objects:**
1. Click "Delete Mode" button
2. Click objects to remove them

### Step 3: Export Your Map
1. Click "Export Map" button
2. Save the JSON file to your computer

### Step 4: Load Your Map
1. Go to: `http://localhost:8080/load-custom-map.html`
2. Upload your JSON file
3. Click "Play with Loaded Map"

---

## 📝 Tips

- Player spawns at position (100, 450)
- Player can jump ~150-200px horizontally
- Use grid for precise alignment
- Test your map frequently
- Start with ground platforms at bottom

---

## 🎯 Controls

### Desktop
- **←** Move left
- **→** Move right  
- **↑** Jump

### Mobile
- **Blue buttons** (left) - Movement
- **Red button** (right) - Jump

---

## 🚀 That's it!

You now have everything you need to:
- ✅ Play the game
- ✅ Create custom maps
- ✅ Share your maps (export/import JSON files)

Have fun creating! 🎉
