/**
 * Complete Simulator Demo Component
 * Standalone demo showing all simulator features
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  RobotSimulator,
  SimulatorRenderer,
  CppSimulatorBridge,
  AIROC2026_MAZE,
  AIROC2026_DELIVERY,
  SIMPLE_LINE_FOLLOWING,
  OBSTACLE_AVOIDANCE,
  AVAILABLE_BOARDS,
} from '../simulator';

const DEMO_CODE_EXAMPLES: Record<string, string> = {
  simple: `Leanbot.begin();
LbMotion.runLR(200, 200);
LbDelay(2000);
LbMotion.stopAndWait();`,

  maze: `Leanbot.begin();
LbMotion.setZeroOrigin();
// Follow the maze
LbMotion.runLR(150, 150);
LbDelay(5000);
LbMotion.stopAndWait();`,

  turn: `Leanbot.begin();
// Go straight
LbMotion.runLR(200, 200);
LbDelay(1500);
// Turn right
LbMotion.runLR(200, 100);
LbDelay(1000);
// Go straight again
LbMotion.runLR(200, 200);
LbDelay(1500);
LbMotion.stopAndWait();`,

  complex: `Leanbot.begin();
// Move forward
LbMotion.runLR(200, 200);
LbDelay(1000);
// Turn left
LbMotion.runLR(100, 200);
LbDelay(800);
// Move forward
LbMotion.runLR(200, 200);
LbDelay(1500);
// Turn right sharply
LbMotion.runLR(200, 50);
LbDelay(500);
// Final forward
LbMotion.runLR(200, 200);
LbDelay(1000);
LbMotion.stopAndWait();
Serial.println("Mission complete!");`,
};

export const SimulatorDemo: React.FC<{ cppCode?: string }> = ({ cppCode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulatorRef = useRef<RobotSimulator | null>(null);
  const rendererRef = useRef<SimulatorRenderer | null>(null);
  const bridgeRef = useRef<CppSimulatorBridge | null>(null);
  const animationRef = useRef<number | null>(null);

  const [robotHeading, setRobotHeading] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<string>('synapse_city');
  const [selectedCode, setSelectedCode] = useState<string>('custom');
  const [showSensorDebug, setShowSensorDebug] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [logs, setLogs] = useState<string[]>(['Simulator ready']);
  const [stats, setStats] = useState({
    time: 0,
    frames: 0,
    posX: 0,
    posY: 0,
    heading: 0,
    speedL: 0,
    speedR: 0,
    irC: 0,
    distance: 0,
  });

  // Initialize simulator
  useEffect(() => {
    if (!canvasRef.current) return;

    const board = AVAILABLE_BOARDS[selectedBoard];
    if (!board) return;

    const simulator = new RobotSimulator();
    simulator.setBoard(board);

    const renderer = new SimulatorRenderer(canvasRef.current, simulator, board, {
      showGrid,
      showTrajectory,
      showSensorDebug,
    });

    const bridge = new CppSimulatorBridge(simulator);

    simulatorRef.current = simulator;
    rendererRef.current = renderer;
    bridgeRef.current = bridge;

    setRobotHeading(simulator.getRobotPose().heading);
    renderer.render();
    addLog(`Board loaded: ${board.name}`);
  }, [selectedBoard]);

  useEffect(() => {
    rendererRef.current?.setOptions({ showGrid, showTrajectory, showSensorDebug });
    rendererRef.current?.render();
  }, [showGrid, showTrajectory, showSensorDebug]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (
        !simulatorRef.current ||
        !rendererRef.current ||
        !isRunning ||
        isPaused
      ) {
        return;
      }

      const sim = simulatorRef.current;
      const rend = rendererRef.current;
      const bridge = bridgeRef.current;

      // Update simulation


      // Execute C++ code if loaded
      if (bridge) {
        try {
          bridge.executeStep(performance.now());
          if (!bridge.isExecuting()) { sim.stop(); setIsRunning(false); addLog('✓ Chương trình kết thúc'); }
        } catch (error) {
          sim.stop(); setIsRunning(false);
          addLog(`❌ ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Render
      rend.render();

      // Update stats
      const state = sim.getSimulationState();
      const readings = sim.getSensorReadings();
      setStats({
        time: state.currentTime / 1000,
        frames: state.history.length,
        posX: state.robotState.pose.x,
        posY: state.robotState.pose.y,
        heading: state.robotState.pose.heading,
        speedL: state.robotState.velocityLeft,
        speedR: state.robotState.velocityRight,
        irC: readings.irLine.center,
        distance: readings.distance || 0,
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning, isPaused]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev.slice(-19), `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleStart = () => {
    if (!simulatorRef.current || !bridgeRef.current) return;

    // Load and compile code
    const code = selectedCode === 'custom' ? (cppCode ?? '') : DEMO_CODE_EXAMPLES[selectedCode];
    const result = bridgeRef.current.loadCode(code);

    if (!result.success) {
      addLog(`❌ Error: ${result.error}`);
      return;
    }

    simulatorRef.current.start();
    simulatorRef.current.setMotorSpeeds(0, 0);
    bridgeRef.current.startExecution();
    setIsRunning(true);
    setIsPaused(false);

    addLog(selectedCode === 'custom' ? '▶ Chạy code C++ đang viết' : `▶ Chạy ví dụ ${selectedCode}`);
  };

  const handleStop = () => {
    if (!simulatorRef.current) return;
    bridgeRef.current?.stopExecution();
    simulatorRef.current.stop();
    setIsRunning(false);
    setIsPaused(false);
    addLog('⏹ Simulation stopped');
  };

  const handlePause = () => {
    if (!simulatorRef.current) return;
    if (isPaused) {
      simulatorRef.current.resume();
      setIsPaused(false);
      addLog('⏵ Simulation resumed');
    } else {
      simulatorRef.current.pause();
      setIsPaused(true);
      addLog('⏸ Simulation paused');
    }
  };

  const handleReset = () => {
    if (!simulatorRef.current || !rendererRef.current) return;
    simulatorRef.current.reset();
    setRobotHeading(simulatorRef.current.getRobotPose().heading);
    if (bridgeRef.current) {
      bridgeRef.current.reset();
    }
    setIsRunning(false);
    setIsPaused(false);
    rendererRef.current.render();
    addLog('🔄 Simulation reset');
  };

  const handleBoardChange = (board: string) => {
    setSelectedBoard(board);
    handleReset();
    addLog(`📍 Board changed to: ${AVAILABLE_BOARDS[board]?.name}`);
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#1e1e1e',
        color: '#d4d4d4',
        fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      }}
    >
      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            padding: '16px',
            backgroundColor: '#252526',
            borderBottom: '1px solid #3e3e42',
          }}
        >
          <h1 style={{ margin: '0 0 8px 0', fontSize: '20px' }}>
            🤖 Leanbot 2D Robot Simulator Demo
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: '#858585' }}>
            Real-time simulation with physics, sensors, and C++ code execution
          </p>
        </div>

        {/* Controls Toolbar */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px',
            backgroundColor: '#2d2d30',
            borderBottom: '1px solid #3e3e42',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          {/* Playback Controls */}
          <button
            onClick={handleStart}
            disabled={isRunning}
            style={{
              padding: '6px 12px',
              backgroundColor: isRunning ? '#444' : '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: isRunning ? 'default' : 'pointer',
              opacity: isRunning ? 0.5 : 1,
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            ▶ Start
          </button>

          <button
            onClick={handlePause}
            disabled={!isRunning}
            style={{
              padding: '6px 12px',
              backgroundColor: '#d9b14d',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: !isRunning ? 'default' : 'pointer',
              opacity: !isRunning ? 0.5 : 1,
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            {isPaused ? '⏵ Resume' : '⏸ Pause'}
          </button>

          <button
            onClick={handleStop}
            disabled={!isRunning}
            style={{
              padding: '6px 12px',
              backgroundColor: '#c41e3a',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: !isRunning ? 'default' : 'pointer',
              opacity: !isRunning ? 0.5 : 1,
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            ⏹ Stop
          </button>

          <button
            onClick={handleReset}
            style={{
              padding: '6px 12px',
              backgroundColor: '#6a7c8c',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            🔄 Reset
          </button>

          <label>Góc robot: <input aria-label="Góc robot" type="number" min="0" max="359" value={robotHeading} disabled={isRunning}
            style={{ width: '64px' }} onChange={e => {
              if (e.target.value === '') return;
              simulatorRef.current?.setHeading(Number(e.target.value));
              setRobotHeading(simulatorRef.current?.getRobotPose().heading ?? 0);
              rendererRef.current?.render();
            }} />°</label>
          <div style={{ flex: 1 }} />

          {/* Selectors */}
          <select
            value={selectedBoard}
            onChange={(e) => handleBoardChange(e.target.value)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#3e3e42',
              color: '#d4d4d4',
              border: '1px solid #555',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {Object.entries(AVAILABLE_BOARDS).map(([key, board]) => (
              <option key={key} value={key}>
                📍 {board.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#3e3e42',
              color: '#d4d4d4',
              border: '1px solid #555',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            <option value="custom">Code C++ đang viết</option>
            <option value="simple">Simple Movement</option>
            <option value="maze">Maze Navigation</option>
            <option value="turn">Turn and Go</option>
            <option value="complex">Complex Path</option>
          </select>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Canvas */}
          <div
            style={{
              flex: 2,
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid #3e3e42',
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                flex: 1,
                backgroundColor: '#ffffff',
                minHeight: 0,
              }}
            />
          </div>

          {/* Right Sidebar */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'auto',
              fontSize: '12px',
            }}
          >
            {/* Options */}
            <div
              style={{
                padding: '12px',
                borderBottom: '1px solid #3e3e42',
                backgroundColor: '#252526',
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>Options</h3>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '6px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                />
                Show Grid
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginBottom: '6px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={showTrajectory}
                  onChange={(e) => setShowTrajectory(e.target.checked)}
                />
                Trajectory
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={showSensorDebug}
                  onChange={(e) => setShowSensorDebug(e.target.checked)}
                />
                Sensor Debug
              </label>
            </div>

            {/* Statistics */}
            <div
              style={{
                padding: '12px',
                borderBottom: '1px solid #3e3e42',
                backgroundColor: '#252526',
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>Statistics</h3>
              <div style={{ fontFamily: 'monospace', lineHeight: '1.5' }}>
                <div>Time: {stats.time.toFixed(2)}s</div>
                <div>Frames: {stats.frames}</div>
                <div>Pos: ({stats.posX.toFixed(0)}, {stats.posY.toFixed(0)})</div>
                <div>Heading: {stats.heading.toFixed(1)}°</div>
                <div>Speed L/R: {stats.speedL.toFixed(0)} / {stats.speedR.toFixed(0)}</div>
                <div>IR Center: {stats.irC}</div>
                <div>Distance: {stats.distance.toFixed(1)}mm</div>
              </div>
            </div>

            {/* Code */}
            <div
              style={{
                padding: '12px',
                borderBottom: '1px solid #3e3e42',
                backgroundColor: '#252526',
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>C++ Code</h3>
              <pre
                style={{
                  margin: 0,
                  padding: '8px',
                  backgroundColor: '#1e1e1e',
                  borderRadius: '3px',
                  fontSize: '10px',
                  overflow: 'auto',
                  maxHeight: '150px',
                  color: '#ce9178',
                }}
              >
                {selectedCode === 'custom' ? cppCode : DEMO_CODE_EXAMPLES[selectedCode]}
              </pre>
            </div>

            {/* Logs */}
            <div
              style={{
                flex: 1,
                padding: '12px',
                overflow: 'auto',
                backgroundColor: '#1e1e1e',
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', fontSize: '13px' }}>Logs</h3>
              <div style={{ fontSize: '11px', fontFamily: 'monospace', lineHeight: '1.4' }}>
                {logs.map((log, i) => (
                  <div key={i} style={{ color: '#858585' }}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimulatorDemo;
