class MapEditor {
    constructor() {
        this.canvas = document.getElementById('editorCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.objectSelector = document.getElementById('objectSelector');
        
        // Canvas settings
        this.worldWidth = 2400;
        this.worldHeight = 600;
        this.canvas.width = this.worldWidth;
        this.canvas.height = this.worldHeight;
        
        // Editor state
        this.objects = [];
        this.selectedTool = null;
        this.selectedObject = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.mode = 'place'; // 'place', 'delete', 'select', 'pan'
        this.showGrid = true;
        this.zoom = 1;
        
        // Camera/viewport offset for infinite canvas panning
        this.cameraX = 0;
        this.cameraY = 0;
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };
        
        // Default properties
        this.currentWidth = 150;
        this.currentHeight = 20;
        this.moveDistance = 200;
        this.moveSpeed = 2;
        this.spikeCount = 5;
        this.currentRotation = 0;
        this.moveMode = 'loop';
        this.requireTrigger = false;
        this.triggerDistance = 200;
        this.resetOnDeath = false;
        this.hasTriggerEffect = false;
        this.effectTriggerDistance = 200;
        this.effectType = 'collapse';
        this.effectTimeout = 3;
        
        // Auto-save settings
        this.autoSaveInterval = null;
        this.lastSaveTime = Date.now();
        
        this.init();
    }
    
    init() {
        this.loadFromLocalStorage(); // Load saved map on startup
        this.setupEventListeners();
        this.setupResizer();
        this.setupAutoSave();
        this.updateObjectSelector();
        this.render();
    }
    
    updateObjectSelector() {
        const selector = this.objectSelector;
        if (!selector) return;
        
        const currentValue = selector.value;
        
        // Clear existing options except the first one
        while (selector.options.length > 1) {
            selector.remove(1);
        }
        
        // Add all objects to the selector
        this.objects.forEach((obj, index) => {
            const option = document.createElement('option');
            const objType = obj.type || 'object';
            const objId = obj.id || `obj_${index}`;
            
            // Use the object's name if it exists, otherwise generate one
            const typeName = objType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const objName = obj.name || `${typeName} ${index + 1}`;
            
            // Update the object's name if it was using a generated name
            if (!obj.name) {
                obj.name = objName;
            }
            
            const displayName = `${objName} (${Math.round(obj.x)}, ${Math.round(obj.y)})`;
            
            option.value = objId;
            option.textContent = displayName;
            option.dataset.index = index;
            
            // Mark if this is the currently selected object
            if (this.selectedObject === obj) {
                option.selected = true;
            }
            
            selector.appendChild(option);
        });
        
        // Restore the previous selection if it still exists
        if (currentValue) {
            const option = selector.querySelector(`option[value="${currentValue}"]`);
            if (option) {
                option.selected = true;
            }
        }
    }
    
    selectObjectById(id) {
        const obj = this.objects.find(obj => (obj.id || '') === id);
        if (obj) {
            this.selectedObject = obj;
            this.loadObjectProperties(obj);
            this.render();
            
            // Update the selector to show the selected object
            this.updateObjectSelector();
            
            // Scroll the canvas to show the selected object
            this.scrollToObject(obj);
        }
    }
    
    scrollToObject(obj) {
        // Calculate the center position of the object
        const objCenterX = obj.x + (obj.width || 0) / 2;
        const objCenterY = obj.y + (obj.height || 0) / 2;
        
        // Calculate the scroll position to center the object
        const container = this.canvas.parentElement;
        const scrollX = objCenterX - container.clientWidth / 2;
        const scrollY = objCenterY - container.clientHeight / 2;
        
        // Smoothly scroll to the object
        container.scrollTo({
            left: Math.max(0, scrollX),
            top: Math.max(0, scrollY),
            behavior: 'smooth'
        });
    }
    
    setupResizer() {
        const resizer = document.getElementById('resizer');
        const toolbox = document.querySelector('.toolbox');
        let isResizing = false;
        
        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            
            const newWidth = e.clientX;
            if (newWidth >= 200 && newWidth <= 600) {
                toolbox.style.width = newWidth + 'px';
            }
        });
        
        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }
    
    handleKeyDown(e) {
        const moveStep = 5; // Pixels to move per key press
        const panStep = 50; // Pixels to pan per key press
        
        // Arrow key panning when no object is selected (or with Ctrl)
        if (!this.selectedObject || e.ctrlKey) {
            switch(e.key) {
                case 'ArrowUp':
                    this.cameraY -= panStep;
                    this.render();
                    e.preventDefault();
                    return;
                case 'ArrowDown':
                    this.cameraY += panStep;
                    this.render();
                    e.preventDefault();
                    return;
                case 'ArrowLeft':
                    this.cameraX -= panStep;
                    this.render();
                    e.preventDefault();
                    return;
                case 'ArrowRight':
                    this.cameraX += panStep;
                    this.render();
                    e.preventDefault();
                    return;
            }
        }
        
        // Arrow key movement for selected object
        if (this.selectedObject && !e.ctrlKey) {
            switch(e.key) {
                case 'ArrowUp':
                    this.selectedObject.y -= moveStep;
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    this.selectedObject.y += moveStep;
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                    this.selectedObject.x -= moveStep;
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    this.selectedObject.x += moveStep;
                    e.preventDefault();
                    break;
                // Fine-tune movement with Shift
                case 'w':
                    this.selectedObject.y -= 1;
                    e.preventDefault();
                    break;
                case 's':
                    this.selectedObject.y += 1;
                    e.preventDefault();
                    break;
                case 'a':
                    this.selectedObject.x -= 1;
                    e.preventDefault();
                    break;
                case 'd':
                    this.selectedObject.x += 1;
                    e.preventDefault();
                    break;
            }
            this.render();
        }
        
        // Mode switching
        if (e.ctrlKey) {
            switch(e.key.toLowerCase()) {
                case 's':
                    this.saveToLocalStorage();
                    alert('Map saved to local storage!');
                    e.preventDefault();
                    break;
                case 'p':
                    this.openPreview();
                    e.preventDefault();
                    break;
            }
        } else {
            switch(e.key.toLowerCase()) {
                case 's':
                    this.mode = 'select';
                    document.querySelectorAll('.tool-item').forEach(t => t.classList.remove('active'));
                    const selectBtn = document.getElementById('selectMode');
                    if (selectBtn) selectBtn.classList.add('active');
                    this.updateCursor();
                    e.preventDefault();
                    break;
                case 'd':
                    this.mode = 'delete';
                    document.querySelectorAll('.tool-item').forEach(t => t.classList.remove('active'));
                    const deleteBtn = document.getElementById('deleteMode');
                    if (deleteBtn) deleteBtn.classList.add('active');
                    this.updateCursor();
                    e.preventDefault();
                    break;
                case 'a':
                    this.mode = 'attach';
                    document.querySelectorAll('.tool-item').forEach(t => t.classList.remove('active'));
                    const attachBtn = document.getElementById('attachMode');
                    if (attachBtn) attachBtn.classList.add('active');
                    this.updateCursor();
                    e.preventDefault();
                    break;
            }
        }
    }
    
    setupEventListeners() {
        // Add keyboard event listener
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        
        // Object selector change event
        this.objectSelector.addEventListener('change', (e) => {
            const selectedId = e.target.value;
            if (selectedId) {
                this.selectObjectById(selectedId);
            } else {
                this.clearSelection();
            }
        });
        
        // Tool selection
        document.querySelectorAll('.tool-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.tool-item').forEach(t => t.classList.remove('active'));
                item.classList.add('active');
                this.selectedTool = {
                    type: item.dataset.type,
                    color: item.dataset.color
                };
                this.mode = 'place';
                this.updateCursor();
                
                // Show/hide type-specific properties
                const movingProps = document.getElementById('movingProps');
                const spikeProps = document.getElementById('spikeProps');
                const sizeProps = document.getElementById('sizeProps');
                const heightProps = document.getElementById('heightProps');
                
                movingProps.style.display = 'none';
                spikeProps.style.display = 'none';
                
                if (this.selectedTool.type === 'moving-platform') {
                    movingProps.style.display = 'block';
                    sizeProps.style.display = 'block';
                    heightProps.style.display = 'block';
                } else if (this.selectedTool.type === 'spike') {
                    spikeProps.style.display = 'block';
                    // Hide width/height for spikes
                    sizeProps.style.display = 'none';
                    heightProps.style.display = 'none';
                } else {
                    sizeProps.style.display = 'block';
                    heightProps.style.display = 'block';
                }
            });
        });
        
        // Property inputs
        document.getElementById('widthInput').addEventListener('input', (e) => {
            this.currentWidth = parseInt(e.target.value);
            console.log('Width changed to:', this.currentWidth, 'Selected object:', this.selectedObject);
            if (this.selectedObject && this.selectedObject.type !== 'spike') {
                this.selectedObject.width = this.currentWidth;
                console.log('Updated object width:', this.selectedObject);
                this.render();
            }
        });
        
        document.getElementById('heightInput').addEventListener('input', (e) => {
            this.currentHeight = parseInt(e.target.value);
            if (this.selectedObject && this.selectedObject.type !== 'spike') {
                this.selectedObject.height = this.currentHeight;
                this.render();
            }
        });
        
        document.getElementById('moveDistance').addEventListener('input', (e) => {
            this.moveDistance = parseInt(e.target.value);
            if (this.selectedObject && this.selectedObject.type === 'moving-platform') {
                this.selectedObject.moveDistance = this.moveDistance;
                this.render();
            }
        });
        
        document.getElementById('moveSpeed').addEventListener('input', (e) => {
            this.moveSpeed = parseFloat(e.target.value);
            if (this.selectedObject && this.selectedObject.type === 'moving-platform') {
                this.selectedObject.moveSpeed = this.moveSpeed;
                this.render();
            }
        });
        
        document.getElementById('moveMode').addEventListener('change', (e) => {
            this.moveMode = e.target.value;
            if (this.selectedObject && this.selectedObject.type === 'moving-platform') {
                this.selectedObject.moveMode = this.moveMode;
                this.render();
            }
        });
        
        document.getElementById('requireTrigger').addEventListener('change', (e) => {
            this.requireTrigger = e.target.checked;
            const triggerProps = document.getElementById('triggerProps');
            triggerProps.style.display = this.requireTrigger ? 'block' : 'none';
            if (this.selectedObject && this.selectedObject.type === 'moving-platform') {
                this.selectedObject.requireTrigger = this.requireTrigger;
                if (!this.requireTrigger) {
                    delete this.selectedObject.triggerDistance;
                }
                this.render();
            }
        });
        
        document.getElementById('triggerDistance').addEventListener('input', (e) => {
            this.triggerDistance = parseInt(e.target.value);
            if (this.selectedObject && this.selectedObject.type === 'moving-platform') {
                this.selectedObject.triggerDistance = this.triggerDistance;
                this.render();
            }
        });
        
        document.getElementById('resetOnDeath').addEventListener('change', (e) => {
            this.resetOnDeath = e.target.checked;
            if (this.selectedObject && this.selectedObject.type === 'moving-platform') {
                this.selectedObject.resetOnDeath = this.resetOnDeath;
                this.render();
            }
        });
        
        // Trigger effect event listeners
        document.getElementById('hasTriggerEffect').addEventListener('change', (e) => {
            this.hasTriggerEffect = e.target.checked;
            document.getElementById('triggerEffectOptions').style.display = e.target.checked ? 'block' : 'none';
            if (this.selectedObject && this.selectedObject.type === 'platform') {
                this.selectedObject.hasTriggerEffect = this.hasTriggerEffect;
                this.render();
            }
        });
        
        document.getElementById('effectTriggerDistance').addEventListener('input', (e) => {
            this.effectTriggerDistance = parseInt(e.target.value);
            if (this.selectedObject && this.selectedObject.type === 'platform') {
                this.selectedObject.effectTriggerDistance = this.effectTriggerDistance;
                this.render();
            }
        });
        
        document.getElementById('effectType').addEventListener('change', (e) => {
            this.effectType = e.target.value;
            if (this.selectedObject && this.selectedObject.type === 'platform') {
                this.selectedObject.effectType = this.effectType;
                this.render();
            }
        });
        
        document.getElementById('effectTimeout').addEventListener('input', (e) => {
            this.effectTimeout = parseFloat(e.target.value);
            if (this.selectedObject && this.selectedObject.type === 'platform') {
                this.selectedObject.effectTimeout = this.effectTimeout;
                this.render();
            }
        });
        
        document.getElementById('spikeCount').addEventListener('input', (e) => {
            this.spikeCount = parseInt(e.target.value);
            if (this.selectedObject && this.selectedObject.type === 'spike') {
                this.selectedObject.spikeCount = this.spikeCount;
                this.render();
            }
        });
        
        // Rotation controls
        const rotationInput = document.getElementById('rotationInput');
        const rotationSlider = document.getElementById('rotationSlider');
        
        console.log('Rotation input element:', rotationInput);
        console.log('Rotation slider element:', rotationSlider);
        
        if (rotationInput) {
            rotationInput.addEventListener('input', (e) => {
                this.currentRotation = parseInt(e.target.value);
                if (rotationSlider) rotationSlider.value = this.currentRotation;
                console.log('Rotation input changed to:', this.currentRotation);
                if (this.selectedObject) {
                    this.selectedObject.rotation = this.currentRotation;
                    console.log('Updated object rotation:', this.selectedObject);
                    this.render();
                }
            });
        } else {
            console.error('rotationInput element not found!');
        }
        
        if (rotationSlider) {
            rotationSlider.addEventListener('input', (e) => {
                this.currentRotation = parseInt(e.target.value);
                if (rotationInput) rotationInput.value = this.currentRotation;
                console.log('Rotation slider changed to:', this.currentRotation);
                if (this.selectedObject) {
                    this.selectedObject.rotation = this.currentRotation;
                    console.log('Updated object rotation:', this.selectedObject);
                    this.render();
                }
            });
        } else {
            console.error('rotationSlider element not found!');
        }
        
        // Color picker
        document.getElementById('colorPicker').addEventListener('input', (e) => {
            if (this.selectedObject) {
                this.selectedObject.color = e.target.value;
                this.render();
            }
        });
        
        // Attachment dropdown selection
        document.getElementById('parentSelect').addEventListener('change', (e) => {
            if (this.selectedObject) {
                const parentId = e.target.value;
                if (parentId) {
                    this.selectedObject.parentId = parentId;
                    // Calculate relative position to parent
                    const parent = this.objects.find(obj => obj.id === parentId);
                    if (parent) {
                        this.selectedObject.relativeX = this.selectedObject.x - parent.x;
                        this.selectedObject.relativeY = this.selectedObject.y - parent.y;
                    }
                } else {
                    delete this.selectedObject.parentId;
                    delete this.selectedObject.relativeX;
                    delete this.selectedObject.relativeY;
                }
                this.render();
            }
        });
        
        // Mode buttons
        document.getElementById('deleteMode').addEventListener('click', () => {
            this.mode = 'delete';
            this.updateCursor();
        });
        
        document.getElementById('selectMode').addEventListener('click', () => {
            this.mode = 'select';
            this.updateCursor();
        });
        
        document.getElementById('attachMode').addEventListener('click', () => {
            this.mode = 'attach';
            this.updateCursor();
        });
        
        // Canvas events
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Header buttons
        document.getElementById('playBtn').addEventListener('click', () => {
            this.openPreview();
        });
        
        document.getElementById('saveBtn').addEventListener('click', () => {
            this.saveToLocalStorage();
            alert('Map saved to LocalStorage!');
        });
        
        document.getElementById('clearBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all objects?')) {
                this.objects = [];
                this.autoSave();
                this.render();
            }
        });
        
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportMap();
        });
        
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });
        
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.importMap(e.target.files[0]);
        });
        
        // Preview modal controls
        document.getElementById('closePreviewBtn').addEventListener('click', () => {
            this.closePreview();
        });
        
        // Grid toggle
        document.getElementById('gridToggle').addEventListener('change', (e) => {
            this.showGrid = e.target.checked;
            this.render();
        });
        
        // Zoom controls
        document.getElementById('zoomIn').addEventListener('click', () => {
            this.zoom = Math.min(2, this.zoom + 0.1);
            this.updateZoom();
        });
        
        document.getElementById('zoomOut').addEventListener('click', () => {
            this.zoom = Math.max(0.5, this.zoom - 0.1);
            this.updateZoom();
        });
    }
    
    updateCursor() {
        // Reset inline cursor style first
        this.canvas.style.cursor = '';
        this.canvas.className = '';
        if (this.mode === 'delete') {
            this.canvas.classList.add('delete-mode');
        } else if (this.mode === 'select') {
            this.canvas.classList.add('select-mode');
        }
    }
    
    updateZoom() {
        this.canvas.style.transform = `scale(${this.zoom})`;
        this.canvas.style.transformOrigin = 'top left';
        document.getElementById('zoomLevel').textContent = Math.round(this.zoom * 100) + '%';
    }
    
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) / this.zoom + this.cameraX;
        const y = (e.clientY - rect.top) / this.zoom + this.cameraY;
        
        // Middle mouse button or spacebar + left click for panning
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            this.isPanning = true;
            this.panStart = { x: e.clientX, y: e.clientY };
            this.canvas.style.cursor = 'grabbing';
            e.preventDefault();
            return;
        }
        
        if (this.mode === 'delete') {
            this.deleteObjectAt(x, y);
        } else if (this.mode === 'select') {
            this.selectObjectAt(x, y);
            if (this.selectedObject) {
                this.isDragging = true;
                this.dragOffset = {
                    x: x - this.selectedObject.x,
                    y: y - this.selectedObject.y
                };
            }
        } else if (this.mode === 'place' && this.selectedTool) {
            this.placeObject(x, y);
        }
    }
    
    handleMouseMove(e) {
        // Handle panning
        if (this.isPanning) {
            const dx = (e.clientX - this.panStart.x) / this.zoom;
            const dy = (e.clientY - this.panStart.y) / this.zoom;
            
            this.cameraX -= dx;
            this.cameraY -= dy;
            
            this.panStart = { x: e.clientX, y: e.clientY };
            this.render();
            return;
        }
        
        // Handle object dragging
        if (this.isDragging && this.selectedObject) {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left) / this.zoom + this.cameraX;
            const y = (e.clientY - rect.top) / this.zoom + this.cameraY;
            
            this.selectedObject.x = x - this.dragOffset.x;
            this.selectedObject.y = y - this.dragOffset.y;
            
            // Snap to grid (optional)
            this.selectedObject.x = Math.round(this.selectedObject.x / 10) * 10;
            this.selectedObject.y = Math.round(this.selectedObject.y / 10) * 10;
            
            this.render();
        }
    }
    
    handleMouseUp() {
        if (this.isDragging) {
            this.autoSave(); // Save after dragging
        }
        if (this.isPanning) {
            this.isPanning = false;
            this.updateCursor();
        }
        this.isDragging = false;
    }
    
    placeObject(x, y) {
        // Handle start position - only allow one
        if (this.selectedTool.type === 'start-position') {
            // Remove existing start position
            this.objects = this.objects.filter(obj => obj.type !== 'start-position');
        }
        
        // Handle end flag - only allow one
        if (this.selectedTool.type === 'end-flag') {
            // Remove existing end flag
            this.objects = this.objects.filter(obj => obj.type !== 'end-flag');
        }
        
        // Create a human-readable name for the object
        const objectType = this.selectedTool.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const objectCount = this.objects.filter(o => o.type === this.selectedTool.type).length + 1;
        
        const obj = {
            id: 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: `${objectType} ${objectCount}`,
            type: this.selectedTool.type,
            color: this.selectedTool.color,
            x: Math.round(x / 10) * 10,
            y: Math.round(y / 10) * 10,
            rotation: this.currentRotation || 0
        };
        
        // Add specific properties for spikes (fixed size triangles)
        if (obj.type === 'spike') {
            obj.spikeCount = this.spikeCount;
            obj.spikeSize = 30; // Fixed size for each spike triangle
        } else if (obj.type === 'start-position') {
            // Start position is a circle marker
            obj.width = 40;
            obj.height = 40;
        } else if (obj.type === 'end-flag') {
            // End flag dimensions
            obj.width = 40;
            obj.height = 60;
        } else if (obj.type === 'checkpoint') {
            // Checkpoint dimensions
            obj.width = 30;
            obj.height = 50;
        } else {
            // Other objects have width and height
            obj.width = this.currentWidth;
            obj.height = this.currentHeight;
        }
        
        // Add trigger effect properties for platforms
        if (obj.type === 'platform') {
            obj.hasTriggerEffect = this.hasTriggerEffect;
            if (obj.hasTriggerEffect) {
                obj.effectTriggerDistance = this.effectTriggerDistance;
                obj.effectType = this.effectType;
                obj.effectTimeout = this.effectTimeout;
            }
        }
        
        // Add specific properties for moving platforms
        if (obj.type === 'moving-platform') {
            obj.moveDistance = this.moveDistance;
            obj.moveSpeed = this.moveSpeed;
            obj.moveDirection = 'horizontal'; // or 'vertical'
            obj.moveMode = this.moveMode;
            obj.requireTrigger = this.requireTrigger;
            if (obj.requireTrigger) {
                obj.triggerDistance = this.triggerDistance;
            }
            obj.resetOnDeath = this.resetOnDeath;
        }
        
        this.objects.push(obj);
        this.autoSave();
        this.render();
    }
    
    deleteObjectAt(x, y) {
        const index = this.objects.findIndex(obj => {
            if (obj.type === 'spike') {
                const totalWidth = obj.spikeCount * obj.spikeSize;
                const height = obj.spikeSize;
                return x >= obj.x && x <= obj.x + totalWidth &&
                       y >= obj.y && y <= obj.y + height;
            } else {
                return x >= obj.x && x <= obj.x + obj.width &&
                       y >= obj.y && y <= obj.y + obj.height;
            }
        });
        
        if (index !== -1) {
            this.objects.splice(index, 1);
            this.autoSave();
            this.render();
        }
    }
    
    selectObjectAt(x, y) {
        console.log('Selecting at:', x, y);
        console.log('Available objects:', this.objects);
        
        this.selectedObject = this.objects.find(obj => {
            if (obj.type === 'spike') {
                const totalWidth = obj.spikeCount * obj.spikeSize;
                const height = obj.spikeSize;
                return x >= obj.x && x <= obj.x + totalWidth &&
                       y >= obj.y && y <= obj.y + height;
            } else {
                return x >= obj.x && x <= obj.x + obj.width &&
                       y >= obj.y && y <= obj.y + obj.height;
            }
        });
        
        console.log('Selected object:', this.selectedObject);
        
        // Load selected object properties into the toolbox
        if (this.selectedObject) {
            console.log('Loading properties for:', this.selectedObject);
            this.loadObjectProperties(this.selectedObject);
        } else {
            console.log('No object selected, clearing selection');
            // Clear selection info if clicking on empty space
            this.clearSelection();
        }
        
        this.render();
    }
    
    clearSelection() {
        const selectedInfo = document.getElementById('selectedObjectInfo');
        selectedInfo.style.display = 'none';
        this.selectedObject = null;
    }
    
    loadObjectProperties(obj) {
        console.log('loadObjectProperties called with:', obj);
        
        // Show selected object info
        const selectedInfo = document.getElementById('selectedObjectInfo');
        const selectedType = document.getElementById('selectedType');
        const nameInput = document.getElementById('objectName');
        
        console.log('selectedInfo element:', selectedInfo);
        console.log('selectedType element:', selectedType);
        
        if (selectedInfo && selectedType && nameInput) {
            selectedInfo.style.display = 'block';
            
            // Set object name and type
            nameInput.value = obj.name || '';
            nameInput.onchange = (e) => {
                obj.name = e.target.value.trim() || obj.name; // Keep old name if empty
                this.updateObjectSelector(); // Update the dropdown with new name
                this.render();
            };
            
            selectedType.textContent = obj.type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            console.log('Updated UI with type:', obj.type);
        } else {
            console.error('Could not find required elements in loadObjectProperties');
        }
        
        // Show/hide type-specific properties
        const movingProps = document.getElementById('movingProps');
        const spikeProps = document.getElementById('spikeProps');
        const sizeProps = document.getElementById('sizeProps');
        const heightProps = document.getElementById('heightProps');
        const colorProps = document.getElementById('colorProps');
        const triggerEffectProps = document.getElementById('triggerEffectProps');
        
        movingProps.style.display = 'none';
        spikeProps.style.display = 'none';
        colorProps.style.display = 'none';
        triggerEffectProps.style.display = 'none';
        
        if (obj.type === 'spike') {
            // Spikes only have count, no width/height
            spikeProps.style.display = 'block';
            sizeProps.style.display = 'none';
            heightProps.style.display = 'none';
            document.getElementById('spikeCount').value = obj.spikeCount || 5;
            this.spikeCount = obj.spikeCount || 5;
        } else {
            // Other objects have width/height
            sizeProps.style.display = 'block';
            heightProps.style.display = 'block';
            document.getElementById('widthInput').value = obj.width;
            document.getElementById('heightInput').value = obj.height;
            this.currentWidth = obj.width;
            this.currentHeight = obj.height;
            
            if (obj.type === 'moving-platform' || obj.type === 'platform') {
                // Show color picker for platforms
                colorProps.style.display = 'block';
                document.getElementById('colorPicker').value = obj.color || '#4a4a4a';
            }
            
            if (obj.type === 'platform') {
                // Show trigger effect properties for regular platforms
                triggerEffectProps.style.display = 'block';
                document.getElementById('hasTriggerEffect').checked = obj.hasTriggerEffect || false;
                document.getElementById('triggerEffectOptions').style.display = obj.hasTriggerEffect ? 'block' : 'none';
                document.getElementById('effectTriggerDistance').value = obj.effectTriggerDistance || 200;
                document.getElementById('effectType').value = obj.effectType || 'collapse';
                document.getElementById('effectTimeout').value = obj.effectTimeout || 3;
                this.hasTriggerEffect = obj.hasTriggerEffect || false;
                this.effectTriggerDistance = obj.effectTriggerDistance || 200;
                this.effectType = obj.effectType || 'collapse';
                this.effectTimeout = obj.effectTimeout || 3;
            }
            
            if (obj.type === 'moving-platform') {
                movingProps.style.display = 'block';
                document.getElementById('moveDistance').value = obj.moveDistance || 200;
                document.getElementById('moveSpeed').value = obj.moveSpeed || 2;
                document.getElementById('moveMode').value = obj.moveMode || 'loop';
                document.getElementById('requireTrigger').checked = obj.requireTrigger || false;
                document.getElementById('triggerDistance').value = obj.triggerDistance || 200;
                document.getElementById('triggerProps').style.display = obj.requireTrigger ? 'block' : 'none';
                document.getElementById('resetOnDeath').checked = obj.resetOnDeath || false;
                this.moveDistance = obj.moveDistance || 200;
                this.moveSpeed = obj.moveSpeed || 2;
                this.moveMode = obj.moveMode || 'loop';
                this.requireTrigger = obj.requireTrigger || false;
                this.triggerDistance = obj.triggerDistance || 200;
                this.resetOnDeath = obj.resetOnDeath || false;
            }
        }
        
        // Update rotation controls
        const rotation = obj.rotation || 0;
        document.getElementById('rotationInput').value = rotation;
        document.getElementById('rotationSlider').value = rotation;
        this.currentRotation = rotation;
        
        // Update parent selection dropdown
        this.updateParentDropdown(obj);
        
        // Highlight the corresponding tool in the toolbox
        document.querySelectorAll('.tool-item').forEach(item => {
            if (item.dataset.type === obj.type) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    updateParentDropdown(currentObj) {
        const parentSelect = document.getElementById('parentSelect');
        parentSelect.innerHTML = '<option value="">None</option>';
        
        console.log('Updating parent dropdown for:', currentObj);
        console.log('All objects:', this.objects);
        
        // Add all moving platforms as options
        let movingPlatformCount = 0;
        this.objects.forEach(obj => {
            console.log('Checking object:', obj.type, obj.id);
            if (obj.type === 'moving-platform' && obj.id !== currentObj.id) {
                movingPlatformCount++;
                const option = document.createElement('option');
                option.value = obj.id;
                option.textContent = `Moving Platform at (${obj.x}, ${obj.y})`;
                if (currentObj.parentId === obj.id) {
                    option.selected = true;
                }
                parentSelect.appendChild(option);
                console.log('Added moving platform to dropdown:', obj.id);
            }
        });
        
        console.log('Total moving platforms found:', movingPlatformCount);
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update object selector to reflect any changes
        if (this.objectSelector) {
            this.updateObjectSelector();
        }
        
        // Apply camera transform
        this.ctx.save();
        this.ctx.translate(-this.cameraX, -this.cameraY);
        
        // Draw grid
        if (this.showGrid) {
            this.drawGrid();
        }
        
        // Update positions and rotations of attached objects first
        this.objects.forEach(obj => {
            if (obj.parentId) {
                const parent = this.objects.find(p => p.id === obj.parentId);
                if (parent && obj.relativeX !== undefined && obj.relativeY !== undefined) {
                    // Update position
                    obj.x = parent.x + obj.relativeX;
                    obj.y = parent.y + obj.relativeY;
                    
                    // Inherit parent rotation
                    if (parent.rotation !== undefined) {
                        obj.inheritedRotation = parent.rotation;
                    }
                }
            }
        });
        
        // Draw all objects
        this.objects.forEach(obj => {
            this.drawObject(obj);
        });
        
        // Highlight selected object
        if (this.selectedObject) {
            this.ctx.strokeStyle = '#00d4ff';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(
                this.selectedObject.x,
                this.selectedObject.y,
                this.selectedObject.width,
                this.selectedObject.height
            );
        }
        
        // Restore context (remove camera transform)
        this.ctx.restore();
        
        // Draw camera position indicator in corner
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`Camera: (${Math.round(this.cameraX)}, ${Math.round(this.cameraY)})`, 10, 20);
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Calculate visible area based on camera position
        const startX = Math.floor(this.cameraX / 50) * 50;
        const endX = startX + this.canvas.width + 100;
        const startY = Math.floor(this.cameraY / 50) * 50;
        const endY = startY + this.canvas.height + 100;
        
        // Vertical lines
        for (let x = startX; x <= endX; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, startY);
            this.ctx.lineTo(x, endY);
            this.ctx.stroke();
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(startX, y);
            this.ctx.lineTo(endX, y);
            this.ctx.stroke();
        }
    }
    
    drawObject(obj) {
        // Combine own rotation with inherited rotation from parent
        const ownRotation = obj.rotation || 0;
        const inheritedRotation = obj.inheritedRotation || 0;
        const totalRotation = (ownRotation + inheritedRotation) * Math.PI / 180;
        
        // Save context and apply rotation
        this.ctx.save();
        
        if (totalRotation !== 0) {
            // Calculate center point for rotation
            let centerX, centerY;
            if (obj.type === 'spike') {
                const totalWidth = obj.spikeCount * obj.spikeSize;
                centerX = obj.x + totalWidth / 2;
                centerY = obj.y + obj.spikeSize / 2;
            } else {
                centerX = obj.x + obj.width / 2;
                centerY = obj.y + obj.height / 2;
            }
            
            // Debug: log rotation being applied
            if (obj === this.selectedObject) {
                console.log('Drawing object with rotation:', ownRotation, 'inherited:', inheritedRotation, 'total radians:', totalRotation);
            }
            
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(totalRotation);
            this.ctx.translate(-centerX, -centerY);
        }
        
        switch (obj.type) {
            case 'platform':
            case 'moving-platform':
            case 'deadly-floor':
            case 'trap':
                this.ctx.fillStyle = obj.color;
                this.ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
                
                // Add indicator for moving platforms
                if (obj.type === 'moving-platform') {
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = 2;
                    this.ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
                    
                    // Draw movement indicator
                    this.ctx.strokeStyle = '#ffff00';
                    this.ctx.setLineDash([5, 5]);
                    this.ctx.beginPath();
                    this.ctx.moveTo(obj.x + obj.width / 2, obj.y + obj.height / 2);
                    this.ctx.lineTo(obj.x + obj.width / 2 + obj.moveDistance, obj.y + obj.height / 2);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                    
                    // Draw trigger distance radius if trigger is enabled
                    if (obj.requireTrigger && obj.triggerDistance) {
                        const centerX = obj.x + obj.width / 2;
                        const centerY = obj.y + obj.height / 2;
                        const radius = obj.triggerDistance;
                        
                        // Draw trigger radius circle
                        this.ctx.strokeStyle = '#00ffff';
                        this.ctx.lineWidth = 2;
                        this.ctx.setLineDash([10, 5]);
                        this.ctx.beginPath();
                        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                        this.ctx.stroke();
                        this.ctx.setLineDash([]);
                        
                        // Draw label
                        this.ctx.fillStyle = '#00ffff';
                        this.ctx.font = 'bold 12px Arial';
                        this.ctx.textAlign = 'center';
                        this.ctx.fillText('TRIGGER ZONE', centerX, centerY - radius - 10);
                        this.ctx.fillText(obj.triggerDistance + 'px', centerX, centerY - radius + 5);
                    }
                }
                
                // Add trigger effect indicator for platforms
                if (obj.type === 'platform' && obj.hasTriggerEffect && obj.effectTriggerDistance) {
                    const centerX = obj.x + obj.width / 2;
                    const centerY = obj.y + obj.height / 2;
                    const radius = obj.effectTriggerDistance;
                    
                    // Draw trigger radius circle
                    this.ctx.strokeStyle = '#ff00ff'; // Magenta for platform effects
                    this.ctx.lineWidth = 2;
                    this.ctx.setLineDash([10, 5]);
                    this.ctx.beginPath();
                    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                    this.ctx.stroke();
                    this.ctx.setLineDash([]);
                    
                    // Draw label with effect type
                    this.ctx.fillStyle = '#ff00ff';
                    this.ctx.font = 'bold 12px Arial';
                    this.ctx.textAlign = 'center';
                    const effectLabel = obj.effectType ? obj.effectType.toUpperCase() : 'EFFECT';
                    this.ctx.fillText(`${effectLabel} TRIGGER`, centerX, centerY - radius - 10);
                    this.ctx.fillText(obj.effectTriggerDistance + 'px', centerX, centerY - radius + 5);
                }
                
                // Add X pattern for deadly floors
                if (obj.type === 'deadly-floor') {
                    this.ctx.strokeStyle = '#fff';
                    this.ctx.lineWidth = 2;
                    this.ctx.beginPath();
                    this.ctx.moveTo(obj.x, obj.y);
                    this.ctx.lineTo(obj.x + obj.width, obj.y + obj.height);
                    this.ctx.moveTo(obj.x + obj.width, obj.y);
                    this.ctx.lineTo(obj.x, obj.y + obj.height);
                    this.ctx.stroke();
                }
                break;
                
            case 'spike':
                this.drawSpikes(obj);
                break;
                
            case 'ladder':
                this.drawLadder(obj);
                break;
                
            case 'start-position':
                this.drawStartPosition(obj);
                break;
                
            case 'end-flag':
                this.drawEndFlag(obj);
                break;
                
            case 'checkpoint':
                this.drawCheckpoint(obj);
                break;
        }
        
        // Draw border
        if (obj.type !== 'spike' && obj.type !== 'start-position' && obj.type !== 'end-flag' && obj.type !== 'checkpoint' && obj.type !== 'ladder') {
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        }
        
        // Restore context
        this.ctx.restore();
    }
    
    drawSpikes(obj) {
        this.ctx.fillStyle = obj.color;
        const numSpikes = obj.spikeCount || 5;
        const spikeSize = obj.spikeSize || 30;
        
        for (let i = 0; i < numSpikes; i++) {
            const x = obj.x + i * spikeSize;
            this.ctx.beginPath();
            this.ctx.moveTo(x, obj.y + spikeSize);
            this.ctx.lineTo(x + spikeSize / 2, obj.y);
            this.ctx.lineTo(x + spikeSize, obj.y + spikeSize);
            this.ctx.closePath();
            this.ctx.fill();
        }
        
        // Draw border around spike area
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(obj.x, obj.y, numSpikes * spikeSize, spikeSize);
    }
    
    drawStartPosition(obj) {
        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        const radius = obj.width / 2;
        
        // Draw green circle
        this.ctx.fillStyle = obj.color;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw "S" for Start
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('S', centerX, centerY);
        
        // Draw border
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    drawLadder(obj) {
        const width = obj.width;
        const height = obj.height;
        const railWidth = Math.max(5, width * 0.15); // Side rails
        const rungSpacing = 20; // Space between rungs
        const rungHeight = 3;
        
        // Draw left rail
        this.ctx.fillStyle = obj.color;
        this.ctx.fillRect(obj.x, obj.y, railWidth, height);
        
        // Draw right rail
        this.ctx.fillRect(obj.x + width - railWidth, obj.y, railWidth, height);
        
        // Draw rungs
        const numRungs = Math.floor(height / rungSpacing);
        for (let i = 0; i <= numRungs; i++) {
            const rungY = obj.y + i * rungSpacing;
            if (rungY + rungHeight <= obj.y + height) {
                this.ctx.fillRect(obj.x, rungY, width, rungHeight);
            }
        }
        
        // Draw border
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(obj.x, obj.y, width, height);
    }
    
    drawEndFlag(obj) {
        const poleX = obj.x + 5;
        const poleY = obj.y;
        const poleHeight = obj.height;
        const flagWidth = obj.width - 10;
        const flagHeight = 30;
        
        // Draw pole
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(poleX, poleY, 5, poleHeight);
        
        // Draw flag
        this.ctx.fillStyle = obj.color;
        this.ctx.beginPath();
        this.ctx.moveTo(poleX + 5, poleY + 5);
        this.ctx.lineTo(poleX + 5 + flagWidth, poleY + 5 + flagHeight / 2);
        this.ctx.lineTo(poleX + 5, poleY + 5 + flagHeight);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Draw flag border
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(poleX + 5, poleY + 5);
        this.ctx.lineTo(poleX + 5 + flagWidth, poleY + 5 + flagHeight / 2);
        this.ctx.lineTo(poleX + 5, poleY + 5 + flagHeight);
        this.ctx.closePath();
        this.ctx.stroke();
        
        // Draw "END" text
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('END', poleX + 5 + flagWidth / 2, poleY + 5 + flagHeight / 2);
    }
    
    drawCheckpoint(obj) {
        const poleX = obj.x + obj.width / 2 - 2;
        const poleY = obj.y;
        const poleHeight = obj.height;
        
        // Draw pole
        this.ctx.fillStyle = '#808080';
        this.ctx.fillRect(poleX, poleY, 4, poleHeight);
        
        // Draw flag (gray/inactive)
        const flagWidth = obj.width * 0.6;
        const flagHeight = obj.height * 0.4;
        const flagY = obj.y + obj.height * 0.2;
        
        this.ctx.fillStyle = obj.color || '#aaaaaa';
        this.ctx.fillRect(poleX + 4, flagY, flagWidth, flagHeight);
        
        // Draw flag border
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(poleX + 4, flagY, flagWidth, flagHeight);
        
        // Draw "CP" text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('CP', obj.x + obj.width / 2, obj.y + obj.height / 2);
    }
    
    exportMap() {
        const mapData = {
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            objects: this.objects
        };
        
        const dataStr = JSON.stringify(mapData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = 'map_' + Date.now() + '.json';
        link.click();
        
        URL.revokeObjectURL(url);
        
        console.log('Map exported:', mapData);
    }
    
    importMap(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const mapData = JSON.parse(e.target.result);
                this.objects = mapData.objects || [];
                this.worldWidth = mapData.worldWidth || 2400;
                this.worldHeight = mapData.worldHeight || 600;
                this.canvas.width = this.worldWidth;
                this.canvas.height = this.worldHeight;
                this.autoSave();
                this.render();
                console.log('Map imported:', mapData);
            } catch (error) {
                alert('Error importing map: ' + error.message);
            }
        };
        reader.readAsText(file);
    }
    
    setupAutoSave() {
        // Auto-save every 5 seconds
        this.autoSaveInterval = setInterval(() => {
            this.autoSave();
        }, 5000);
        
        // Also save before page unload
        window.addEventListener('beforeunload', () => {
            this.autoSave();
        });
    }
    
    autoSave() {
        this.saveToLocalStorage();
        this.lastSaveTime = Date.now();
        console.log('Auto-saved at', new Date().toLocaleTimeString());
    }
    
    saveToLocalStorage() {
        const mapData = {
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,
            objects: this.objects
        };

        localStorage.setItem('customMap', JSON.stringify(mapData));
        localStorage.setItem('editorAutoSave', JSON.stringify(mapData));
    }
    
    loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('editorAutoSave');
            if (savedData) {
                const mapData = JSON.parse(savedData);
                this.objects = mapData.objects || [];
                this.worldWidth = mapData.worldWidth || 2400;
                this.worldHeight = mapData.worldHeight || 600;
                this.canvas.width = this.worldWidth;
                this.canvas.height = this.worldHeight;
                console.log('Loaded saved map from localStorage');
            }
        } catch (error) {
            console.error('Error loading from localStorage:', error);
        }
    }
    
    openPreview() {
        // Save current map to localStorage before preview
        this.saveToLocalStorage();
        
        // Show preview modal
        const modal = document.getElementById('previewModal');
        const iframe = document.getElementById('previewFrame');
        
        // Load the game in the iframe
        iframe.src = '../load-custom-map.html';
        modal.classList.add('active');
        
        console.log('Preview mode opened');
    }
    
    closePreview() {
        const modal = document.getElementById('previewModal');
        const iframe = document.getElementById('previewFrame');
        
        // Clear iframe
        iframe.src = 'about:blank';
        modal.classList.remove('active');
        
        console.log('Preview mode closed');
    }
}

// Initialize editor
const editor = new MapEditor();
