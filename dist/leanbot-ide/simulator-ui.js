/**
 * Leanbot 2D Robot Simulator UI for Static HTML
 * Handles simulator modal interactions with board rendering and mouse control
 */

// Board configurations
const BOARD_CONFIGS = {
  synapse: {"name":"Synapse City — 4 ft × 4 ft","width":1219.2,"height":1219.2,"backgroundImage":"/simulator/synapse-city.svg","initialPose":{"x":934.6,"y":934.6,"heading":270},"analysisArea":{"x":934.6,"y":934.6,"width":308.75,"height":308.75,"rotation":0},"walls":[],"obstacles":[],"lines":[{"id":"synapse-0","points":[{"x":122.10000000000002,"y":230.433333},{"x":122.33195,"y":223.34799400000003},{"x":123.02680700000002,"y":216.29299600000002},{"x":124.18159500000002,"y":209.29854800000004},{"x":125.79136900000003,"y":202.39460300000002},{"x":127.84923600000002,"y":195.610725},{"x":130.346384,"y":188.97596100000004},{"x":133.27212000000003,"y":182.51872500000002},{"x":136.61391500000002,"y":176.26666700000004},{"x":140.357459,"y":170.24655800000005},{"x":144.48672100000005,"y":164.48417900000004},{"x":148.98402100000004,"y":159.00420300000002},{"x":153.83009900000002,"y":153.83009900000002},{"x":159.00420300000002,"y":148.98402100000004},{"x":164.48417900000004,"y":144.48672100000005},{"x":170.24655800000005,"y":140.357459},{"x":176.26666700000004,"y":136.61391500000002},{"x":182.51872500000002,"y":133.27212000000003},{"x":188.97596100000004,"y":130.346384},{"x":195.610725,"y":127.84923600000002},{"x":202.39460300000002,"y":125.79136900000003},{"x":209.29854800000004,"y":124.18159500000002},{"x":216.29299600000002,"y":123.02680700000002},{"x":223.34799400000003,"y":122.33195},{"x":230.433333,"y":122.10000000000002},{"x":988.7666670000001,"y":122.10000000000002},{"x":995.8520060000001,"y":122.33195},{"x":1002.907004,"y":123.02680700000002},{"x":1009.9014520000001,"y":124.18159500000002},{"x":1016.8053970000001,"y":125.79136900000003},{"x":1023.589275,"y":127.84923600000002},{"x":1030.224039,"y":130.346384},{"x":1036.681275,"y":133.27212000000003},{"x":1042.933333,"y":136.61391500000002},{"x":1048.953442,"y":140.357459},{"x":1054.715821,"y":144.48672100000005},{"x":1060.195797,"y":148.98402100000004},{"x":1065.369901,"y":153.83009900000002},{"x":1070.215979,"y":159.00420300000002},{"x":1074.713279,"y":164.48417900000004},{"x":1078.842541,"y":170.24655800000005},{"x":1082.586085,"y":176.26666700000004},{"x":1085.92788,"y":182.51872500000002},{"x":1088.853616,"y":188.97596100000004},{"x":1091.350764,"y":195.610725},{"x":1093.408631,"y":202.39460300000002},{"x":1095.018405,"y":209.29854800000004},{"x":1096.173193,"y":216.29299600000002},{"x":1096.86805,"y":223.34799400000003},{"x":1097.1,"y":230.433333},{"x":1097.1,"y":1097.1},{"x":230.433333,"y":1097.1},{"x":223.34799400000003,"y":1096.86805},{"x":216.29299600000002,"y":1096.173193},{"x":209.29854800000004,"y":1095.018405},{"x":202.39460300000002,"y":1093.408631},{"x":195.610725,"y":1091.350764},{"x":188.97596100000004,"y":1088.853616},{"x":182.51872500000002,"y":1085.92788},{"x":176.26666700000004,"y":1082.586085},{"x":170.24655800000005,"y":1078.842541},{"x":164.48417900000004,"y":1074.713279},{"x":159.00420300000002,"y":1070.215979},{"x":153.83009900000002,"y":1065.369901},{"x":148.98402100000004,"y":1060.195797},{"x":144.48672100000005,"y":1054.715821},{"x":140.357459,"y":1048.953442},{"x":136.61391500000002,"y":1042.933333},{"x":133.27212000000003,"y":1036.681275},{"x":130.346384,"y":1030.224039},{"x":127.84923600000002,"y":1023.589275},{"x":125.79136900000003,"y":1016.8053970000001},{"x":124.18159500000002,"y":1009.9014520000001},{"x":123.02680700000002,"y":1002.907004},{"x":122.33195,"y":995.8520060000001},{"x":122.10000000000002,"y":988.7666670000001},{"x":122.10000000000002,"y":230.433333}],"width":16.25,"color":"#000000"},{"id":"synapse-1","points":[{"x":447.1,"y":97.72500000000002},{"x":447.1,"y":1121.475}],"width":16.25,"color":"#000000"},{"id":"synapse-2","points":[{"x":772.1,"y":97.72500000000002},{"x":772.1,"y":1121.475}],"width":16.25,"color":"#000000"},{"id":"synapse-3","points":[{"x":97.72500000000002,"y":447.1},{"x":1121.475,"y":447.1}],"width":16.25,"color":"#000000"},{"id":"synapse-4","points":[{"x":97.72500000000002,"y":772.1},{"x":1121.475,"y":772.1}],"width":16.25,"color":"#000000"},{"id":"synapse-5","points":[{"x":284.6,"y":146.47500000000002},{"x":284.6,"y":97.72500000000002}],"width":16.25,"color":"#000000"},{"id":"synapse-6","points":[{"x":146.47500000000002,"y":284.6},{"x":97.72500000000002,"y":284.6}],"width":16.25,"color":"#000000"},{"id":"synapse-7","points":[{"x":284.6,"y":422.725},{"x":284.6,"y":471.475}],"width":16.25,"color":"#000000"},{"id":"synapse-8","points":[{"x":422.725,"y":284.6},{"x":471.475,"y":284.6}],"width":16.25,"color":"#000000"},{"id":"synapse-9","points":[{"x":284.6,"y":471.475},{"x":284.6,"y":422.725}],"width":16.25,"color":"#000000"},{"id":"synapse-10","points":[{"x":146.47500000000002,"y":609.6},{"x":97.72500000000002,"y":609.6}],"width":16.25,"color":"#000000"},{"id":"synapse-11","points":[{"x":284.6,"y":747.725},{"x":284.6,"y":796.475}],"width":16.25,"color":"#000000"},{"id":"synapse-12","points":[{"x":422.725,"y":609.6},{"x":471.475,"y":609.6}],"width":16.25,"color":"#000000"},{"id":"synapse-13","points":[{"x":284.6,"y":796.475},{"x":284.6,"y":747.725}],"width":16.25,"color":"#000000"},{"id":"synapse-14","points":[{"x":146.47500000000002,"y":934.6},{"x":97.72500000000002,"y":934.6}],"width":16.25,"color":"#000000"},{"id":"synapse-15","points":[{"x":284.6,"y":1072.725},{"x":284.6,"y":1121.475}],"width":16.25,"color":"#000000"},{"id":"synapse-16","points":[{"x":422.725,"y":934.6},{"x":471.475,"y":934.6}],"width":16.25,"color":"#000000"},{"id":"synapse-17","points":[{"x":609.6,"y":146.47500000000002},{"x":609.6,"y":97.72500000000002}],"width":16.25,"color":"#000000"},{"id":"synapse-18","points":[{"x":471.475,"y":284.6},{"x":422.725,"y":284.6}],"width":16.25,"color":"#000000"},{"id":"synapse-19","points":[{"x":609.6,"y":422.725},{"x":609.6,"y":471.475}],"width":16.25,"color":"#000000"},{"id":"synapse-20","points":[{"x":747.725,"y":284.6},{"x":796.475,"y":284.6}],"width":16.25,"color":"#000000"},{"id":"synapse-21","points":[{"x":609.6,"y":471.475},{"x":609.6,"y":422.725}],"width":16.25,"color":"#000000"},{"id":"synapse-22","points":[{"x":471.475,"y":609.6},{"x":422.725,"y":609.6}],"width":16.25,"color":"#000000"},{"id":"synapse-23","points":[{"x":609.6,"y":747.725},{"x":609.6,"y":796.475}],"width":16.25,"color":"#000000"},{"id":"synapse-24","points":[{"x":747.725,"y":609.6},{"x":796.475,"y":609.6}],"width":16.25,"color":"#000000"},{"id":"synapse-25","points":[{"x":609.6,"y":796.475},{"x":609.6,"y":747.725}],"width":16.25,"color":"#000000"},{"id":"synapse-26","points":[{"x":471.475,"y":934.6},{"x":422.725,"y":934.6}],"width":16.25,"color":"#000000"},{"id":"synapse-27","points":[{"x":609.6,"y":1072.725},{"x":609.6,"y":1121.475}],"width":16.25,"color":"#000000"},{"id":"synapse-28","points":[{"x":747.725,"y":934.6},{"x":796.475,"y":934.6}],"width":16.25,"color":"#000000"},{"id":"synapse-29","points":[{"x":934.6,"y":146.47500000000002},{"x":934.6,"y":97.72500000000002}],"width":16.25,"color":"#000000"},{"id":"synapse-30","points":[{"x":796.475,"y":284.6},{"x":747.725,"y":284.6}],"width":16.25,"color":"#000000"},{"id":"synapse-31","points":[{"x":934.6,"y":422.725},{"x":934.6,"y":471.475}],"width":16.25,"color":"#000000"},{"id":"synapse-32","points":[{"x":1072.725,"y":284.6},{"x":1121.475,"y":284.6}],"width":16.25,"color":"#000000"},{"id":"synapse-33","points":[{"x":934.6,"y":471.475},{"x":934.6,"y":422.725}],"width":16.25,"color":"#000000"},{"id":"synapse-34","points":[{"x":796.475,"y":609.6},{"x":747.725,"y":609.6}],"width":16.25,"color":"#000000"},{"id":"synapse-35","points":[{"x":934.6,"y":747.725},{"x":934.6,"y":796.475}],"width":16.25,"color":"#000000"},{"id":"synapse-36","points":[{"x":1072.725,"y":609.6},{"x":1121.475,"y":609.6}],"width":16.25,"color":"#000000"},{"id":"synapse-37","points":[{"x":934.6,"y":796.475},{"x":934.6,"y":747.725}],"width":16.25,"color":"#000000"},{"id":"synapse-38","points":[{"x":796.475,"y":934.6},{"x":747.725,"y":934.6}],"width":16.25,"color":"#000000"},{"id":"synapse-39","points":[{"x":934.6,"y":1072.725},{"x":934.6,"y":1121.475}],"width":16.25,"color":"#000000"},{"id":"synapse-40","points":[{"x":1072.725,"y":934.6},{"x":1121.475,"y":934.6}],"width":16.25,"color":"#000000"}],"cityZones":[{"id":"A","center":{"x":284.6,"y":284.6},"containment":{"x":284.6,"y":284.6,"side":124.931469,"rotation":45},"sites":[{"id":"A1","number":1,"x":230.433333,"y":230.433333,"width":14.1375,"height":23.8875,"rotation":45},{"id":"A2","number":2,"x":230.433333,"y":338.76666700000004,"width":14.1375,"height":23.8875,"rotation":135},{"id":"A3","number":3,"x":338.76666700000004,"y":230.433333,"width":14.1375,"height":23.8875,"rotation":135},{"id":"A4","number":4,"x":338.76666700000004,"y":338.76666700000004,"width":14.1375,"height":23.8875,"rotation":45}]},{"id":"B","center":{"x":284.6,"y":609.6},"containment":{"x":284.6,"y":609.6,"side":124.931469,"rotation":45},"sites":[{"id":"B1","number":1,"x":230.433333,"y":555.4333330000001,"width":14.1375,"height":23.8875,"rotation":45},{"id":"B2","number":2,"x":230.433333,"y":663.766667,"width":14.1375,"height":23.8875,"rotation":135},{"id":"B3","number":3,"x":338.76666700000004,"y":555.4333330000001,"width":14.1375,"height":23.8875,"rotation":135},{"id":"B4","number":4,"x":338.76666700000004,"y":663.766667,"width":14.1375,"height":23.8875,"rotation":45}]},{"id":"C","center":{"x":609.6,"y":284.6},"containment":{"x":609.6,"y":284.6,"side":124.931469,"rotation":45},"sites":[{"id":"C1","number":1,"x":555.4333330000001,"y":230.433333,"width":14.1375,"height":23.8875,"rotation":45},{"id":"C2","number":2,"x":555.4333330000001,"y":338.76666700000004,"width":14.1375,"height":23.8875,"rotation":135},{"id":"C3","number":3,"x":663.766667,"y":230.433333,"width":14.1375,"height":23.8875,"rotation":135},{"id":"C4","number":4,"x":663.766667,"y":338.76666700000004,"width":14.1375,"height":23.8875,"rotation":45}]},{"id":"D","center":{"x":284.6,"y":934.6},"containment":{"x":284.6,"y":934.6,"side":124.931469,"rotation":45},"sites":[{"id":"D1","number":1,"x":230.433333,"y":880.433333,"width":14.1375,"height":23.8875,"rotation":45},{"id":"D2","number":2,"x":230.433333,"y":988.7666670000001,"width":14.1375,"height":23.8875,"rotation":135},{"id":"D3","number":3,"x":338.76666700000004,"y":880.433333,"width":14.1375,"height":23.8875,"rotation":135},{"id":"D4","number":4,"x":338.76666700000004,"y":988.7666670000001,"width":14.1375,"height":23.8875,"rotation":45}]},{"id":"E","center":{"x":609.6,"y":609.6},"containment":{"x":609.6,"y":609.6,"side":124.931469,"rotation":45},"sites":[{"id":"E1","number":1,"x":555.4333330000001,"y":555.4333330000001,"width":14.1375,"height":23.8875,"rotation":45},{"id":"E2","number":2,"x":555.4333330000001,"y":663.766667,"width":14.1375,"height":23.8875,"rotation":135},{"id":"E3","number":3,"x":663.766667,"y":555.4333330000001,"width":14.1375,"height":23.8875,"rotation":135},{"id":"E4","number":4,"x":663.766667,"y":663.766667,"width":14.1375,"height":23.8875,"rotation":45}]},{"id":"F","center":{"x":934.6,"y":284.6},"containment":{"x":934.6,"y":284.6,"side":124.931469,"rotation":45},"sites":[{"id":"F1","number":1,"x":880.433333,"y":230.433333,"width":14.1375,"height":23.8875,"rotation":45},{"id":"F2","number":2,"x":880.433333,"y":338.76666700000004,"width":14.1375,"height":23.8875,"rotation":135},{"id":"F3","number":3,"x":988.7666670000001,"y":230.433333,"width":14.1375,"height":23.8875,"rotation":135},{"id":"F4","number":4,"x":988.7666670000001,"y":338.76666700000004,"width":14.1375,"height":23.8875,"rotation":45}]},{"id":"G","center":{"x":609.6,"y":934.6},"containment":{"x":609.6,"y":934.6,"side":124.931469,"rotation":45},"sites":[{"id":"G1","number":1,"x":555.4333330000001,"y":880.433333,"width":14.1375,"height":23.8875,"rotation":45},{"id":"G2","number":2,"x":555.4333330000001,"y":988.7666670000001,"width":14.1375,"height":23.8875,"rotation":135},{"id":"G3","number":3,"x":663.766667,"y":880.433333,"width":14.1375,"height":23.8875,"rotation":135},{"id":"G4","number":4,"x":663.766667,"y":988.7666670000001,"width":14.1375,"height":23.8875,"rotation":45}]},{"id":"H","center":{"x":934.6,"y":609.6},"containment":{"x":934.6,"y":609.6,"side":124.931469,"rotation":45},"sites":[{"id":"H1","number":1,"x":880.433333,"y":555.4333330000001,"width":14.1375,"height":23.8875,"rotation":45},{"id":"H2","number":2,"x":880.433333,"y":663.766667,"width":14.1375,"height":23.8875,"rotation":135},{"id":"H3","number":3,"x":988.7666670000001,"y":555.4333330000001,"width":14.1375,"height":23.8875,"rotation":135},{"id":"H4","number":4,"x":988.7666670000001,"y":663.766667,"width":14.1375,"height":23.8875,"rotation":45}]}],"storageSites":[{"id":"S1","x":690.85,"y":1155.6,"width":14.1375,"height":23.8875,"rotation":0},{"id":"S2","x":1155.6,"y":690.85,"width":14.1375,"height":23.8875,"rotation":90},{"id":"S3","x":772.1,"y":1155.6,"width":14.1375,"height":23.8875,"rotation":0},{"id":"S4","x":1155.6,"y":772.1,"width":14.1375,"height":23.8875,"rotation":90},{"id":"S5","x":853.35,"y":1155.6,"width":14.1375,"height":23.8875,"rotation":0},{"id":"S6","x":1155.6,"y":853.35,"width":14.1375,"height":23.8875,"rotation":90}],"metadata":{"description":"AIROC drawing with one shared calibrated geometry for SVG and sensors","citySideMm":325,"fieldModel":{"blockLengthMm":15,"blockWidthMm":25,"blockHeightMm":75},"randomizerReference":{"source":"https://www.airoc.space/labs/SynapseCity/synapse-city-randomizer/script.js","drawing":{"side":1200,"cityPitch":333.3333333333333,"blackLineWidth":16.666666666666668,"whiteStripeWidth":50,"siteOffset":55.55555555555556},"units":"drawing units","physicalMatSideMm":1219.2,"measuredCityPitchMm":325,"scaleMmPerDrawingUnit":0.9750000000000001,"frameInsetMm":24.600000000000023},"layoutCalibration":{"citySideMm":325,"sourceCitySideUnits":333.3333333333333,"scale":0.9750000000000001,"centerMm":609.6,"source":"AIROC proportions; city pitch measured by user"}}}

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
    this.boardImage.src = new URL('../simulator/synapse-city.svg?v=gameplay-sites-v3', document.baseURI || 'http://localhost/leanbot-ide/').href;
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
    for(const [id,button] of [['simTouch1A',1],['simTouch1B',3],['simTouch2A',4],['simTouch2B',8]]){
      document.getElementById(id).addEventListener('click',()=>{if(this.isRunning&&!this.isPaused)this.runtime?.pressTouch(button);});
    }

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
    const grip = this.mission.getGripperAngles({x:this.robotX,y:this.robotY,heading:this.robotHeading});
    LeanbotCpp.drawLeanbot(ctx, grip.left, grip.right,this.rgb);
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
        rawLine: () => LeanbotCpp.readVirtualLine(this.currentBoard,{x:this.robotX,y:this.robotY,heading:this.robotHeading}),
        led: (rgb,brightness) => {this.rgb=rgb.map(v=>v*brightness/255);},
        color: () => LeanbotCpp.readVirtualColor(this.mission.blocks,{x:this.robotX,y:this.robotY,heading:this.robotHeading},this.mission.hidePollutionColors),
        sensors: () => ({ distance: this.mission.distance({x:this.robotX,y:this.robotY,heading:this.robotHeading}) }),
        log: message => this.addLog(message),
        gripper: (left, right, duration=0) => {
          if(duration>0)this.gripperMotion={from:{left:this.gripperLeft,right:this.gripperRight},to:{left,right},duration,elapsed:0};
          else {this.gripperMotion=null;this.applyGripper(left,right);}
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
    this.gripperMotion=null;this.rgb=[0,0,0];
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

  applyGripper(left,right){
    this.gripperLeft=left;this.gripperRight=right;
    this.mission.setGripper(left,right,{x:this.robotX,y:this.robotY,heading:this.robotHeading},this.speedL,this.speedR);
  }

  advanceRobot(dt) {
    const motion=this.gripperMotion;
    if(motion){
      motion.elapsed=Math.min(motion.duration,motion.elapsed+dt*1000);
      const t=motion.elapsed/motion.duration;
      this.applyGripper(motion.from.left+(motion.to.left-motion.from.left)*t,motion.from.right+(motion.to.right-motion.from.right)*t);
      if(t>=1)this.gripperMotion=null;
    }
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
    const raw=LeanbotCpp.readVirtualLine(this.currentBoard,{x:this.robotX,y:this.robotY,heading:this.robotHeading});
    document.getElementById('simIR').textContent = raw.join(' / ');
    document.getElementById('simDist').textContent = this.mission.distance({x:this.robotX,y:this.robotY,heading:this.robotHeading}).toFixed(1);
  }

  updateButtons() {
    for(const id of ['simTouch1A','simTouch1B','simTouch2A','simTouch2B'])document.getElementById(id).disabled=!this.isRunning||this.isPaused;
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
