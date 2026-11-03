import React, { useEffect, useRef, useState } from 'react';
import { CppSimulatorBridge } from '../simulator/cppBridge';
import { RobotSimulator } from '../simulator/robotSimulator';
import { SimulatorRenderer, RendererOptions } from '../simulator/renderer';
import {
  AVAILABLE_BOARDS,
  getAllBoardNames,
  getBoardByName,
} from '../simulator/boardConfigs';
import { BoardConfig, Pose } from '../simulator/types';

interface SimulatorPanelProps {
  isVisible: boolean;
  cppCode?: string;
  onStatusChange?: (message: string) => void;
}

export const SimulatorPanel: React.FC<SimulatorPanelProps> = ({
  isVisible,
  cppCode,
  onStatusChange,
}) => {
  const bridgeRef = useRef<CppSimulatorBridge | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [simulator, setSimulator] = useState<RobotSimulator | null>(null);
  const [renderer, setRenderer] = useState<SimulatorRenderer | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<string>('synapse_city');
  const [showSensorDebug, setShowSensorDebug] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [robotHeading, setRobotHeading] = useState(0);
  const [robotSpeed, setRobotSpeed] = useState(200);
  const [elapsedTime, setElapsedTime] = useState(0);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize simulator
  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;

    const newSimulator = new RobotSimulator();
    const board = getBoardByName(selectedBoard);

    if (board) {
      newSimulator.setBoard(board);
    }

    const newRenderer = new SimulatorRenderer(canvasRef.current, newSimulator, board || AVAILABLE_BOARDS.simple_line_following, {
      showSensorDebug,
      showTrajectory,
      showGrid,
    });

    setRobotHeading(newSimulator.getRobotPose().heading);
    newRenderer.render();
    bridgeRef.current = new CppSimulatorBridge(newSimulator);
    setSimulator(newSimulator);
    setRenderer(newRenderer);

    // Handle canvas resize
    const handleResize = () => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && newRenderer) {
        newRenderer.resizeCanvas(rect.width, rect.height);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isVisible, selectedBoard]);

  // Animation loop
  useEffect(() => {
    if (!simulator || !renderer || !isRunning) return;

    const animate = () => {
      try {
        bridgeRef.current?.executeStep(performance.now());
        if (!bridgeRef.current?.isExecuting()) { simulator.stop(); setIsRunning(false); }
      } catch (error) {
        bridgeRef.current?.stopExecution();
        simulator.stop(); setIsRunning(false);
        onStatusChange?.(error instanceof Error ? error.message : String(error));
      }
      renderer.render();
      setElapsedTime(simulator.getSimulationState().currentTime / 1000);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [simulator, renderer, isRunning]);

  // Update renderer options
  useEffect(() => {
    if (renderer) {
      renderer.setOptions({
        showSensorDebug,
        showTrajectory,
        showGrid,
      });
    }
  }, [renderer, showSensorDebug, showTrajectory, showGrid]);

  const handleStart = () => {
    if (simulator) {
      const result = bridgeRef.current?.loadCode(cppCode ?? '');
      if (!result?.success) { onStatusChange?.(result?.error ?? 'Chưa có code C++'); return; }
      simulator.start();
      bridgeRef.current?.startExecution();
      setIsRunning(true);
      setIsPaused(false);
      onStatusChange?.('Simulation started');
    }
  };

  const handleStop = () => {
    if (simulator) {
      bridgeRef.current?.stopExecution();
      simulator.stop();
      setIsRunning(false);
      setIsPaused(false);
      onStatusChange?.('Simulation stopped');
    }
  };

  const handlePause = () => {
    if (simulator) {
      if (isPaused) {
        simulator.resume();
        setIsPaused(false);
        onStatusChange?.('Simulation resumed');
      } else {
        simulator.pause();
        setIsPaused(true);
        onStatusChange?.('Simulation paused');
      }
    }
  };

  const handleReset = () => {
    if (simulator) {
      bridgeRef.current?.reset();
      simulator.reset();
      setRobotHeading(simulator.getRobotPose().heading);
      setIsRunning(false);
      setIsPaused(false);
      setElapsedTime(0);
      if (renderer) {
        renderer.render();
      }
      onStatusChange?.('Simulation reset');
    }
  };

  const handleBoardChange = (boardName: string) => {
    setSelectedBoard(boardName);
    handleReset();
  };

  const handleHeadingChange = (heading: number) => {
    if (!simulator || isRunning || !Number.isFinite(heading)) return;
    simulator.setHeading(heading);
    setRobotHeading(simulator.getRobotPose().heading);
    renderer?.render();
  };

  const handleSpeedChange = (speed: number) => {
    setRobotSpeed(speed);

  };

  const boardNames = getAllBoardNames();

  return (
    <div
      className="simulator-panel"
      style={{
        display: isVisible ? 'flex' : 'none',
        flexDirection: 'column',
        height: '100%',
        borderTop: '1px solid var(--vscode-panel-border)',
      }}
    >
      {/* Toolbar */}
      <div
        className="simulator-toolbar"
        style={{
          display: 'flex',
          gap: '8px',
          padding: '8px',
          borderBottom: '1px solid var(--vscode-panel-border)',
          backgroundColor: 'var(--vscode-editor-background)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={handleStart}
          disabled={isRunning}
          style={{
            padding: '6px 12px',
            backgroundColor: isRunning ? '#444' : '#0e639c',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: isRunning ? 'default' : 'pointer',
            opacity: isRunning ? 0.5 : 1,
          }}
        >
          ▶ Start
        </button>

        <button
          onClick={handlePause}
          disabled={!isRunning}
          style={{
            padding: '6px 12px',
            backgroundColor: '#ce9178',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: !isRunning ? 'default' : 'pointer',
            opacity: !isRunning ? 0.5 : 1,
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
          }}
        >
          ⏹ Stop
        </button>

        <button
          onClick={handleReset}
          style={{
            padding: '6px 12px',
            backgroundColor: '#646695',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          🔄 Reset
        </button>

        <div style={{ flex: 1 }} />

        {/* Board selector */}
        <select
          value={selectedBoard}
          onChange={(e) => handleBoardChange(e.target.value)}
          style={{
            padding: '4px 8px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border)',
            borderRadius: '3px',
            cursor: 'pointer',
          }}
        >
          {boardNames.map((name) => (
            <option key={name} value={name}>
              {AVAILABLE_BOARDS[name]?.name || name}
            </option>
          ))}
        </select>
      </div>

      {/* Canvas */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'var(--vscode-editor-background)',
          overflow: 'auto',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            border: '1px solid var(--vscode-panel-border)',
            backgroundColor: '#ffffff',
          }}
        />
      </div>

      {/* Controls and info */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '8px',
          borderTop: '1px solid var(--vscode-panel-border)',
          backgroundColor: 'var(--vscode-editor-background)',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <label htmlFor="robot-heading">Góc robot:</label>
          <button disabled={isRunning} onClick={() => handleHeadingChange(robotHeading - 15)} aria-label="Xoay trái 15 độ">↶ −15°</button>
          <input id="robot-heading" type="number" min="0" max="359" step="1"
            value={robotHeading} disabled={isRunning}
            onChange={(e) => { if (e.target.value !== '') handleHeadingChange(Number(e.target.value)); }}
            style={{ width: '64px' }} />
          <span>°</span>
          <button disabled={isRunning} onClick={() => handleHeadingChange(robotHeading + 15)} aria-label="Xoay phải 15 độ">↷ +15°</button>
          <span>0° → · 90° ↓ · 180° ← · 270° ↑</span>
        </div>
        {/* Speed control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ minWidth: '80px' }}>Motor Speed:</label>
          <input
            type="range"
            min="0"
            max="500"
            disabled={true}
            title="Tốc độ do code C++ điều khiển"
            value={robotSpeed}
            onChange={(e) => handleSpeedChange(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ minWidth: '50px' }}>{robotSpeed} mm/s</span>
        </div>

        {/* Checkboxes */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            Show Grid
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={showTrajectory}
              onChange={(e) => setShowTrajectory(e.target.checked)}
            />
            Show Trajectory
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input
              type="checkbox"
              checked={showSensorDebug}
              onChange={(e) => setShowSensorDebug(e.target.checked)}
            />
            Sensor Debug
          </label>
        </div>

        {/* Info */}
        <div style={{ fontSize: '11px', color: 'var(--vscode-foreground)' }}>
          Time: {elapsedTime.toFixed(2)}s | Status:{' '}
          {isRunning ? (isPaused ? '⏸ Paused' : '▶ Running') : '⏹ Stopped'}
        </div>
      </div>
    </div>
  );
};
