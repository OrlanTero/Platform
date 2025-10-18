// Level configuration
const LEVELS_CONFIG = {
  levels: [
    {
      id: 1,
      name: "Level 1",
      file: "levels/level-1.json",
      unlocked: true
    },
    {
      id: 2,
      name: "Level 2",
      file: "levels/level-2.json",
      unlocked: false
    },
    {
      id: 3,
      name: "Level 3",
      file: "levels/level-3.json",
      unlocked: false
    }
  ]
};

// Get unlocked levels from localStorage
function getUnlockedLevels() {
  const saved = localStorage.getItem('unlockedLevels');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return [1]; // Default: only level 1 unlocked
    }
  }
  return [1];
}

// Save unlocked levels to localStorage
function saveUnlockedLevels(unlockedLevels) {
  localStorage.setItem('unlockedLevels', JSON.stringify(unlockedLevels));
}

// Unlock next level
function unlockNextLevel(currentLevel) {
  const unlockedLevels = getUnlockedLevels();
  const nextLevel = currentLevel + 1;
  
  if (!unlockedLevels.includes(nextLevel) && nextLevel <= LEVELS_CONFIG.levels.length) {
    unlockedLevels.push(nextLevel);
    saveUnlockedLevels(unlockedLevels);
    console.log(`Level ${nextLevel} unlocked!`);
  }
}

// Check if level is unlocked
function isLevelUnlocked(levelId) {
  const unlockedLevels = getUnlockedLevels();
  return unlockedLevels.includes(levelId);
}

// Get current level from URL or localStorage
function getCurrentLevel() {
  const urlParams = new URLSearchParams(window.location.search);
  const levelParam = urlParams.get('level');
  
  if (levelParam) {
    return parseInt(levelParam);
  }
  
  // Default to level 1
  return 1;
}

// Load level data from file
async function loadLevelData(levelId) {
  const level = LEVELS_CONFIG.levels.find(l => l.id === levelId);
  
  if (!level) {
    console.error(`Level ${levelId} not found`);
    return null;
  }
  
  try {
    const response = await fetch(level.file);
    if (!response.ok) {
      throw new Error(`Failed to load level: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error loading level ${levelId}:`, error);
    return null;
  }
}
