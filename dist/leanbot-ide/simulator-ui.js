/**
 * Leanbot 2D Robot Simulator UI for Static HTML
 * Handles simulator modal interactions with board rendering and mouse control
 */

// Board configurations
const BOARD_CONFIGS = {
  synapse: {"name": "Synapse City — 4 ft × 4 ft", "width": 1219.2, "height": 1219.2, "backgroundImage": "/simulator/synapse-city.svg", "walls": [], "obstacles": [], "lines": [], "tracks": [{"id": "synapse-0", "points": [{"x": 84.6, "y": 209.044439}, {"x": 85.196583, "y": 196.846755}, {"x": 86.980588, "y": 184.766534}, {"x": 89.934825, "y": 172.920124}, {"x": 94.030851, "y": 161.421617}, {"x": 99.229222, "y": 150.381737}, {"x": 105.479872, "y": 139.906815}, {"x": 112.7226, "y": 130.097721}, {"x": 120.887654, "y": 121.048932}, {"x": 129.896404, "y": 112.847589}, {"x": 139.662095, "y": 105.572671}, {"x": 150.090667, "y": 99.294241}, {"x": 161.081698, "y": 94.072766}, {"x": 172.529327, "y": 89.958535}, {"x": 184.323319, "y": 86.991168}, {"x": 196.350088, "y": 85.199234}, {"x": 208.4938, "y": 84.6}, {"x": 1010.155561, "y": 84.6}, {"x": 1022.353245, "y": 85.199234}, {"x": 1034.433467, "y": 86.991168}, {"x": 1046.279876, "y": 89.958535}, {"x": 1057.778384, "y": 94.072766}, {"x": 1068.818263, "y": 99.294241}, {"x": 1079.293184, "y": 105.572671}, {"x": 1089.102278, "y": 112.847589}, {"x": 1098.151068, "y": 121.048932}, {"x": 1106.35241, "y": 130.097721}, {"x": 1113.627328, "y": 139.906815}, {"x": 1119.905759, "y": 150.381737}, {"x": 1125.127234, "y": 161.421617}, {"x": 1129.241465, "y": 172.920124}, {"x": 1132.208831, "y": 184.766534}, {"x": 1134.000766, "y": 196.846755}, {"x": 1134.6, "y": 209.044439}, {"x": 1134.6, "y": 1010.7062}, {"x": 1134.000766, "y": 1022.849912}, {"x": 1132.208831, "y": 1034.876682}, {"x": 1129.241465, "y": 1046.670673}, {"x": 1125.127234, "y": 1058.118303}, {"x": 1119.905759, "y": 1069.109333}, {"x": 1113.627328, "y": 1079.537904}, {"x": 1106.35241, "y": 1089.303595}, {"x": 1098.151068, "y": 1098.312346}, {"x": 1089.102278, "y": 1106.477399}, {"x": 1079.293184, "y": 1113.720127}, {"x": 1068.818263, "y": 1119.970778}, {"x": 1057.778384, "y": 1125.169149}, {"x": 1046.279876, "y": 1129.265175}, {"x": 1034.433467, "y": 1132.219411}, {"x": 1022.353245, "y": 1134.003417}, {"x": 1010.155561, "y": 1134.6}, {"x": 208.4938, "y": 1134.6}, {"x": 196.350088, "y": 1134.003417}, {"x": 184.323319, "y": 1132.219411}, {"x": 172.529327, "y": 1129.265175}, {"x": 161.081698, "y": 1125.169149}, {"x": 150.090667, "y": 1119.970778}, {"x": 139.662095, "y": 1113.720127}, {"x": 129.896404, "y": 1106.477399}, {"x": 120.887654, "y": 1098.312346}, {"x": 112.7226, "y": 1089.303595}, {"x": 105.479872, "y": 1079.537904}, {"x": 99.229222, "y": 1069.109333}, {"x": 94.030851, "y": 1058.118303}, {"x": 89.934825, "y": 1046.670673}, {"x": 86.980588, "y": 1034.876682}, {"x": 85.196583, "y": 1022.849912}, {"x": 84.6, "y": 1010.7062}, {"x": 84.6, "y": 209.044439}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-1", "points": [{"x": 434.6, "y": 84.6}, {"x": 434.6, "y": 1134.6}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-2", "points": [{"x": 784.6, "y": 84.6}, {"x": 784.6, "y": 1134.6}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-3", "points": [{"x": 84.6, "y": 434.6}, {"x": 1134.6, "y": 434.6}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-4", "points": [{"x": 84.6, "y": 784.6}, {"x": 1134.6, "y": 784.6}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-5", "points": [{"x": 264.246013, "y": 84.6}, {"x": 264.246013, "y": 118.822227}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-6", "points": [{"x": 264.246013, "y": 408.155555}, {"x": 264.246013, "y": 460.170776}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-7", "points": [{"x": 264.246013, "y": 757.431055}, {"x": 264.246013, "y": 809.378765}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-8", "points": [{"x": 264.246013, "y": 1098.980533}, {"x": 264.246013, "y": 1134.6}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-9", "points": [{"x": 608.800913, "y": 84.6}, {"x": 608.800913, "y": 118.822227}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-10", "points": [{"x": 608.800913, "y": 408.155555}, {"x": 608.800913, "y": 460.170776}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-11", "points": [{"x": 608.800913, "y": 757.431055}, {"x": 608.800913, "y": 809.378765}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-12", "points": [{"x": 608.800913, "y": 1098.980533}, {"x": 608.800913, "y": 1134.6}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-13", "points": [{"x": 954.15556, "y": 84.6}, {"x": 954.15556, "y": 118.822227}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-14", "points": [{"x": 954.15556, "y": 408.155555}, {"x": 954.15556, "y": 460.170776}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-15", "points": [{"x": 954.15556, "y": 757.431055}, {"x": 954.15556, "y": 809.378765}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-16", "points": [{"x": 954.15556, "y": 1098.980533}, {"x": 954.15556, "y": 1134.6}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-17", "points": [{"x": 84.6, "y": 263.488891}, {"x": 118.670801, "y": 263.488891}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-18", "points": [{"x": 409.821236, "y": 263.488891}, {"x": 458.572602, "y": 263.488891}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-19", "points": [{"x": 759.029225, "y": 263.488891}, {"x": 807.933337, "y": 263.488891}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-20", "points": [{"x": 1100.377773, "y": 263.488891}, {"x": 1134.6, "y": 263.488891}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-21", "points": [{"x": 84.6, "y": 610.399087}, {"x": 118.670801, "y": 610.399087}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-22", "points": [{"x": 409.821236, "y": 610.399087}, {"x": 458.572602, "y": 610.399087}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-23", "points": [{"x": 759.029225, "y": 610.399087}, {"x": 807.933337, "y": 610.399087}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-24", "points": [{"x": 1100.377773, "y": 610.399087}, {"x": 1134.6, "y": 610.399087}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-25", "points": [{"x": 84.6, "y": 954.953987}, {"x": 118.670801, "y": 954.953987}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-26", "points": [{"x": 409.821236, "y": 954.953987}, {"x": 458.572602, "y": 954.953987}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-27", "points": [{"x": 759.029225, "y": 954.953987}, {"x": 807.933337, "y": 954.953987}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-28", "points": [{"x": 1100.377773, "y": 954.953987}, {"x": 1134.6, "y": 954.953987}], "width": 16.89068010075567, "color": "#000000"}], "initialPose": {"x": 264.244087, "y": 84.6, "heading": 0}, "citySideMm": 350},
  'simple': {
    name: '📍 Simple Line Following',
    width: 1500,
    height: 1000,
    walls: [
      { x: 0, y: 0, w: 1500, h: 30 },
      { x: 0, y: 970, w: 1500, h: 30 },
      { x: 0, y: 0, w: 30, h: 1000 },
      { x: 1470, y: 0, w: 30, h: 1000 }
    ],
    obstacles: [],
    lines: [{ x: 0, y: 500, w: 1500, h: 30 }]
  },
  'maze': {
    name: '📍 AIROC 2026 - Maze',
    width: 2000,
    height: 2000,
    walls: [
      { x: 0, y: 0, w: 2000, h: 50 },
      { x: 0, y: 1950, w: 2000, h: 50 },
      { x: 0, y: 0, w: 50, h: 2000 },
      { x: 1950, y: 0, w: 50, h: 2000 }
    ],
    obstacles: [
      { x: 400, y: 300, w: 50, h: 200 },
      { x: 800, y: 500, w: 200, h: 50 },
      { x: 1200, y: 800, w: 50, h: 200 }
    ],
    lines: []
  },
  'delivery': {
    name: '📍 AIROC 2026 - Delivery',
    width: 2400,
    height: 1800,
    walls: [
      { x: 0, y: 0, w: 2400, h: 50 },
      { x: 0, y: 1750, w: 2400, h: 50 },
      { x: 0, y: 0, w: 50, h: 1800 },
      { x: 2350, y: 0, w: 50, h: 1800 }
    ],
    obstacles: [
      { x: 500, y: 400, w: 100, h: 100 },
      { x: 1200, y: 600, w: 150, h: 80 }
    ],
    lines: []
  },
  'obstacle': {
    name: '📍 Obstacle Avoidance',
    width: 2000,
    height: 1500,
    walls: [
      { x: 0, y: 0, w: 2000, h: 50 },
      { x: 0, y: 1450, w: 2000, h: 50 },
      { x: 0, y: 0, w: 50, h: 1500 },
      { x: 1950, y: 0, w: 50, h: 1500 }
    ],
    obstacles: [
      { x: 600, y: 400, w: 80, h: 80 },
      { x: 1200, y: 700, w: 100, h: 60 },
      { x: 900, y: 1000, w: 60, h: 100 }
    ],
    lines: []
  }
};

class LeanbotSimulator2D {
  constructor() {
    this.modal = document.getElementById('simulatorModal');
    this.canvas = document.getElementById('simulatorCanvas');
    this.loadingDiv = document.getElementById('simulatorLoading');
    this.isRunning = false;
    this.isPaused = false;
    this.animationId = null;
    
    // Board state
    this.currentBoard = BOARD_CONFIGS.synapse;
    this.pixelsPerMM = 0.3;
    this.offsetX = 50;
    this.offsetY = 50;
    
    // Robot state
    this.robotX = this.currentBoard.initialPose.x; // Center of board
    this.robotY = this.currentBoard.initialPose.y;
    this.robotHeading = 0;
    this.robotRadius = 60; // conservative footprint radius, mm
    this.boardImage = new Image();
    this.boardImage.onload = () => this.render();
    this.boardImage.src = this.currentBoard.backgroundImage;
    this.speedL = 0;
    this.speedR = 0;
    this.time = 0;
    this.frameCount = 0;
    
    // Mouse drag state
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    
    // Canvas setup
    this.setupCanvas();
    this.setupEventListeners();
    this.drawInitial();
  }

  setupCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    
    // Adjust pixelsPerMM to fit board in canvas
    const maxWidth = this.canvas.width - 100;
    const maxHeight = this.canvas.height - 100;
    const scaleX = maxWidth / this.currentBoard.width;
    const scaleY = maxHeight / this.currentBoard.height;
    this.pixelsPerMM = Math.min(scaleX, scaleY, 0.5);
    
    this.offsetX = (this.canvas.width - this.currentBoard.width * this.pixelsPerMM) / 2;
    this.offsetY = (this.canvas.height - this.currentBoard.height * this.pixelsPerMM) / 2;

    // Get canvas context
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      console.error('Could not get canvas context');
      return;
    }
    
    console.log('Canvas:', this.canvas.width, 'x', this.canvas.height, 'Scale:', this.pixelsPerMM);
  }

  setupEventListeners() {
    // Buttons
    document.getElementById('btnSimulator').addEventListener('click', () => this.show());
    document.getElementById('btnCloseSimulator').addEventListener('click', () => this.hide());
    
    document.getElementById('simStart').addEventListener('click', () => this.start());
    document.getElementById('simPause').addEventListener('click', () => this.togglePause());
    document.getElementById('simStop').addEventListener('click', () => this.stop());
    document.getElementById('simReset').addEventListener('click', () => this.reset());

    document.getElementById('simRobotHeading').addEventListener('input', (e) => {
      if (e.target.value !== '') this.setHeading(Number(e.target.value));
    });
    document.getElementById('simRotateLeft').addEventListener('click', () => this.setHeading(this.robotHeading - 15));
    document.getElementById('simRotateRight').addEventListener('click', () => this.setHeading(this.robotHeading + 15));

    // Board selection
    document.getElementById('simBoard').addEventListener('change', (e) => {
      const selectedKey = e.target.value;
      this.currentBoard = BOARD_CONFIGS[selectedKey];
      this.stop();
      if (this.currentBoard.backgroundImage) this.boardImage.src = this.currentBoard.backgroundImage;
      this.setupCanvas();
      this.resetRobot();
      this.addLog(`📍 Board changed to: ${e.target.options[e.target.selectedIndex].text}`);
      this.render();
    });

    // Options
    document.getElementById('simGrid').addEventListener('change', () => this.render());
    document.getElementById('simTrajectory').addEventListener('change', () => this.render());
    document.getElementById('simSensorDebug').addEventListener('change', () => this.render());

    // Canvas mouse events for dragging robot
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp());

    // Close on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.classList.contains('is-hidden')) {
        this.hide();
      }
    });
  }

  setHeading(heading) {
    if (this.isRunning || !Number.isFinite(heading)) return;
    this.robotHeading = ((heading % 360) + 360) % 360;
    document.getElementById('simRobotHeading').value = this.robotHeading;
    this.updateStats();
    this.render();
  }

  onMouseDown(e) {
    if (this.isRunning) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if clicking on robot
    const robotPixelX = this.offsetX + this.robotX * this.pixelsPerMM;
    const robotPixelY = this.offsetY + this.robotY * this.pixelsPerMM;
    const dist = Math.sqrt((mouseX - robotPixelX) ** 2 + (mouseY - robotPixelY) ** 2);
    
    if (dist < this.robotRadius * this.pixelsPerMM + 10) {
      this.isDragging = true;
      this.dragOffsetX = mouseX - robotPixelX;
      this.dragOffsetY = mouseY - robotPixelY;
      this.canvas.style.cursor = 'grabbing';
    }
  }

  onMouseMove(e) {
    if (!this.isDragging || this.isRunning) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Update robot position
    this.robotX = (mouseX - this.dragOffsetX - this.offsetX) / this.pixelsPerMM;
    this.robotY = (mouseY - this.dragOffsetY - this.offsetY) / this.pixelsPerMM;
    
    // Clamp to board
    this.robotX = Math.max(this.robotRadius, Math.min(this.robotX, this.currentBoard.width - this.robotRadius));
    this.robotY = Math.max(this.robotRadius, Math.min(this.robotY, this.currentBoard.height - this.robotRadius));
    
    this.updateStats();
    this.render();
  }

  onMouseUp() {
    this.isDragging = false;
    this.canvas.style.cursor = 'default';
  }

  drawInitial() {
    if (this.loadingDiv) {
      this.loadingDiv.style.display = 'none';
    }
    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.render();
  }

  drawBoard() {
    // Draw board background
    const boardPixelW = this.currentBoard.width * this.pixelsPerMM;
    const boardPixelH = this.currentBoard.height * this.pixelsPerMM;
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(this.offsetX, this.offsetY, boardPixelW, boardPixelH);
    
    // Draw board border
    this.ctx.strokeStyle = '#cccccc';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(this.offsetX, this.offsetY, boardPixelW, boardPixelH);
    
    if (this.currentBoard.backgroundImage && this.boardImage.complete && this.boardImage.naturalWidth) {
      this.ctx.drawImage(this.boardImage, this.offsetX, this.offsetY, boardPixelW, boardPixelH);
      return;
    }

    // Draw grid if enabled
    if (document.getElementById('simGrid').checked) {
      this.drawGrid();
    }
    
    // Draw walls
    this.ctx.fillStyle = '#333333';
    for (const wall of this.currentBoard.walls) {
      const x = this.offsetX + wall.x * this.pixelsPerMM;
      const y = this.offsetY + wall.y * this.pixelsPerMM;
      const w = wall.w * this.pixelsPerMM;
      const h = wall.h * this.pixelsPerMM;
      this.ctx.fillRect(x, y, w, h);
    }
    
    // Draw obstacles
    this.ctx.fillStyle = '#666666';
    for (const obs of this.currentBoard.obstacles) {
      const x = this.offsetX + obs.x * this.pixelsPerMM;
      const y = this.offsetY + obs.y * this.pixelsPerMM;
      const w = obs.w * this.pixelsPerMM;
      const h = obs.h * this.pixelsPerMM;
      this.ctx.fillRect(x, y, w, h);
    }
    
    // Draw lines
    this.ctx.fillStyle = '#ffcc00';
    for (const line of this.currentBoard.lines) {
      const x = this.offsetX + line.x * this.pixelsPerMM;
      const y = this.offsetY + line.y * this.pixelsPerMM;
      const w = line.w * this.pixelsPerMM;
      const h = line.h * this.pixelsPerMM;
      this.ctx.fillRect(x, y, w, h);
    }
  }

  drawGrid() {
    this.ctx.strokeStyle = '#eeeeee';
    this.ctx.lineWidth = 0.5;
    const gridSpacing = 100 * this.pixelsPerMM; // 100mm grid
    
    const boardPixelW = this.currentBoard.width * this.pixelsPerMM;
    const boardPixelH = this.currentBoard.height * this.pixelsPerMM;
    
    // Vertical lines
    for (let i = 0; i <= this.currentBoard.width; i += 100) {
      const x = this.offsetX + i * this.pixelsPerMM;
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.offsetY);
      this.ctx.lineTo(x, this.offsetY + boardPixelH);
      this.ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 0; i <= this.currentBoard.height; i += 100) {
      const y = this.offsetY + i * this.pixelsPerMM;
      this.ctx.beginPath();
      this.ctx.moveTo(this.offsetX, y);
      this.ctx.lineTo(this.offsetX + boardPixelW, y);
      this.ctx.stroke();
    }
  }

  drawRobot() {
    // Convert world coords to canvas coords
    const pixelX = this.offsetX + this.robotX * this.pixelsPerMM;
    const pixelY = this.offsetY + this.robotY * this.pixelsPerMM;
    const headingRad = (this.robotHeading * Math.PI) / 180;
    
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(pixelX, pixelY);
    ctx.rotate(headingRad);
    ctx.scale(this.pixelsPerMM * 0.5, this.pixelsPerMM * 0.5);
    // Half-size chassis: 80 × 55 mm; full footprint about 87 × 75 mm.
    ctx.fillStyle = '#202830';
    ctx.fillRect(-35, -75, 65, 20);
    ctx.fillRect(-35, 55, 65, 20);
    ctx.fillStyle = '#d9e5e8';
    ctx.strokeStyle = '#536b77';
    ctx.lineWidth = 3;
    ctx.fillRect(-80, -55, 160, 110);
    ctx.strokeRect(-80, -55, 160, 110);
    ctx.fillStyle = '#117c91';
    ctx.fillRect(-55, -40, 90, 80);
    ctx.fillStyle = '#263b48';
    ctx.fillRect(-43, -22, 42, 44);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Leanbot', -49, 5);
    ctx.fillStyle = '#53dfbd';
    for (const y of [-28, 0, 28]) ctx.fillRect(66, y - 4, 10, 8);
    ctx.strokeStyle = '#efab39';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(55, -35); ctx.lineTo(94, -35); ctx.lineTo(94, -18);
    ctx.moveTo(55, 35); ctx.lineTo(94, 35); ctx.lineTo(94, 18);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(48, -9); ctx.lineTo(61, 0); ctx.lineTo(48, 9); ctx.fill();
    ctx.restore();
  }

  render() {
    if (!this.ctx) return;
    
    // Clear canvas
    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw board
    this.drawBoard();
    
    // Draw robot
    this.drawRobot();
    
    // Draw trajectory if enabled
    if (document.getElementById('simTrajectory').checked) {
      this.drawTrajectory();
    }
  }

  drawTrajectory() {
    if (this.time === 0) return;
    
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    
    // Simple trajectory line from start to current
    const startPixelX = this.offsetX + 750 * this.pixelsPerMM;
    const startPixelY = this.offsetY + 500 * this.pixelsPerMM;
    this.ctx.moveTo(startPixelX, startPixelY);
    
    const currentPixelX = this.offsetX + this.robotX * this.pixelsPerMM;
    const currentPixelY = this.offsetY + this.robotY * this.pixelsPerMM;
    this.ctx.lineTo(currentPixelX, currentPixelY);
    this.ctx.stroke();
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.isPaused = false;
    this.time = 0;
    this.frameCount = 0;
    this.speedL = 200;
    this.speedR = 200;
    
    // Update button states
    this.updateButtons();
    this.addLog('▶ Started simulation');
    
    // Start animation loop
    this.animate();
  }

  togglePause() {
    if (!this.isRunning) return;
    
    this.isPaused = !this.isPaused;
    this.updateButtons();
    this.addLog(this.isPaused ? '⏸ Simulation paused' : '⏵ Simulation resumed');
    
    if (!this.isPaused) {
      this.animate();
    }
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    this.speedL = 0;
    this.speedR = 0;
    this.updateButtons();
    this.render();
    this.addLog('⏹ Simulation stopped');
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.resetRobot();
    this.updateButtons();
    this.render();
    this.addLog('🔄 Simulation reset');
  }

  resetRobot() {
    this.robotX = this.currentBoard === BOARD_CONFIGS.synapse ? this.currentBoard.initialPose.x : this.currentBoard.width / 2;
    this.robotY = this.currentBoard === BOARD_CONFIGS.synapse ? this.currentBoard.initialPose.y : this.currentBoard.height / 2;
    this.robotHeading = 0;
    document.getElementById('simRobotHeading').value = 0;
    this.speedL = 0;
    this.speedR = 0;
    this.time = 0;
    this.frameCount = 0;
    this.updateStats();
  }

  animate() {
    if (!this.isRunning || this.isPaused) return;
    
    // Update time (60fps = 16.67ms per frame)
    const dt = 0.016;
    this.time += dt;
    this.frameCount++;
    
    // Simple movement simulation
    if (this.speedL > 0 || this.speedR > 0) {
      const avgSpeed = (this.speedL + this.speedR) / 2;
      const wheelBase = 75; // mm
      const omega = ((this.speedR - this.speedL) / wheelBase) * dt;
      
      const headingRad = (this.robotHeading * Math.PI) / 180;
      this.robotX += avgSpeed * Math.cos(headingRad) * dt;
      this.robotY += avgSpeed * Math.sin(headingRad) * dt;
      this.robotHeading += omega * (180 / Math.PI);
      
      // Clamp to board
      this.robotX = Math.max(this.robotRadius, 
                            Math.min(this.robotX, this.currentBoard.width - this.robotRadius));
      this.robotY = Math.max(this.robotRadius, 
                            Math.min(this.robotY, this.currentBoard.height - this.robotRadius));
    }
    
    // Stop after 3 seconds
    if (this.time >= 3.0) {
      this.stop();
      return;
    }
    
    // Update display
    this.render();
    this.updateStats();
    
    // Continue animation
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  updateStats() {
    document.getElementById('simTime').textContent = this.time.toFixed(2) + 's';
    document.getElementById('simFrames').textContent = this.frameCount;
    document.getElementById('simX').textContent = Math.round(this.robotX);
    document.getElementById('simY').textContent = Math.round(this.robotY);
    document.getElementById('simHeading').textContent = this.robotHeading.toFixed(1);
    document.getElementById('simSpeedL').textContent = Math.round(this.speedL);
    document.getElementById('simSpeedR').textContent = Math.round(this.speedR);
    const angle = this.robotHeading * Math.PI / 180;
    const sensorX = this.robotX + 37.5 * Math.cos(angle);
    const sensorY = this.robotY + 37.5 * Math.sin(angle);
    const onTrack = (this.currentBoard.tracks || []).some(line => line.points.slice(1).some((b, i) => {
      const a = line.points[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const lengthSquared = dx * dx + dy * dy;
      const t = lengthSquared ? Math.max(0, Math.min(1, ((sensorX - a.x) * dx + (sensorY - a.y) * dy) / lengthSquared)) : 0;
      return Math.hypot(sensorX - a.x - t * dx, sensorY - a.y - t * dy) <= line.width / 2;
    }));
    document.getElementById('simIR').textContent = onTrack ? '4095' : '0';
    document.getElementById('simDist').textContent = '300.0';
  }

  updateButtons() {
    for (const id of ['simRobotHeading', 'simRotateLeft', 'simRotateRight']) {
      document.getElementById(id).disabled = this.isRunning;
    }
    const startBtn = document.getElementById('simStart');
    const pauseBtn = document.getElementById('simPause');
    const stopBtn = document.getElementById('simStop');
    
    startBtn.disabled = this.isRunning;
    startBtn.style.opacity = this.isRunning ? '0.5' : '1';
    
    pauseBtn.disabled = !this.isRunning;
    pauseBtn.style.opacity = this.isRunning ? '1' : '0.5';
    pauseBtn.textContent = this.isPaused ? '⏵ Resume' : '⏸ Pause';
    
    stopBtn.disabled = !this.isRunning;
    stopBtn.style.opacity = this.isRunning ? '1' : '0.5';
  }

  addLog(message) {
    const logDiv = document.getElementById('simLogs');
    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const line = document.createElement('div');
    line.textContent = `[${time}] ${message}`;
    logDiv.appendChild(line);
    logDiv.scrollTop = logDiv.scrollHeight;
    
    // Keep only last 20 lines
    while (logDiv.children.length > 20) {
      logDiv.removeChild(logDiv.firstChild);
    }
  }

  show() {
    this.modal.classList.remove('is-hidden');
    this.setupCanvas();
    this.drawInitial();
    this.addLog('Simulator opened - drag robot to position before start');
  }

  hide() {
    this.modal.classList.add('is-hidden');
    this.stop();
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

// Initialize simulator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.leanbotSimulator = new LeanbotSimulator2D();
});

// Handle window resize
window.addEventListener('resize', () => {
  if (window.leanbotSimulator && !window.leanbotSimulator.modal.classList.contains('is-hidden')) {
    window.leanbotSimulator.setupCanvas();
    window.leanbotSimulator.render();
  }
});
