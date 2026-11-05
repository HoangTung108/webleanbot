/**
 * Multi-Robot Renderer
 * Renders both local and remote robots on the simulation canvas
 */

import { type RobotSimulator } from '../simulator/robotSimulator';
import { LEANBOT_APPEARANCE } from '../simulator/robotAppearance';

export interface Color {
  r: number;
  g: number;
  b: number;
}

export class MultiRobotRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private localRobot: RobotSimulator;
  private remoteRobots: Map<string, { robot: RobotSimulator; color: Color }> = new Map();
  private scale: number = 1;
  private centerX: number = 0;
  private centerY: number = 0;

  // Color palette for remote robots
  private colorPalette: Color[] = [
    { r: 255, g: 0, b: 0 },       // Red
    { r: 0, g: 128, b: 255 },     // Blue
    { r: 0, g: 200, b: 0 },       // Green
    { r: 255, g: 165, b: 0 },     // Orange
    { r: 128, g: 0, b: 255 },     // Purple
    { r: 0, g: 200, b: 200 },     // Cyan
  ];

  constructor(canvas: HTMLCanvasElement, localRobot: RobotSimulator) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.localRobot = localRobot;
    this.calculateTransform();
  }

  /**
   * Add remote robot to renderer
   */
  addRemoteRobot(peerId: string, robot: RobotSimulator): void {
    const colorIndex = this.remoteRobots.size % this.colorPalette.length;
    const color = this.colorPalette[colorIndex];
    this.remoteRobots.set(peerId, { robot, color });
  }

  /**
   * Remove remote robot from renderer
   */
  removeRemoteRobot(peerId: string): void {
    this.remoteRobots.delete(peerId);
  }

  /**
   * Render all robots
   */
  render(boardWidth: number, boardHeight: number): void {
    // Clear canvas
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid
    this.drawGrid();

    // Draw walls
    this.drawWalls(boardWidth, boardHeight);

    // Draw local robot (yellow color)
    const localRobotColor: Color = { r: 255, g: 255, b: 0 };
    this.drawRobot(this.localRobot, localRobotColor, true);

    // Draw remote robots
    for (const { robot, color } of this.remoteRobots.values()) {
      this.drawRobot(robot, color, false);
    }
  }

  /**
   * Draw a single robot
   */
  private drawRobot(robot: RobotSimulator, color: Color, isLocal: boolean = true): void {
    const pose = robot.getRobotPose();
    const x = this.worldToCanvasX(pose.x);
    const y = this.worldToCanvasY(pose.y);
    const heading = (pose.heading * Math.PI) / 180;

    const robotSize = 75; // mm - approximate robot size based on collisionRadius
    const canvasRadius = robotSize * this.scale;

    // Draw robot body
    this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    this.ctx.beginPath();
    this.ctx.arc(x, y, canvasRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw border
    this.ctx.strokeStyle = `rgb(${Math.max(0, color.r - 50)}, ${Math.max(0, color.g - 50)}, ${Math.max(0, color.b - 50)})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw heading indicator
    const headingLength = canvasRadius * 1.2;
    const headingX = x + Math.cos(heading) * headingLength;
    const headingY = y + Math.sin(heading) * headingLength;

    this.ctx.strokeStyle = `rgb(${Math.max(0, color.r - 50)}, ${Math.max(0, color.g - 50)}, ${Math.max(0, color.b - 50)})`;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
    this.ctx.lineTo(headingX, headingY);
    this.ctx.stroke();

    // Draw wheels
    this.drawWheels(robot, x, y, heading, color);

    // Draw label
    if (isLocal) {
      this.drawLabel(x, y - canvasRadius - 20, 'Local', color);
    } else {
      this.drawLabel(x, y - canvasRadius - 20, 'Remote', color);
    }

    // Draw sensor readings if available
    this.drawSensors(robot, x, y, heading);
  }

  /**
   * Draw robot wheels
   */
  private drawWheels(robot: RobotSimulator, x: number, y: number, heading: number, color: Color): void {
    const wheelRadius = 8; // mm - approximate wheel radius
    const wheelBase = LEANBOT_APPEARANCE.wheelBase;
    const robotSize = 75; // mm

    const canvasWheelRadius = wheelRadius * this.scale;
    const canvasWheelBase = wheelBase * this.scale;
    const canvasRobotSize = robotSize * this.scale;

    // Left and right wheel offsets
    const wheelOffsetX = Math.sin(heading) * (canvasWheelBase / 2);
    const wheelOffsetY = -Math.cos(heading) * (canvasWheelBase / 2);

    // Draw left wheel
    const leftX = x - wheelOffsetX;
    const leftY = y - wheelOffsetY;
    this.ctx.fillStyle = '#333';
    this.ctx.beginPath();
    this.ctx.arc(leftX, leftY, canvasWheelRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw right wheel
    const rightX = x + wheelOffsetX;
    const rightY = y + wheelOffsetY;
    this.ctx.beginPath();
    this.ctx.arc(rightX, rightY, canvasWheelRadius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  /**
   * Draw sensor readings
   */
  private drawSensors(robot: RobotSimulator, x: number, y: number, heading: number): void {
    const sensors = robot.getSensorReadings();
    const robotSize = 75; // mm - approximate robot size
    const sensorDistance = robotSize * this.scale * 1.5;

    if (sensors.distance !== undefined) {
      const sensorX = x + Math.cos(heading) * sensorDistance;
      const sensorY = y + Math.sin(heading) * sensorDistance;

      // Draw sensor reading distance
      const maxDistance = 100; // mm
      const displayDistance = Math.min(sensors.distance, maxDistance);
      const sensorLength = (displayDistance / maxDistance) * 30 * this.scale;

      this.ctx.strokeStyle = '#ff6600';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(sensorX, sensorY);
      this.ctx.lineTo(
        sensorX + Math.cos(heading) * sensorLength,
        sensorY + Math.sin(heading) * sensorLength
      );
      this.ctx.stroke();
    }
  }

  /**
   * Draw grid
   */
  private drawGrid(): void {
    const gridSize = 50; // mm
    const canvasGridSize = gridSize * this.scale;

    this.ctx.strokeStyle = '#f0f0f0';
    this.ctx.lineWidth = 0.5;

    // Vertical lines
    for (let x = this.centerX % canvasGridSize; x < this.canvas.width; x += canvasGridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = this.centerY % canvasGridSize; y < this.canvas.height; y += canvasGridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  /**
   * Draw walls
   */
  private drawWalls(boardWidth: number, boardHeight: number): void {
    const canvasWidth = boardWidth * this.scale;
    const canvasHeight = boardHeight * this.scale;

    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(
      this.centerX - canvasWidth / 2,
      this.centerY - canvasHeight / 2,
      canvasWidth,
      canvasHeight
    );
  }

  /**
   * Draw label
   */
  private drawLabel(x: number, y: number, text: string, color: Color): void {
    this.ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x, y);
  }

  /**
   * Calculate canvas transform
   */
  private calculateTransform(): void {
    this.scale = 0.5; // Scale: 0.5 pixels per mm
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
  }

  /**
   * Convert world coordinates to canvas coordinates
   */
  private worldToCanvasX(worldX: number): number {
    return this.centerX + worldX * this.scale;
  }

  /**
   * Convert world coordinates to canvas coordinates
   */
  private worldToCanvasY(worldY: number): number {
    return this.centerY - worldY * this.scale; // Y is inverted in canvas
  }

  /**
   * Set scale
   */
  setScale(scale: number): void {
    this.scale = scale;
  }

  /**
   * Pan canvas
   */
  pan(dx: number, dy: number): void {
    this.centerX += dx;
    this.centerY += dy;
  }

  /**
   * Reset view
   */
  resetView(): void {
    this.calculateTransform();
  }
}
