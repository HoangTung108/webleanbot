/**
 * 2D Canvas Renderer for Robot Simulator
 * Renders robot, board, and sensor visualizations
 */

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
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private simulator: RobotSimulator;
  private board: BoardConfig;
  private options: RendererOptions;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private scale: number = 1;
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
      this.boardImage.src = board.backgroundImage;
    }
  }

  /**
   * Calculate viewport transformation to fit board in canvas
   */
  private fitBoardToCanvas(): void {
    const boardWidth = this.board.width;
    const boardHeight = this.board.height;

    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;

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

  /**
   * Render a single frame
   */
  render(): void {
    this.clearCanvas();
    this.drawBoard();
    this.drawRobot();

    if (this.options.showTrajectory) {
      this.drawTrajectory();
    }

    if (this.options.showSensorDebug) {
      this.drawSensorDebug();
    }

    this.drawStats();
  }

  /**
   * Clear canvas
   */
  private clearCanvas(): void {
    this.context.fillStyle = this.options.backgroundColor;
    this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
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
      this.context.lineTo(canvasX, this.canvas.height);
      this.context.stroke();
    }

    for (let y = 0; y < this.board.height; y += gridSize) {
      const canvasY = this.boardToCanvas(0, y).y;
      this.context.beginPath();
      this.context.moveTo(0, canvasY);
      this.context.lineTo(this.canvas.width, canvasY);
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
    this.context.lineJoin = 'round';

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
    ctx.translate(center.x, center.y);
    ctx.rotate(pose.heading * Math.PI / 180);
    ctx.scale(this.scale * 0.5, this.scale * 0.5);
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

    let y = this.canvas.height - 110;

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
    this.canvas.width = width;
    this.canvas.height = height;
    this.fitBoardToCanvas();
  }
}
