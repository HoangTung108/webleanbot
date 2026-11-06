/**
 * Leanbot 2D Robot Simulator UI for Static HTML
 * Handles simulator modal interactions with board rendering and mouse control
 */

// Board configurations
const BOARD_CONFIGS = {
  synapse: {"name": "Synapse City — 4 ft × 4 ft", "width": 1219.2, "height": 1219.2, "backgroundImage": "/simulator/synapse-city.svg", "walls": [], "obstacles": [], "lines": [], "tracks": [{"id": "synapse-0", "points": [{"x": 84.6, "y": 209.044439}, {"x": 85.196583, "y": 196.846755}, {"x": 86.980588, "y": 184.766534}, {"x": 89.934825, "y": 172.920124}, {"x": 94.030851, "y": 161.421617}, {"x": 99.229222, "y": 150.381737}, {"x": 105.479872, "y": 139.906815}, {"x": 112.7226, "y": 130.097721}, {"x": 120.887654, "y": 121.048932}, {"x": 129.896404, "y": 112.847589}, {"x": 139.662095, "y": 105.572671}, {"x": 150.090667, "y": 99.294241}, {"x": 161.081698, "y": 94.072766}, {"x": 172.529327, "y": 89.958535}, {"x": 184.323319, "y": 86.991168}, {"x": 196.350088, "y": 85.199234}, {"x": 208.4938, "y": 84.6}, {"x": 1010.155561, "y": 84.6}, {"x": 1022.353245, "y": 85.199234}, {"x": 1034.433467, "y": 86.991168}, {"x": 1046.279876, "y": 89.958535}, {"x": 1057.778384, "y": 94.072766}, {"x": 1068.818263, "y": 99.294241}, {"x": 1079.293184, "y": 105.572671}, {"x": 1089.102278, "y": 112.847589}, {"x": 1098.151068, "y": 121.048932}, {"x": 1106.35241, "y": 130.097721}, {"x": 1113.627328, "y": 139.906815}, {"x": 1119.905759, "y": 150.381737}, {"x": 1125.127234, "y": 161.421617}, {"x": 1129.241465, "y": 172.920124}, {"x": 1132.208831, "y": 184.766534}, {"x": 1134.000766, "y": 196.846755}, {"x": 1134.6, "y": 209.044439}, {"x": 1134.6, "y": 1134.6}, {"x": 208.4938, "y": 1134.6}, {"x": 196.350088, "y": 1134.003417}, {"x": 184.323319, "y": 1132.219411}, {"x": 172.529327, "y": 1129.265175}, {"x": 161.081698, "y": 1125.169149}, {"x": 150.090667, "y": 1119.970778}, {"x": 139.662095, "y": 1113.720127}, {"x": 129.896404, "y": 1106.477399}, {"x": 120.887654, "y": 1098.312346}, {"x": 112.7226, "y": 1089.303595}, {"x": 105.479872, "y": 1079.537904}, {"x": 99.229222, "y": 1069.109333}, {"x": 94.030851, "y": 1058.118303}, {"x": 89.934825, "y": 1046.670673}, {"x": 86.980588, "y": 1034.876682}, {"x": 85.196583, "y": 1022.849912}, {"x": 84.6, "y": 1010.7062}, {"x": 84.6, "y": 209.044439}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-1", "points": [{"x": 434.6, "y": 84.6}, {"x": 434.6, "y": 1134.6}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-2", "points": [{"x": 784.6, "y": 84.6}, {"x": 784.6, "y": 1134.6}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-3", "points": [{"x": 84.6, "y": 434.6}, {"x": 1134.6, "y": 434.6}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-4", "points": [{"x": 84.6, "y": 784.6}, {"x": 1134.6, "y": 784.6}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-5", "points": [{"x": 264.246013, "y": 84.6}, {"x": 264.246013, "y": 118.822227}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-6", "points": [{"x": 264.246013, "y": 408.155555}, {"x": 264.246013, "y": 460.170776}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-7", "points": [{"x": 264.246013, "y": 757.431055}, {"x": 264.246013, "y": 809.378765}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-8", "points": [{"x": 264.246013, "y": 1098.980533}, {"x": 264.246013, "y": 1134.6}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-9", "points": [{"x": 608.800913, "y": 84.6}, {"x": 608.800913, "y": 118.822227}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-10", "points": [{"x": 608.800913, "y": 408.155555}, {"x": 608.800913, "y": 460.170776}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-11", "points": [{"x": 608.800913, "y": 757.431055}, {"x": 608.800913, "y": 809.378765}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-12", "points": [{"x": 608.800913, "y": 1098.980533}, {"x": 608.800913, "y": 1134.6}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-13", "points": [{"x": 954.15556, "y": 84.6}, {"x": 954.15556, "y": 118.822227}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-14", "points": [{"x": 954.15556, "y": 408.155555}, {"x": 954.15556, "y": 460.170776}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-15", "points": [{"x": 954.15556, "y": 757.431055}, {"x": 954.15556, "y": 809.378765}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-16", "points": [{"x": 954.15556, "y": 1098.980533}, {"x": 954.15556, "y": 1134.6}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-17", "points": [{"x": 84.6, "y": 263.488891}, {"x": 118.670801, "y": 263.488891}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-18", "points": [{"x": 409.821236, "y": 263.488891}, {"x": 458.572602, "y": 263.488891}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-19", "points": [{"x": 759.029225, "y": 263.488891}, {"x": 807.933337, "y": 263.488891}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-20", "points": [{"x": 1100.377773, "y": 263.488891}, {"x": 1134.6, "y": 263.488891}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-21", "points": [{"x": 84.6, "y": 610.399087}, {"x": 118.670801, "y": 610.399087}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-22", "points": [{"x": 409.821236, "y": 610.399087}, {"x": 458.572602, "y": 610.399087}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-23", "points": [{"x": 759.029225, "y": 610.399087}, {"x": 807.933337, "y": 610.399087}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-24", "points": [{"x": 1100.377773, "y": 610.399087}, {"x": 1134.6, "y": 610.399087}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-25", "points": [{"x": 84.6, "y": 954.953987}, {"x": 118.670801, "y": 954.953987}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-26", "points": [{"x": 409.821236, "y": 954.953987}, {"x": 458.572602, "y": 954.953987}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-27", "points": [{"x": 759.029225, "y": 954.953987}, {"x": 807.933337, "y": 954.953987}], "width": 16.89068010075567, "color": "#000000"}, {"id": "synapse-28", "points": [{"x": 1100.377773, "y": 954.953987}, {"x": 1134.6, "y": 954.953987}], "width": 16.89068010075567, "color": "#000000"}], "initialPose": {"x": 959.6, "y": 959.6, "heading": 270}, "citySideMm": 350, "cityZones": [{"id": "A", "center": {"x": 259.6, "y": 259.6}, "containment": {"x": 259.6, "y": 259.6, "side": 140, "rotation": 45}, "sites": [{"id": "A1", "number": 1, "x": 184.6, "y": 184.6, "width": 15, "height": 25, "rotation": 45}, {"id": "A2", "number": 2, "x": 334.6, "y": 184.6, "width": 15, "height": 25, "rotation": -45}, {"id": "A3", "number": 3, "x": 184.6, "y": 334.6, "width": 15, "height": 25, "rotation": -45}, {"id": "A4", "number": 4, "x": 334.6, "y": 334.6, "width": 15, "height": 25, "rotation": 45}]}, {"id": "C", "center": {"x": 609.6, "y": 259.6}, "containment": {"x": 609.6, "y": 259.6, "side": 140, "rotation": 45}, "sites": [{"id": "C1", "number": 1, "x": 534.6, "y": 184.6, "width": 15, "height": 25, "rotation": 45}, {"id": "C2", "number": 2, "x": 684.6, "y": 184.6, "width": 15, "height": 25, "rotation": -45}, {"id": "C3", "number": 3, "x": 534.6, "y": 334.6, "width": 15, "height": 25, "rotation": -45}, {"id": "C4", "number": 4, "x": 684.6, "y": 334.6, "width": 15, "height": 25, "rotation": 45}]}, {"id": "F", "center": {"x": 959.6, "y": 259.6}, "containment": {"x": 959.6, "y": 259.6, "side": 140, "rotation": 45}, "sites": [{"id": "F1", "number": 1, "x": 884.6, "y": 184.6, "width": 15, "height": 25, "rotation": 45}, {"id": "F2", "number": 2, "x": 1034.6, "y": 184.6, "width": 15, "height": 25, "rotation": -45}, {"id": "F3", "number": 3, "x": 884.6, "y": 334.6, "width": 15, "height": 25, "rotation": -45}, {"id": "F4", "number": 4, "x": 1034.6, "y": 334.6, "width": 15, "height": 25, "rotation": 45}]}, {"id": "B", "center": {"x": 259.6, "y": 609.6}, "containment": {"x": 259.6, "y": 609.6, "side": 140, "rotation": 45}, "sites": [{"id": "B1", "number": 1, "x": 184.6, "y": 534.6, "width": 15, "height": 25, "rotation": 45}, {"id": "B2", "number": 2, "x": 334.6, "y": 534.6, "width": 15, "height": 25, "rotation": -45}, {"id": "B3", "number": 3, "x": 184.6, "y": 684.6, "width": 15, "height": 25, "rotation": -45}, {"id": "B4", "number": 4, "x": 334.6, "y": 684.6, "width": 15, "height": 25, "rotation": 45}]}, {"id": "E", "center": {"x": 609.6, "y": 609.6}, "containment": {"x": 609.6, "y": 609.6, "side": 140, "rotation": 45}, "sites": [{"id": "E1", "number": 1, "x": 534.6, "y": 534.6, "width": 15, "height": 25, "rotation": 45}, {"id": "E2", "number": 2, "x": 684.6, "y": 534.6, "width": 15, "height": 25, "rotation": -45}, {"id": "E3", "number": 3, "x": 534.6, "y": 684.6, "width": 15, "height": 25, "rotation": -45}, {"id": "E4", "number": 4, "x": 684.6, "y": 684.6, "width": 15, "height": 25, "rotation": 45}]}, {"id": "H", "center": {"x": 959.6, "y": 609.6}, "containment": {"x": 959.6, "y": 609.6, "side": 140, "rotation": 45}, "sites": [{"id": "H1", "number": 1, "x": 884.6, "y": 534.6, "width": 15, "height": 25, "rotation": 45}, {"id": "H2", "number": 2, "x": 1034.6, "y": 534.6, "width": 15, "height": 25, "rotation": -45}, {"id": "H3", "number": 3, "x": 884.6, "y": 684.6, "width": 15, "height": 25, "rotation": -45}, {"id": "H4", "number": 4, "x": 1034.6, "y": 684.6, "width": 15, "height": 25, "rotation": 45}]}, {"id": "D", "center": {"x": 259.6, "y": 959.6}, "containment": {"x": 259.6, "y": 959.6, "side": 140, "rotation": 45}, "sites": [{"id": "D1", "number": 1, "x": 184.6, "y": 884.6, "width": 15, "height": 25, "rotation": 45}, {"id": "D2", "number": 2, "x": 334.6, "y": 884.6, "width": 15, "height": 25, "rotation": -45}, {"id": "D3", "number": 3, "x": 184.6, "y": 1034.6, "width": 15, "height": 25, "rotation": -45}, {"id": "D4", "number": 4, "x": 334.6, "y": 1034.6, "width": 15, "height": 25, "rotation": 45}]}, {"id": "G", "center": {"x": 609.6, "y": 959.6}, "containment": {"x": 609.6, "y": 959.6, "side": 140, "rotation": 45}, "sites": [{"id": "G1", "number": 1, "x": 534.6, "y": 884.6, "width": 15, "height": 25, "rotation": 45}, {"id": "G2", "number": 2, "x": 684.6, "y": 884.6, "width": 15, "height": 25, "rotation": -45}, {"id": "G3", "number": 3, "x": 534.6, "y": 1034.6, "width": 15, "height": 25, "rotation": -45}, {"id": "G4", "number": 4, "x": 684.6, "y": 1034.6, "width": 15, "height": 25, "rotation": 45}]}], "storageSites": [{"id": "S1", "x": 700, "y": 1180, "width": 15, "height": 25, "rotation": 0}, {"id": "S2", "x": 1180, "y": 700, "width": 15, "height": 25, "rotation": 90}, {"id": "S3", "x": 785, "y": 1180, "width": 15, "height": 25, "rotation": 0}, {"id": "S4", "x": 1180, "y": 785, "width": 15, "height": 25, "rotation": 90}, {"id": "S5", "x": 870, "y": 1180, "width": 15, "height": 25, "rotation": 0}, {"id": "S6", "x": 1180, "y": 870, "width": 15, "height": 25, "rotation": 90}]},

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
    this.mission = new LeanbotCpp.MissionWorld(this.currentBoard);
    this.pixelsPerMM = 0.3;
    this.offsetX = 50;
    this.offsetY = 50;
    
    // Robot state
    this.robotX = this.currentBoard.initialPose.x; // Center of board
    this.robotY = this.currentBoard.initialPose.y;
    this.robotHeading = this.currentBoard.initialPose?.heading ?? 0;
    this.robotRadius = LeanbotCpp.LEANBOT_APPEARANCE.collisionRadius; // conservative footprint radius, mm
    this.boardImage = new Image();
    this.boardImage.onload = () => this.render();
    this.boardImage.src = new URL('../simulator/synapse-city.svg?v=crl-square-5', document.baseURI || 'http://localhost/leanbot-ide/').href;
    this.speedL = 0;
    this.speedR = 0;
    this.time = 0;
    this.trajectory = [];
    this.frameCount = 0;
    
    // Mouse drag state
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    
    // Canvas setup
    this.setupCanvas();
    this.setupEventListeners();
    document.getElementById('simRobotHeading').value = this.robotHeading;
    this.drawInitial();
    const missionHost = document.getElementById('simMissionEditor');
    if (missionHost && typeof missionHost.querySelector === 'function') {
      this.disposeMissionEditor = LeanbotCpp.mountMissionEditor(missionHost, this.mission, {
        canvas: this.canvas,
        toBoard: (x,y) => {
          const rect = this.canvas.getBoundingClientRect();
          return { x: ((x-rect.left)*this.canvas.width/rect.width-this.offsetX)/this.pixelsPerMM,
                   y: ((y-rect.top)*this.canvas.height/rect.height-this.offsetY)/this.pixelsPerMM };
        },
        locked: () => this.isRunning || this.modal.classList.contains('is-hidden'),
        pose: () => ({ x:this.robotX,y:this.robotY,heading:this.robotHeading }),
        render: () => this.render(),
      });
    }
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

    // Options
    document.getElementById('simGrid').addEventListener('change', () => this.render());
    document.getElementById('simTrajectory').addEventListener('change', () => this.render());
    document.getElementById('simSensorDebug').addEventListener('change', () => this.render());

    // Canvas mouse events for dragging robot
    this.canvas.addEventListener('pointerdown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('pointerup', () => this.onMouseUp());
    this.canvas.addEventListener('pointercancel', () => this.onMouseUp());
    this.canvas.style.touchAction = 'none';

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
    this.mission.syncPose({x:this.robotX,y:this.robotY,heading:this.robotHeading});
    this.updateStats();
    this.render();
  }

  onMouseDown(e) {
    if (this.isRunning) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * this.canvas.width / rect.width;
    const mouseY = (e.clientY - rect.top) * this.canvas.height / rect.height;
    
    // Check if clicking on robot
    const robotPixelX = this.offsetX + this.robotX * this.pixelsPerMM;
    const robotPixelY = this.offsetY + this.robotY * this.pixelsPerMM;
    const dist = Math.sqrt((mouseX - robotPixelX) ** 2 + (mouseY - robotPixelY) ** 2);
    
    const worldX = (mouseX - this.offsetX) / this.pixelsPerMM;
    const worldY = (mouseY - this.offsetY) / this.pixelsPerMM;
    if (worldX < 0 || worldY < 0 || worldX > this.currentBoard.width || worldY > this.currentBoard.height) return;
    this.isDragging = true;
    this.dragOffsetX = dist < this.robotRadius * this.pixelsPerMM ? mouseX - robotPixelX : 0;
    this.dragOffsetY = dist < this.robotRadius * this.pixelsPerMM ? mouseY - robotPixelY : 0;
    this.canvas.setPointerCapture?.(e.pointerId);
    this.canvas.style.cursor = 'grabbing';
    this.onMouseMove(e);
  }

  onMouseMove(e) {
    if (!this.isDragging || this.isRunning) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * this.canvas.width / rect.width;
    const mouseY = (e.clientY - rect.top) * this.canvas.height / rect.height;
    
    // Update robot position
    this.robotX = (mouseX - this.dragOffsetX - this.offsetX) / this.pixelsPerMM;
    this.robotY = (mouseY - this.dragOffsetY - this.offsetY) / this.pixelsPerMM;
    
    // Clamp to board
    this.robotX = Math.max(this.robotRadius, Math.min(this.robotX, this.currentBoard.width - this.robotRadius));
    this.robotY = Math.max(this.robotRadius, Math.min(this.robotY, this.currentBoard.height - this.robotRadius));
    
    this.mission.syncPose({x:this.robotX,y:this.robotY,heading:this.robotHeading});
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

    for (const track of this.currentBoard.tracks || []) {
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = track.width * this.pixelsPerMM;
      this.ctx.lineJoin = 'miter'; this.ctx.lineCap = 'round';
      this.ctx.beginPath();
      track.points.forEach((p, i) => this.ctx[i ? 'lineTo' : 'moveTo'](this.offsetX + p.x * this.pixelsPerMM, this.offsetY + p.y * this.pixelsPerMM));
      this.ctx.stroke();
    }
    // Draw grid if enabled
    if (!this.currentBoard.backgroundImage && document.getElementById('simGrid').checked) {
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
    ctx.scale(this.pixelsPerMM, this.pixelsPerMM);
    LeanbotCpp.drawLeanbot(ctx, this.gripperLeft || 0, this.gripperRight || 0);
    ctx.restore();
  }

  render() {
    if (!this.ctx) return;
    
    // Clear canvas
    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw board
    this.drawBoard();
    this.ctx.save(); this.ctx.translate(this.offsetX,this.offsetY); this.ctx.scale(this.pixelsPerMM,this.pixelsPerMM);
    LeanbotCpp.drawMissionBlocks(this.ctx,this.mission); this.ctx.restore();
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
    
    for (const [i, point] of (this.trajectory || []).entries()) {
      this.ctx[i ? 'lineTo' : 'moveTo'](this.offsetX + point.x * this.pixelsPerMM, this.offsetY + point.y * this.pixelsPerMM);
    }
    this.ctx.stroke();
  }

  start() {
    if (this.isRunning) return;
    
    try {
      const code = window.getLeanbotSimulatorCode?.();
      if (!code?.trim()) throw new Error('Chưa có code C++ trong tệp đang mở hoặc trình soạn thảo chưa sẵn sàng.');
      this.runtime = new LeanbotCpp.CppRuntime(code, {
        motors: (left, right) => { this.speedL = left; this.speedR = right; },
        advance: seconds => this.advanceRobot(seconds),
        sensors: () => ({ distance: this.mission.distance({x:this.robotX,y:this.robotY,heading:this.robotHeading}) }),
        log: message => this.addLog(message),
        gripper: (left, right) => {
          this.gripperLeft = left; this.gripperRight = right;
          this.mission.setGripper(left,right,{ x:this.robotX,y:this.robotY,heading:this.robotHeading },this.speedL,this.speedR);
        },
      });
      this.runtime.start();
      this.trajectory = [{ x: this.robotX, y: this.robotY }];
    } catch (error) {
      this.addLog(`[ERROR] ${error.message}`);
      return;
    }
    this.isRunning = true;
    this.isPaused = false;
    this.time = 0;
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.updateButtons();
    this.addLog('[>] Chạy code C++ trong tệp đang mở');
    this.animate();
  }

  togglePause() {
    if (!this.isRunning) return;
    
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.isPaused = !this.isPaused;
    this.lastFrameTime = performance.now();
    this.updateButtons();
    this.addLog(this.isPaused ? '[||] Simulation paused' : '[>] Simulation resumed');
    
    if (!this.isPaused) {
      this.animate();
    }
  }

  stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.runtime?.stop();
    this.isRunning = false;
    this.isPaused = false;
    this.speedL = 0;
    this.speedR = 0;
    this.updateButtons();
    this.render();
    this.addLog('[x] Simulation stopped');
  }

  reset() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    this.runtime?.stop();
    this.isRunning = false;
    this.isPaused = false;
    this.resetRobot();
    this.updateButtons();
    this.render();
    this.addLog('[R] Simulation reset');
  }

  resetRobot() {
    this.mission.reset();
    this.gripperLeft = this.gripperRight = 0;
    this.robotX = this.currentBoard === BOARD_CONFIGS.synapse ? this.currentBoard.initialPose.x : this.currentBoard.width / 2;
    this.robotY = this.currentBoard === BOARD_CONFIGS.synapse ? this.currentBoard.initialPose.y : this.currentBoard.height / 2;
    this.robotHeading = this.currentBoard.initialPose?.heading ?? 0;
    document.getElementById('simRobotHeading').value = this.robotHeading;
    this.speedL = 0;
    this.speedR = 0;
    this.time = 0;
    this.trajectory = [];
    this.frameCount = 0;
    this.updateStats();
  }

  advanceRobot(dt) {
    const speed = (this.speedL + this.speedR) / 2;
    const omega = (this.speedL - this.speedR) / LeanbotCpp.LEANBOT_APPEARANCE.wheelBase;
    this.robotHeading += omega * dt * 180 / Math.PI;
    const heading = this.robotHeading * Math.PI / 180;
    this.robotX += speed * Math.cos(heading) * dt;
    this.robotY += speed * Math.sin(heading) * dt;
    this.robotX = Math.max(this.robotRadius, Math.min(this.robotX, this.currentBoard.width - this.robotRadius));
    this.robotY = Math.max(this.robotRadius, Math.min(this.robotY, this.currentBoard.height - this.robotRadius));
    this.mission.step(dt,{ x:this.robotX,y:this.robotY,heading:this.robotHeading },this.speedL,this.speedR);
  }

  animate() {
    if (!this.isRunning || this.isPaused) return;
    const now = performance.now();
    const dt = Math.max(0, now - this.lastFrameTime);
    this.lastFrameTime = now;
    try {
      this.runtime.tick(dt);
      this.time = this.runtime.time / 1000;
      this.frameCount++;
      this.trajectory.push({ x: this.robotX, y: this.robotY });
      if (!this.runtime.running) { this.stop(); this.addLog('[OK] Chương trình kết thúc'); }
    } catch (error) {
      this.stop(); this.addLog(`[ERROR] ${error.message}`);
    }
    this.render();
    this.updateStats();
    if (this.isRunning) this.animationId = requestAnimationFrame(() => this.animate());
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
    document.getElementById('simDist').textContent = this.mission.distance({x:this.robotX,y:this.robotY,heading:this.robotHeading}).toFixed(1);
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
    pauseBtn.textContent = this.isPaused ? '[>] Resume' : '[||] Pause';
    
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
