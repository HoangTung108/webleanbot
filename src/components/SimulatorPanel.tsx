import React, { useEffect, useRef, useState } from 'react';
import { CppSimulatorBridge } from '../simulator/cppBridge';
import { RobotSimulator } from '../simulator/robotSimulator';
import { SimulatorRenderer, RendererOptions } from '../simulator/renderer';
import { SYNAPSE_CITY } from '../simulator/boardConfigs';
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
  const [showSensorDebug, setShowSensorDebug] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [robotHeading, setRobotHeading] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize simulator
  useEffect(() => {
    if (!isVisible || !canvasRef.current) return;

    const newSimulator = new RobotSimulator();
    const board = SYNAPSE_CITY;

    if (board) {
      newSimulator.setBoard(board);
    }

    const newRenderer = new SimulatorRenderer(canvasRef.current, newSimulator, board, {
      showSensorDebug,
      showTrajectory,
      showGrid,
    });

    setRobotHeading(newSimulator.getRobotPose().heading);
    newRenderer.render();
    bridgeRef.current = new CppSimulatorBridge(newSimulator);
    setSimulator(newSimulator);
    setRenderer(newRenderer);
    const detachPlacement = newRenderer.enablePlacement(pose => setRobotHeading(pose.heading));

    // Handle canvas resize
    const handleResize = () => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && newRenderer) {
        newRenderer.resizeCanvas(rect.width, rect.height);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => { detachPlacement(); window.removeEventListener('resize', handleResize); }; 
  }, [isVisible]);

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
        bridgeRef.current?.resetClock();
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

  const handleHeadingChange = (heading: number) => {
    if (!simulator || isRunning || !Number.isFinite(heading)) return;
    simulator.setHeading(heading);
    setRobotHeading(simulator.getRobotPose().heading);
    renderer?.render();
  };


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
          [&gt;] Start
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
          {isPaused ? '[>] Resume' : '[||] Pause'}
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
          [x] Stop
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
          [R] Reset
        </button>

        <div style={{ flex: 1 }} />

        <span>Synapse City · 4 ft × 4 ft</span>

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
          <button disabled={isRunning} onClick={() => handleHeadingChange(robotHeading - 15)} aria-label="Xoay trái 15 độ">[L] -15°</button>
          <input id="robot-heading" type="number" min="0" max="359" step="1"
            value={robotHeading} disabled={isRunning}
            onChange={(e) => { if (e.target.value !== '') handleHeadingChange(Number(e.target.value)); }}
            style={{ width: '64px' }} />
          <span>°</span>
          <button disabled={isRunning} onClick={() => handleHeadingChange(robotHeading + 15)} aria-label="Xoay phải 15 độ">[R] +15°</button>
          <span>0° [R] · 90° v · 180° [L] · 270° ^</span>
        </div>
        <div>Tốc độ do code C++ điều khiển · lệnh 2000: 70 mm/s (35 cm / 5 giây).</div>

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
          {isRunning ? (isPaused ? '[||] Paused' : '[>] Running') : '[x] Stopped'}
        </div>
      </div>
    </div>
  );
};
