/**
 * Example: Leanbot Robot Simulator Integration
 * Shows how to integrate the simulator into your application
 */

import React, { useState } from 'react';
import {
  RobotSimulator,
  SimulatorRenderer,
  CppSimulatorBridge,
  AIROC2026_MAZE,
} from './index';
import { SimulatorPanel } from '../components/SimulatorPanel';

/**
 * Example 1: Basic Simulator Usage
 */
export function BasicSimulatorExample() {
  const [simulatorCode, setSimulatorCode] = useState(`
Leanbot.begin();
LbMotion.runLR(200, 200);
LbDelay(2000);
LbMotion.runLR(150, 250);
LbDelay(1000);
LbMotion.stopAndWait();
  `);

  return (
    <div>
      <h2>Leanbot Robot Simulator Example</h2>
      <SimulatorPanel
        isVisible={true}
        cppCode={simulatorCode}
        onStatusChange={(msg) => console.log(`Simulator: ${msg}`)}
      />
    </div>
  );
}

/**
 * Example 2: Direct Simulator Control
 */
export function DirectSimulatorControl() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const simulatorRef = React.useRef<RobotSimulator | null>(null);
  const rendererRef = React.useRef<SimulatorRenderer | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const initializeSimulator = () => {
    if (!canvasRef.current) return;

    const simulator = new RobotSimulator();
    simulator.setBoard(AIROC2026_MAZE);

    const renderer = new SimulatorRenderer(
      canvasRef.current,
      simulator,
      AIROC2026_MAZE,
      {
        showGrid: true,
        showTrajectory: true,
        showSensorDebug: false,
      }
    );

    simulatorRef.current = simulator;
    rendererRef.current = renderer;
    renderer.render(); // Initial render
  };

  const handleStart = () => {
    if (simulatorRef.current) {
      simulatorRef.current.start();
      simulatorRef.current.setMotorSpeeds(200, 200);
      setIsRunning(true);
    }
  };

  const handleStop = () => {
    if (simulatorRef.current) {
      simulatorRef.current.stop();
      setIsRunning(false);
    }
  };

  const animate = () => {
    if (simulatorRef.current && rendererRef.current && isRunning) {
      simulatorRef.current.update();
      rendererRef.current.render();
      requestAnimationFrame(animate);
    }
  };

  React.useEffect(() => {
    initializeSimulator();
  }, []);

  React.useEffect(() => {
    if (isRunning) {
      animate();
    }
  }, [isRunning]);

  return (
    <div>
      <h2>Direct Simulator Control</h2>
      <button onClick={handleStart} disabled={isRunning}>
        Start
      </button>
      <button onClick={handleStop} disabled={!isRunning}>
        Stop
      </button>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: '1px solid black' }}
      />
    </div>
  );
}

/**
 * Example 3: C++ Code Execution
 */
export function CppCodeExecutionExample() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const simulatorRef = React.useRef<RobotSimulator | null>(null);
  const bridgeRef = React.useRef<CppSimulatorBridge | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const cppCode = `
Leanbot.begin();

// Move forward
LbMotion.runLR(200, 200);
LbDelay(2000);

// Turn right
LbMotion.runLR(200, 100);
LbDelay(1000);

// Move forward again
LbMotion.runLR(200, 200);
LbDelay(1500);

// Stop
LbMotion.stopAndWait();
Serial.println("Task completed!");
  `;

  const initializeSimulator = () => {
    if (!canvasRef.current) return;

    const simulator = new RobotSimulator();
    simulator.setBoard(AIROC2026_MAZE);

    const renderer = new SimulatorRenderer(
      canvasRef.current,
      simulator,
      AIROC2026_MAZE
    );

    const bridge = new CppSimulatorBridge(simulator);

    // Load and compile C++ code
    const result = bridge.loadCode(cppCode);
    if (!result.success) {
      setLogs([`Error: ${result.error}`]);
      return;
    }

    simulatorRef.current = simulator;
    bridgeRef.current = bridge;

    // Update logs with parsed commands
    setLogs(['Loaded C++ program for simulation']);
  };

  const handleRunCode = () => {
    if (!simulatorRef.current || !bridgeRef.current) return;

    simulatorRef.current.start();
    bridgeRef.current.startExecution();
    setIsRunning(true);

    // Animation loop
    const animate = () => {
      const time = simulatorRef.current!.getSimulationState().currentTime;
      bridgeRef.current!.executeStep(performance.now());

      setLogs((prev) => [
        ...prev.slice(-50), // Keep last 50 logs
        `Time: ${time}ms`,
      ]);

      if (
        bridgeRef.current!.isExecuting()
      ) {
        requestAnimationFrame(animate);
      } else {
        setIsRunning(false);
      }
    };

    animate();
  };

  React.useEffect(() => {
    initializeSimulator();
  }, []);

  return (
    <div>
      <h2>C++ Code Execution in Simulator</h2>
      <button onClick={handleRunCode} disabled={isRunning}>
        Run C++ Code
      </button>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: '1px solid black', marginTop: '10px' }}
      />
      <div style={{ marginTop: '10px', fontSize: '12px', maxHeight: '150px', overflow: 'auto' }}>
        <h4>Logs:</h4>
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
      </div>
    </div>
  );
}

/**
 * Example 4: Custom Board
 */
export function CustomBoardExample() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const customBoard = {
    name: 'Custom Racing Track',
    width: 2000,
    height: 1000,
    walls: [
      { id: 'north', x1: 0, y1: 0, x2: 2000, y2: 0 },
      { id: 'south', x1: 0, y1: 1000, x2: 2000, y2: 1000 },
      { id: 'west', x1: 0, y1: 0, x2: 0, y2: 1000 },
      { id: 'east', x1: 2000, y1: 0, x2: 2000, y2: 1000 },
    ],
    obstacles: [
      { id: 'obs1', x: 500, y: 500, width: 100, height: 100 },
      { id: 'obs2', x: 1500, y: 500, width: 100, height: 100 },
    ],
    lines: [
      {
        id: 'track',
        points: [
          { x: 100, y: 500 },
          { x: 400, y: 500 },
          { x: 400, y: 200 },
          { x: 1600, y: 200 },
          { x: 1600, y: 800 },
          { x: 400, y: 800 },
          { x: 400, y: 500 },
          { x: 1900, y: 500 },
        ],
        width: 50,
        color: '#000000',
      },
    ],
    metadata: {
      name: 'Custom Racing Track',
      type: 'custom',
    },
  };

  React.useEffect(() => {
    if (!canvasRef.current) return;

    const simulator = new RobotSimulator();
    simulator.setBoard(customBoard as any);

    const renderer = new SimulatorRenderer(
      canvasRef.current,
      simulator,
      customBoard as any
    );

    simulator.start();
    simulator.setMotorSpeeds(150, 150);

    const animate = () => {
      simulator.update();
      renderer.render();
      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <div>
      <h2>Custom Board Example</h2>
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{ border: '1px solid black' }}
      />
    </div>
  );
}

// Export all examples
export const SimulatorExamples = {
  BasicExample: BasicSimulatorExample,
  DirectControl: DirectSimulatorControl,
  CppExecution: CppCodeExecutionExample,
  CustomBoard: CustomBoardExample,
};
