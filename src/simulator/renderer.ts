import { drawMissionBlocks } from './missionWorld';
/**
 * 2D Canvas Renderer for Robot Simulator
 * Renders robot, board, and sensor visualizations
 */

import { drawLeanbot, LEANBOT_APPEARANCE } from './robotAppearance';
import { RobotSimulator } from './robotSimulator';
import {
  BoardConfig,
  Pose,
  SensorReading,
} from './types';

export interface RendererOptions {
  pixelsPerMM: number;
  showGrid: boolean;
  showSensorDebug: boolean;
  showTrajectory: boolean;
  backgroundColor: string;
  robotColor: string;
  lineColor: string;
  wallColor: string;
  obstacleColor: string;
}

const DEFAULT_RENDERER_OPTIONS: RendererOptions = {
  pixelsPerMM: 0.5,
  showGrid: true,
  showSensorDebug: false,
  showTrajectory: true,
  backgroundColor: '#ffffff',
  robotColor: '#ff0000',
  lineColor: '#000000',
  wallColor: '#333333',
  obstacleColor: '#ff6600',
};

export class SimulatorRenderer {
  private remoteRobots: { robotId: string; pose: Pose }[] = [];

  setRemoteRobots(robots: { robotId: string; pose: Pose }[]): void {
    this.remoteRobots = robots;
  }

  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private simulator: RobotSimulator;
  private board: BoardConfig;
  private options: RendererOptions;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private scale: number = 1;
  private viewportWidth = 800;
  private viewportHeight = 600;
  private boardImage?: HTMLImageElement;

  constructor(
    canvas: HTMLCanvasElement,
    simulator: RobotSimulator,
    board: BoardConfig,
    options?: Partial<RendererOptions>
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.context = ctx;
    this.simulator = simulator;
    this.board = board;
    this.options = { ...DEFAULT_RENDERER_OPTIONS, ...options };

    // Set canvas size
    this.canvas.width = 800;
    this.canvas.height = 600;

    this.fitBoardToCanvas();
    if (board.backgroundImage) {
      this.boardImage = new Image();
      this.boardImage.onload = () => this.render();
      this.boardImage.src = `${import.meta.env.BASE_URL}${board.backgroundImage.replace(/^\//, '')}?v=measured-325-v1`;
    }
  }

  /**
   * Calculate viewport transformation to fit board in canvas
   */
  private fitBoardToCanvas(): void {
    const boardWidth = this.board.width;
    const boardHeight = this.board.height;

    const canvasWidth = this.viewportWidth;
    const canvasHeight = this.viewportHeight;

    const scaleX = canvasWidth / boardWidth;
    const scaleY = canvasHeight / boardHeight;

    this.scale = Math.min(scaleX, scaleY) * 0.95; // 95% to add margin
    this.offsetX = (canvasWidth - boardWidth * this.scale) / 2;
    this.offsetY = (canvasHeight - boardHeight * this.scale) / 2;
  }

  /**
   * Convert board coordinates to canvas coordinates
   */
  private boardToCanvas(x: number, y: number): { x: number; y: number } {
    return {
      x: this.offsetX + x * this.scale,
      y: this.offsetY + y * this.scale,
    };
  }

  /** Convert CSS pointer coordinates through the actual backing-store viewport. */
  clientToBoard(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) * this.viewportWidth / rect.width - this.offsetX) / this.scale,
      y: ((clientY - rect.top) * this.viewportHeight / rect.height - this.offsetY) / this.scale,
    };
  }

  /**
   * Zoom in/out with center point
   * @param factor - Zoom factor (>1 to zoom in, <1 to zoom out)
   * @param centerX - Canvas X coordinate of zoom center (optional)
   * @param centerY - Canvas Y coordinate of zoom center (optional)
   */
  zoom(factor: number, centerX?: number, centerY?: number): void {
    const MIN_SCALE = 0.2;
    const MAX_SCALE = 5;

    // Default center to canvas center if not provided
    if (centerX === undefined) centerX = this.viewportWidth / 2;
    if (centerY === undefined) centerY = this.viewportHeight / 2;

    // Get board coordinates of zoom center before scaling
    const boardPoint = this.clientToBoard(centerX, centerY);

    // Apply zoom
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, this.scale * factor));
    
    // Adjust offset to keep the zoom center point fixed
    this.offsetX = centerX - boardPoint.x * newScale;
    this.offsetY = centerY - boardPoint.y * newScale;

    this.scale = newScale;
    this.constrainViewport();
  }

  /**
   * Pan the viewport
   * @param deltaX - X offset in canvas pixels
   * @param deltaY - Y offset in canvas pixels
   */
  pan(deltaX: number, deltaY: number): void {
    this.offsetX += deltaX;
    this.offsetY += deltaY;
    this.constrainViewport();
  }

  /**
   * Constrain viewport to keep board visible
   */
  private constrainViewport(): void {
    const boardLeft = 0;
    const boardTop = 0;
    const boardRight = this.board.width * this.scale;
    const boardBottom = this.board.height * this.scale;

    // Allow some panning outside the board, but keep it reasonable
    const padding = 100;

    // Constrain horizontal
    const maxOffsetX = this.viewportWidth - boardLeft;
    const minOffsetX = this.viewportWidth - boardRight - padding;
    this.offsetX = Math.max(minOffsetX, Math.min(maxOffsetX, this.offsetX));

    // Constrain vertical
    const maxOffsetY = this.viewportHeight - boardTop;
    const minOffsetY = this.viewportHeight - boardBottom - padding;
    this.offsetY = Math.max(minOffsetY, Math.min(maxOffsetY, this.offsetY));
  }

  /**
   * Reset zoom and pan to fit board
   */
  resetZoom(): void {
    this.fitBoardToCanvas();
  }

  enablePlacement(onChange?: (pose: Pose) => void): () => void {
    let dragging = false;
    let dx = 0, dy = 0;
    const place = (event: PointerEvent) => {
      if (this.simulator.getSimulationState().isRunning) return;
      const point = this.clientToBoard(event.clientX, event.clientY);
      this.simulator.setPose({ ...this.simulator.getRobotPose(), x: point.x - dx, y: point.y - dy });
      onChange?.(this.simulator.getRobotPose());
      this.render();
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || this.simulator.getSimulationState().isRunning) return;
      const point = this.clientToBoard(event.clientX, event.clientY);
      const pose = this.simulator.getRobotPose();
      const onRobot = Math.hypot(point.x - pose.x, point.y - pose.y) < LEANBOT_APPEARANCE.collisionRadius;
      dx = onRobot ? point.x - pose.x : 0; dy = onRobot ? point.y - pose.y : 0;
      dragging = true;
      this.canvas.setPointerCapture?.(event.pointerId);
      place(event);
    };
    const move = (event: PointerEvent) => { if (dragging) place(event); };
    const up = () => { dragging = false; };
    this.canvas.style.touchAction = 'none';
    this.canvas.style.cursor = 'crosshair';
    this.canvas.addEventListener('pointerdown', down);
    this.canvas.addEventListener('pointermove', move);
    this.canvas.addEventListener('pointerup', up);
    this.canvas.addEventListener('pointercancel', up);
    return () => {
      this.canvas.removeEventListener('pointerdown', down);
      this.canvas.removeEventListener('pointermove', move);
      this.canvas.removeEventListener('pointerup', up);
      this.canvas.removeEventListener('pointercancel', up);
    };
  }

  /**
   * Render a single frame
   */
  render(): void {
    this.clearCanvas();
    this.drawBoard();
    this.context.save();
    this.context.translate(this.offsetX, this.offsetY);
    this.context.scale(this.scale, this.scale);
    drawMissionBlocks(this.context, this.simulator.mission);
    this.context.restore();
    this.drawRobot();
    for (const robot of this.remoteRobots) {
      const center = this.boardToCanvas(robot.pose.x, robot.pose.y);
      const ctx = this.context;
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate(robot.pose.heading * Math.PI / 180);
      ctx.scale(this.scale, this.scale);
      drawLeanbot(ctx);
      ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 3 / this.scale;
      ctx.strokeRect(-100, -50, 155, 100);
      ctx.restore();
      ctx.save(); ctx.fillStyle = '#2563eb'; ctx.font = 'bold 12px system-ui';
      ctx.fillText(robot.robotId + ' (Online)', center.x - 45, center.y - 55 * this.scale);
      ctx.restore();
    }

    if (this.options.showTrajectory) {
      this.drawTrajectory();
    }

    if (this.options.showSensorDebug) {
      this.drawSensorDebug();
    }

    if (!this.board.backgroundImage) this.drawStats();
  }

  /**
   * Clear canvas
   */
  private clearCanvas(): void {
    this.context.fillStyle = this.options.backgroundColor;
    this.context.fillRect(0, 0, this.viewportWidth, this.viewportHeight);
  }

  /**
   * Draw board elements
   */
  private drawBoard(): void {
    if (this.boardImage?.complete && this.boardImage.naturalWidth) {
      this.context.drawImage(this.boardImage, this.offsetX, this.offsetY,
        this.board.width * this.scale, this.board.height * this.scale);
    }

    // Draw grid if enabled
    if (this.options.showGrid && !this.board.backgroundImage) {
      this.drawGrid();
    }

    // Draw lines
    for (const line of this.boardImage?.naturalWidth ? [] : this.board.lines) {
      this.drawLine(line.points, line.width, line.color || this.options.lineColor);
    }

    // Draw walls
    for (const wall of this.board.walls) {
      this.drawWall(wall.x1, wall.y1, wall.x2, wall.y2);
    }

    // Draw obstacles
    for (const obstacle of this.board.obstacles) {
      this.drawObstacle(obstacle.x, obstacle.y, obstacle.width, obstacle.height, obstacle.rotation || 0);
    }
  }

  /**
   * Draw grid
   */
  private drawGrid(): void {
    this.context.strokeStyle = '#e0e0e0';
    this.context.lineWidth = 0.5;

    const gridSize = 200; // mm
    const gridScreenSize = gridSize * this.scale;

    for (let x = 0; x < this.board.width; x += gridSize) {
      const canvasX = this.boardToCanvas(x, 0).x;
      this.context.beginPath();
      this.context.moveTo(canvasX, 0);
      this.context.lineTo(canvasX, this.viewportHeight);
      this.context.stroke();
    }

    for (let y = 0; y < this.board.height; y += gridSize) {
      const canvasY = this.boardToCanvas(0, y).y;
      this.context.beginPath();
      this.context.moveTo(0, canvasY);
      this.context.lineTo(this.viewportWidth, canvasY);
      this.context.stroke();
    }
  }

  /**
   * Draw a line on the board
   */
  private drawLine(
    points: Array<{ x: number; y: number }>,
    width: number,
    color: string
  ): void {
    if (points.length < 2) return;

    this.context.strokeStyle = color;
    this.context.lineWidth = width * this.scale;
    this.context.lineCap = 'round';
    this.context.lineJoin = 'miter';

    this.context.beginPath();
    const start = this.boardToCanvas(points[0].x, points[0].y);
    this.context.moveTo(start.x, start.y);

    for (let i = 1; i < points.length; i++) {
      const p = this.boardToCanvas(points[i].x, points[i].y);
      this.context.lineTo(p.x, p.y);
    }

    this.context.stroke();
  }

  /**
   * Draw a wall
   */
  private drawWall(x1: number, y1: number, x2: number, y2: number): void {
    const p1 = this.boardToCanvas(x1, y1);
    const p2 = this.boardToCanvas(x2, y2);

    this.context.strokeStyle = this.options.wallColor;
    this.context.lineWidth = 3;

    this.context.beginPath();
    this.context.moveTo(p1.x, p1.y);
    this.context.lineTo(p2.x, p2.y);
    this.context.stroke();
  }

  /**
   * Draw an obstacle
   */
  private drawObstacle(
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number
  ): void {
    const center = this.boardToCanvas(x, y);
    const w = width * this.scale;
    const h = height * this.scale;

    this.context.fillStyle = this.options.obstacleColor;
    this.context.save();

    this.context.translate(center.x, center.y);
    this.context.rotate((rotation * Math.PI) / 180);
    this.context.fillRect(-w / 2, -h / 2, w, h);

    this.context.restore();
  }

  /**
   * Draw robot
   */
  private drawRobot(): void {
    const pose = this.simulator.getRobotPose();
    const center = this.boardToCanvas(pose.x, pose.y);

    const ctx = this.context;
    ctx.save();
    const fall = this.simulator.getFallState();
    const progress = fall.drop / 750;
    ctx.globalAlpha = 1 - progress * 0.7;
    ctx.translate(center.x, center.y + progress * 25);
    ctx.scale(1-progress*0.35, 1-progress*0.35);
    ctx.rotate(pose.heading * Math.PI / 180);
    ctx.scale(this.scale, this.scale);
    const grip = this.simulator.getGripper();
    drawLeanbot(ctx, grip.left, grip.right);
    ctx.restore();
    if (fall.status !== 'supported') {
      ctx.save(); ctx.fillStyle = '#b44740'; ctx.font = '600 11px system-ui';
      ctx.fillText(fall.status === 'fallen' ? 'Robot đã rơi khỏi sa bàn' : 'Robot đang rơi', Math.max(12,Math.min(this.viewportWidth-180,center.x)), Math.max(20,Math.min(this.viewportHeight-12,center.y)));
      ctx.restore();
    }
  }

  /**
   * Draw trajectory history
   */
  private drawTrajectory(): void {
    const state = this.simulator.getSimulationState();
    if (state.history.length < 2) return;

    this.context.strokeStyle = 'rgba(100, 150, 255, 0.3)';
    this.context.lineWidth = 1;

    this.context.beginPath();
    const start = this.boardToCanvas(state.history[0].robotPose.x, state.history[0].robotPose.y);
    this.context.moveTo(start.x, start.y);

    for (let i = 1; i < state.history.length; i++) {
      const p = this.boardToCanvas(
        state.history[i].robotPose.x,
        state.history[i].robotPose.y
      );
      this.context.lineTo(p.x, p.y);
    }

    this.context.stroke();
  }

  /**
   * Draw sensor debug information
   */
  private drawSensorDebug(): void {
    const pose = this.simulator.getRobotPose();
    const sensors = this.simulator.getSensorReadings();
    const center = this.boardToCanvas(pose.x, pose.y);
    const headingRad = (pose.heading * Math.PI) / 180;

    this.context.fillStyle = 'rgba(255, 255, 0, 0.5)';
    this.context.font = '12px monospace';

    // Draw IR sensor rays
    const sensorDistance = 100;

    // Center sensor (distance sensor)
    if (sensors.distance) {
      const rayLength = Math.min(sensors.distance, 200) * this.scale;
      const rayX = center.x + rayLength * Math.cos(headingRad);
      const rayY = center.y + rayLength * Math.sin(headingRad);

      this.context.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      this.context.lineWidth = 1;
      this.context.beginPath();
      this.context.moveTo(center.x, center.y);
      this.context.lineTo(rayX, rayY);
      this.context.stroke();
    }

    // Text display
    this.context.fillStyle = '#000000';
    this.context.font = 'bold 12px monospace';
    let textY = 20;

    this.context.fillText(
      `IR Center: ${sensors.irLine.center}`,
      10,
      textY
    );
    textY += 15;
    this.context.fillText(
      `Distance: ${sensors.distance?.toFixed(1) || 'N/A'} mm`,
      10,
      textY
    );
    textY += 15;
  }

  /**
   * Draw statistics
   */
  private drawStats(): void {
    const pose = this.simulator.getRobotPose();
    const state = this.simulator.getSimulationState();
    const sensors = this.simulator.getSensorReadings();

    this.context.fillStyle = '#000000';
    this.context.font = 'bold 12px monospace';

    let y = this.viewportHeight - 110;

    this.context.fillText(`Position: (${pose.x.toFixed(0)}, ${pose.y.toFixed(0)})`, 10, y);
    y += 15;
    this.context.fillText(`Heading: ${pose.heading.toFixed(1)}°`, 10, y);
    y += 15;
    this.context.fillText(`Speed L/R: ${state.robotState.velocityLeft.toFixed(0)}/${state.robotState.velocityRight.toFixed(0)} mm/s`, 10, y);
    y += 15;
    this.context.fillText(`IR Line: L=${sensors.irLine.left} C=${sensors.irLine.center} R=${sensors.irLine.right}`, 10, y);
    y += 15;
    this.context.fillText(`Time: ${(state.currentTime / 1000).toFixed(2)}s`, 10, y);
    y += 15;
    this.context.fillText(`Frame: ${state.history.length}`, 10, y);
  }

  /**
   * Update renderer options
   */
  setOptions(options: Partial<RendererOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Resize canvas
   */
  resizeCanvas(width: number, height: number): void {
    this.viewportWidth = Math.max(1, width);
    this.viewportHeight = Math.max(1, height);
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(this.viewportWidth * ratio);
    this.canvas.height = Math.round(this.viewportHeight * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';
    this.fitBoardToCanvas();
  }
}
