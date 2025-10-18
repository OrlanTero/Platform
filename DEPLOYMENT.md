# Deployment Guide

## Pre-Deployment Checklist

### 1. Export Your Custom Map to Level 1
1. Open `export-map-to-level.html` in your browser
2. Click "Download as JSON"
3. Save the downloaded file as `levels/level-1.json` (replace the placeholder)

### 2. Files to Include in Deployment
Include these files and directories:
```
/
├── index.html                  # Main game launcher
├── menu.html                   # Main menu (entry point)
├── game-with-custom-map.js     # Game engine
├── levels/
│   ├── levels-config.js        # Level configuration
│   ├── level-1.json            # Your custom level
│   ├── level-2.json            # Level 2 (optional)
│   └── level-3.json            # Level 3 (optional)
├── node_modules/
│   └── phaser/                 # Phaser game framework
└── assets/                     # Any game assets (if applicable)
```

### 3. Files to EXCLUDE from Deployment
Do NOT include these files (they're for development only):
```
/map-editor/                    # Map editor (not needed for production)
/load-custom-map.html          # Development tool
/export-map-to-level.html      # Development tool
/sample-maps/                   # Example maps
```

## Deployment Options

### Option 1: Static File Hosting (Recommended)

#### Netlify
1. Create a `netlify.toml` file:
```toml
[[redirects]]
  from = "/"
  to = "/menu.html"
  status = 200
```

2. Deploy:
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

#### Vercel
1. Create a `vercel.json` file:
```json
{
  "rewrites": [
    { "source": "/", "destination": "/menu.html" }
  ]
}
```

2. Deploy:
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### GitHub Pages
1. Push your code to GitHub
2. Go to Settings > Pages
3. Select branch and root folder
4. Your site will be at `https://username.github.io/repository-name/menu.html`

### Option 2: Traditional Web Server (Apache/Nginx)

#### Apache (.htaccess)
Create a `.htaccess` file in the root:
```apache
DirectoryIndex menu.html

# Enable CORS for JSON files
<FilesMatch "\.(json)$">
  Header set Access-Control-Allow-Origin "*"
</FilesMatch>

# Redirect root to menu
RewriteEngine On
RewriteRule ^$ menu.html [L]
```

#### Nginx
Add to your nginx config:
```nginx
location / {
    index menu.html;
    try_files $uri $uri/ /menu.html;
}

location ~* \.json$ {
    add_header Access-Control-Allow-Origin *;
}
```

## Post-Deployment

### 1. Test the Flow
1. Visit your deployed URL (should show menu.html)
2. Click "Level 1" - should load and play
3. Complete Level 1 - should unlock Level 2
4. Verify checkpoint system works
5. Test on mobile devices

### 2. Configure Additional Levels
- Edit `levels/level-2.json` and `levels/level-3.json` with your custom maps
- Or use the map editor locally and export them

### 3. Customize Level Configuration
Edit `levels/levels-config.js` to add more levels:
```javascript
const LEVELS_CONFIG = {
  levels: [
    { id: 1, name: "Level 1", file: "levels/level-1.json", unlocked: true },
    { id: 2, name: "Level 2", file: "levels/level-2.json", unlocked: false },
    { id: 3, name: "Level 3", file: "levels/level-3.json", unlocked: false },
    { id: 4, name: "Level 4", file: "levels/level-4.json", unlocked: false },
  ]
};
```

## Optimization Tips

### 1. Minify JavaScript (Optional)
```bash
# Install terser
npm install -g terser

# Minify game file
terser game-with-custom-map.js -o game-with-custom-map.min.js -c -m
```

### 2. Optimize Phaser Bundle
Instead of the full Phaser build, you can use a custom build with only the features you need.

### 3. Enable Compression
Most hosting providers automatically enable gzip/brotli compression. Verify it's enabled for:
- `.js` files
- `.json` files
- `.html` files

## Troubleshooting

### Issue: Levels not loading
- Check browser console for errors
- Verify JSON files are valid (use JSONLint)
- Ensure file paths are correct (case-sensitive on Linux servers)

### Issue: Menu shows but game doesn't start
- Check that `node_modules/phaser/` is included
- Verify all JavaScript files are loading (check Network tab)

### Issue: Checkpoints not working
- This was fixed in the latest update
- Make sure you're using the updated `game-with-custom-map.js`

### Issue: Mobile controls not showing
- Touch controls are automatically added
- Test on actual mobile device, not just browser dev tools

## Security Notes

- No server-side code required (pure static site)
- No user data is stored on servers (only localStorage)
- Safe to deploy on any static hosting platform
- No API keys or secrets needed

## Performance

- Initial load: ~2-3 seconds (Phaser + game code)
- Level load: <500ms (JSON parsing)
- Target: 60 FPS gameplay
- Mobile-optimized with touch controls

## Support

For issues or questions:
1. Check browser console for errors
2. Verify all files are deployed correctly
3. Test locally first with `python3 -m http.server 8080`
