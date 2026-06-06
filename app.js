/**
 * MemeStudioPro - High-Performance Meme Generation Engine
 * Architectural Design: Object-Oriented Vanilla JavaScript (ES6+)
 * Authors: SPY-E & 123Tool
 * Date: 2026
 */

class MemeStudio {
    constructor() {
        this.initializeDOMReferences();
        this.setupState();
        this.registerGlobalEvents();
        this.loadDefaultTemplates();
        this.render();
    }

    initializeDOMReferences() {
        this.canvas = document.getElementById('memeCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.imageLoader = document.getElementById('imageLoader');
        this.templateGrid = document.getElementById('templateGrid');
        this.layersContainer = document.getElementById('layersContainer');
        this.btnAddText = document.getElementById('btnAddText');
        this.btnDownload = document.getElementById('btnDownload');
        this.btnReset = document.getElementById('btnReset');
        this.toggleWatermark = document.getElementById('toggleWatermark');
        
        // Tab system elements
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');

        // Filter Elements
        this.filters = {
            brightness: document.getElementById('filter-brightness'),
            contrast: document.getElementById('filter-contrast'),
            grayscale: document.getElementById('filter-grayscale'),
            sepia: document.getElementById('filter-sepia')
        };
    }

    setupState() {
        this.state = {
            baseImage: null,
            textLayers: [],
            selectedLayerIndex: null,
            isDragging: false,
            draggedLayerIndex: null,
            dragStartX: 0,
            dragStartY: 0,
            stockTemplates: [
                { name: 'Drake Hotline', url: 'https://api.memegen.link/images/drake.png' },
                { name: 'Distracted Boyfriend', url: 'https://api.memegen.link/images/away.png' },
                { name: 'Two Buttons', url: 'https://api.memegen.link/images/buttons.png' },
                { name: 'Change My Mind', url: 'https://api.memegen.link/images/cmm.png' },
                { name: 'Clown Outfit', url: 'https://api.memegen.link/images/clown.png' },
                { name: 'Left Exit 12 Off Ramp', url: 'https://api.memegen.link/images/exit.png' }
            ]
        };
    }

    registerGlobalEvents() {
        // Core Actions
        this.imageLoader.addEventListener('change', (e) => this.handleCustomImageUpload(e));
        this.btnAddText.addEventListener('click', () => this.addNewTextLayer());
        this.btnDownload.addEventListener('click', () => this.exportHighDefinitionMeme());
        this.btnReset.addEventListener('click', () => this.resetWorkspaceToDefault());
        this.toggleWatermark.addEventListener('change', () => this.render());

        // Dynamic Native Canvas Mouse Tracking for Drag/Drop
        this.canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleCanvasMouseUp());
        this.canvas.addEventListener('mouseout', () => this.handleCanvasMouseUp());

        // Mobile Touch Support
        this.canvas.addEventListener('touchstart', (e) => this.handleCanvasTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleCanvasTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', () => this.handleCanvasMouseUp());

        // Connect Filters real-time event listeners
        Object.values(this.filters).forEach(input => {
            input.addEventListener('input', () => this.render());
        });

        // Modular Tab Switching Logic
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.tabButtons.forEach(b => b.classList.remove('active'));
                this.tabContents.forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            });
        });
    }

    loadDefaultTemplates() {
        this.templateGrid.innerHTML = '';
        this.state.stockTemplates.forEach(tpl => {
            const img = document.createElement('img');
            img.src = tpl.url;
            img.alt = tpl.name;
            img.className = 'template-thumb';
            img.crossOrigin = 'anonymous'; // Prevent tainted canvas issues
            img.addEventListener('click', () => this.loadSourceImageFromUrl(tpl.url));
            this.templateGrid.appendChild(img);
        });
        
        // Initialize with first template seamlessly
        this.loadSourceImageFromUrl(this.state.stockTemplates[0].url);
    }

    loadSourceImageFromUrl(url) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = url;
        img.onload = () => {
            this.state.baseImage = img;
            this.resetWorkspaceToDefault(false); // keep image but normalize parameters
            this.render();
        };
    }

    handleCustomImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                this.state.baseImage = img;
                this.resetWorkspaceToDefault(false);
                this.render();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }

    addNewTextLayer(initialText = "Tap to Edit Text") {
        // Defaults to optimized center layout metrics
        const newLayer = {
            text: initialText,
            fontSize: 48,
            fontFamily: 'Impact',
            fillColor: '#FFFFFF',
            strokeColor: '#000000',
            x: this.canvas.width / 2,
            y: this.canvas.height / 2 + (this.state.textLayers.length * 60),
            width: 200, // Calculated dynamic during context operations
            height: 50
        };

        this.state.textLayers.push(newLayer);
        this.state.selectedLayerIndex = this.state.textLayers.length - 1;
        
        this.rebuildLayersUI();
        this.render();
    }

    rebuildLayersUI() {
        this.layersContainer.innerHTML = '';
        
        if (this.state.textLayers.length === 0) {
            this.layersContainer.innerHTML = `<p style="color: var(--text-muted); font-size:0.85rem; text-align:center; padding:1rem;">No text layers yet. Click add to begin.</p>`;
            return;
        }

        this.state.textLayers.forEach((layer, index) => {
            const card = document.createElement('div');
            card.className = `layer-card ${this.state.selectedLayerIndex === index ? 'active-layer' : ''}`;
            card.setAttribute('data-index', index);
            
            card.innerHTML = `
                <div class="layer-header">
                    <span class="layer-title">Layer #${index + 1} (${layer.fontFamily})</span>
                    <button class="btn btn-danger btn-layer-delete" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"><i class="fa-solid fa-trash"></i></button>
                </div>
                <input type="text" class="layer-input txt-val" value="${layer.text}">
                <div class="layer-properties">
                    <select class="prop-select font-fam">
                        <option value="Impact" ${layer.fontFamily === 'Impact' ? 'selected' : ''}>Impact</option>
                        <option value="Arial" ${layer.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
                        <option value="Montserrat" ${layer.fontFamily === 'Montserrat' ? 'selected' : ''}>Montserrat</option>
                        <option value="Oswald" ${layer.fontFamily === 'Oswald' ? 'selected' : ''}>Oswald</option>
                    </select>
                    <input type="number" class="prop-input size-val" value="${layer.fontSize}" min="12" max="144">
                    <div style="display:flex; gap:0.25rem;">
                        <div class="color-picker-wrapper">
                            <input type="color" class="prop-color fill-col" value="${layer.fillColor}">
                        </div>
                        <div class="color-picker-wrapper">
                            <input type="color" class="prop-color stroke-col" value="${layer.strokeColor}">
                        </div>
                    </div>
                </div>
            `;

            // Active State Selection Capture
            card.addEventListener('click', (e) => {
                if(!e.target.closest('.btn-layer-delete') && !e.target.closest('input') && !e.target.closest('select')) {
                    this.state.selectedLayerIndex = index;
                    this.rebuildLayersUI();
                    this.render();
                }
            });

            // Input Mutations Bindings
            card.querySelector('.txt-val').addEventListener('input', (e) => { layer.text = e.target.value; this.render(); });
            card.querySelector('.font-fam').addEventListener('change', (e) => { layer.fontFamily = e.target.value; this.render(); });
            card.querySelector('.size-val').addEventListener('input', (e) => { layer.fontSize = parseInt(e.target.value) || 24; this.render(); });
            card.querySelector('.fill-col').addEventListener('input', (e) => { layer.fillColor = e.target.value; this.render(); });
            card.querySelector('.stroke-col').addEventListener('input', (e) => { layer.strokeColor = e.target.value; this.render(); });
            
            card.querySelector('.btn-layer-delete').addEventListener('click', () => {
                this.state.textLayers.splice(index, 1);
                this.state.selectedLayerIndex = this.state.textLayers.length > 0 ? 0 : null;
                this.rebuildLayersUI();
                this.render();
            });

            this.layersContainer.appendChild(card);
        });
    }

    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        // Calculate coordinate mapping scaling perfectly based on canvas system matrix bounds
        const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
        return { x, y };
    }

    handleCanvasMouseDown(e) {
        const coords = this.getCanvasCoordinates(e);
        this.processSelectionCheck(coords.x, coords.y);
    }

    handleCanvasTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const coords = this.getCanvasCoordinates(touch);
            this.processSelectionCheck(coords.x, coords.y);
            e.preventDefault();
        }
    }

    processSelectionCheck(clickX, clickY) {
        // Traverse back-to-front so top layers are prioritized
        for (let i = this.state.textLayers.length - 1; i >= 0; i--) {
            const layer = this.state.textLayers[i];
            
            // Refined Boundary Detection Check box area
            const halfWidth = layer.width / 2;
            const isInsideX = clickX >= (layer.x - halfWidth - 20) && clickX <= (layer.x + halfWidth + 20);
            const isInsideY = clickY >= (layer.y - layer.height) && clickY <= (layer.y + 10);

            if (isInsideX && isInsideY) {
                this.state.isDragging = true;
                this.state.draggedLayerIndex = i;
                this.state.selectedLayerIndex = i;
                this.state.dragStartX = clickX - layer.x;
                this.state.dragStartY = clickY - layer.y;
                this.rebuildLayersUI();
                return;
            }
        }
        
        // De-select layer if clicking on empty area
        this.state.selectedLayerIndex = null;
        this.rebuildLayersUI();
    }

    handleCanvasMouseMove(e) {
        if (!this.state.isDragging || this.state.draggedLayerIndex === null) return;
        const coords = this.getCanvasCoordinates(e);
        this.executeDragUpdate(coords.x, coords.y);
    }

    handleCanvasTouchMove(e) {
        if (!this.state.isDragging || this.state.draggedLayerIndex === null) return;
        const touch = e.touches[0];
        const coords = this.getCanvasCoordinates(touch);
        this.executeDragUpdate(coords.x, coords.y);
        e.preventDefault();
    }

    executeDragUpdate(currentX, currentY) {
        const layer = this.state.textLayers[this.state.draggedLayerIndex];
        layer.x = currentX - this.state.dragStartX;
        layer.y = currentY - this.state.dragStartY;
        this.render();
    }

    handleCanvasMouseUp() {
        this.state.isDragging = false;
        this.state.draggedLayerIndex = null;
    }

    applyImageFilters() {
        const b = this.filters.brightness.value;
        const c = this.filters.contrast.value;
        const g = this.filters.grayscale.value;
        const s = this.filters.sepia.value;
        this.ctx.filter = `brightness(${b}%) contrast(${c}%) grayscale(${g}%) sepia(${s}%)`;
    }

    render() {
        // 1. Context Clean
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.filter = 'none'; // reset filter architecture

        // 2. Render Core Image Asset Base
        if (this.state.baseImage) {
            this.applyImageFilters();
            
            // Dynamic Cover/Contain Custom scaling
            const imgRatio = this.state.baseImage.width / this.state.baseImage.height;
            let drawWidth = this.canvas.width;
            let drawHeight = this.canvas.height;
            let drawX = 0;
            let drawY = 0;

            if (imgRatio > 1) {
                drawHeight = this.canvas.width / imgRatio;
                drawY = (this.canvas.height - drawHeight) / 2;
            } else {
                drawWidth = this.canvas.height * imgRatio;
                drawX = (this.canvas.width - drawWidth) / 2;
            }

            this.ctx.drawImage(this.state.baseImage, drawX, drawY, drawWidth, drawHeight);
            this.ctx.filter = 'none'; // Drop immediately after render so layers pass unaffected
        } else {
            // Placeholder frame state
            this.ctx.fillStyle = '#111420';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // 3. Render Custom Modular Text Layers Typography
        this.state.textLayers.forEach((layer, index) => {
            this.ctx.font = `bold ${layer.fontSize}px ${layer.fontFamily}`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'alphabetic';

            // Measure accurate text bounding container dimensions dynamically
            const metrics = this.ctx.measureText(layer.text);
            layer.width = metrics.width;
            layer.height = layer.fontSize;

            // Paint Outline Stroke
            this.ctx.strokeStyle = layer.strokeColor;
            this.ctx.lineWidth = Math.max(4, layer.fontSize / 8);
            this.ctx.lineJoin = 'round';
            this.ctx.strokeText(layer.text, layer.x, layer.y);

            // Paint Main Core Fill Type
            this.ctx.fillStyle = layer.fillColor;
            this.ctx.fillText(layer.text, layer.x, layer.y);

            // Conditional Border Overlay UI if Layer is selected by administrator
            if (this.state.selectedLayerIndex === index) {
                this.ctx.save();
                this.ctx.strokeStyle = '#3b82f6';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([6, 4]);
                // Drawing dynamic box
                const padW = 20;
                const padH = 10;
                this.ctx.strokeRect(
                    layer.x - (layer.width / 2) - padW, 
                    layer.y - layer.height, 
                    layer.width + (padW * 2), 
                    layer.height + padH
                );
                this.ctx.restore();
            }
        });

        // 4. Global Security / Studio Brand Watermark System Layer
        if (this.toggleWatermark.checked) {
            this.ctx.save();
            this.ctx.font = '500 14px Inter, sans-serif';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.textAlign = 'right';
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 4;
            this.ctx.fillText('MemeStudioPro • SPY-E & 123Tool', this.canvas.width - 20, this.canvas.height - 20);
            this.ctx.restore();
        }
    }

    resetWorkspaceToDefault(clearImage = true) {
        if (clearImage) this.state.baseImage = null;
        this.state.textLayers = [];
        this.state.selectedLayerIndex = null;
        
        // Reset Filter parameters
        this.filters.brightness.value = 100;
        this.filters.contrast.value = 100;
        this.filters.grayscale.value = 0;
        this.filters.sepia.value = 0;

        // Auto seed two standard template baseline layers
        this.addNewTextLayer("TOP CAPTION CONTEXT");
        // Adjust the position of the second layer automatically to the bottom
        this.state.textLayers[0].y = 80; 
        
        this.addNewTextLayer("BOTTOM CAPTION TEXT");
        this.state.textLayers[1].y = this.canvas.height - 60;

        this.state.selectedLayerIndex = null;
        this.rebuildLayersUI();
        this.render();
    }

    exportHighDefinitionMeme() {
        // Temporarily clear systemic UI selections bounding boxes to ensure clean render output
        const currentActiveIndex = this.state.selectedLayerIndex;
        this.state.selectedLayerIndex = null;
        this.render();

        try {
            const dataUrl = this.canvas.toDataURL('image/png', 1.0);
            const downloadLink = document.createElement('a');
            downloadLink.download = `MemeStudioPro_${Date.now()}.png`;
            downloadLink.href = dataUrl;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        } catch (error) {
            alert("Export error: Ensure you are using clean local assets or cors enabled servers.");
            console.error(error);
        }

        // Restore past system states seamlessly
        this.state.selectedLayerIndex = currentActiveIndex;
        this.render();
    }
}

// Instantiate Premium App Module Thread On System Content Dom Loads
document.addEventListener('DOMContentLoaded', () => {
    window.MemeStudioEngine = new MemeStudio();
});
