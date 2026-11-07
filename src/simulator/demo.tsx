import { robotNetworkManager } from '../lib/robotNetworkManager';
import { MultiRobotConnector } from '../components/MultiRobotConnector';
import { LEANBOT_GEOMETRY } from './robotGeometry';
import { ScorePanel } from './ScorePanel';
import type { Pose } from './types';
import { calculateScore, createScoringMission, ROUND_LIMIT_MS, type ScoreCategory, type ScoreResult } from './scoring';
import { mountMissionEditor } from './missionEditor';
/**
 * Complete Simulator Demo Component
 * Standalone demo showing all simulator features
 */

import { Play, Pause, Square, RotateCcw, Terminal, Trash2, Maximize2, Settings2, CircleAlert, Info, CircleCheck, Code2, MapPin, Gauge, MousePointer2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import {
  RobotSimulator,
  SimulatorRenderer,
  CppSimulatorBridge,
  SYNAPSE_CITY,
} from '../simulator';

export const SimulatorDemo: React.FC<{ cppCode?: string }> = ({ cppCode }) => {
  const missionHostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulatorRef = useRef<RobotSimulator | null>(null);
  const rendererRef = useRef<SimulatorRenderer | null>(null);
  const bridgeRef = useRef<CppSimulatorBridge | null>(null);
  const animationRef = useRef<number | null>(null);

  const scoringStartPose = useRef<Pose|undefined>(undefined);
  const [scoreCategory, setScoreCategory] = useState<ScoreCategory>('explorer');
  const [scoreResult, setScoreResult] = useState<ScoreResult|null>(null);
  const [scoreReason, setScoreReason] = useState('');
  const [robotHeading, setRobotHeading] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSensorDebug, setShowSensorDebug] = useState(false);
  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [logs, setLogs] = useState<{ time: string; message: string; level: 'info' | 'error' | 'success' }[]>([]);
  const [followLogs, setFollowLogs] = useState(true);
  const logViewRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (followLogs && logViewRef.current) logViewRef.current.scrollTop = logViewRef.current.scrollHeight; }, [logs, followLogs]);
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
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  // Initialize simulator
  useEffect(() => {
    if (!canvasRef.current) return;

    const board = SYNAPSE_CITY;
    if (!board) return;

    const simulator = new RobotSimulator();
    simulator.setBoard(board);

    const renderer = new SimulatorRenderer(canvasRef.current, simulator, board, {
      showGrid,
      showTrajectory,
      showSensorDebug,
    });

    // Network rendering continues while the local program is stopped or paused.
    const networkTimer = setInterval(() => {
      if (robotNetworkManager.isConnected()) {
        const state = simulator.getSimulationState();
        robotNetworkManager.sendRobotState(simulator.getRobotPose(), state.robotState.velocityLeft, state.robotState.velocityRight);
      }
      renderer.setRemoteRobots(robotNetworkManager.getAllPeers());
      renderer.render();
    }, 50);
    const bridge = new CppSimulatorBridge(simulator);

    simulatorRef.current = simulator;
    rendererRef.current = renderer;
    bridgeRef.current = bridge;

    // Initialize speed multiplier
    simulator.setSpeedMultiplier(1);
    setSpeedMultiplier(1);

    const initialPose = simulator.getRobotPose();
    setRobotHeading(initialPose.heading);
    setStats(prev => ({...prev,posX:initialPose.x,posY:initialPose.y,heading:initialPose.heading}));
    const detachMission = missionHostRef.current ? mountMissionEditor(missionHostRef.current, simulator.mission, {
      canvas: canvasRef.current,
      toBoard: (x,y) => renderer.clientToBoard(x,y),
      locked: () => simulator.getSimulationState().isRunning,
      pose: () => simulator.getRobotPose(), render: () => renderer.render(),
    }) : () => {};
    const detachScoring = simulator.mission.subscribe(() => setScoreResult(null));
    const detachPlacement = renderer.enablePlacement(pose => { setScoreResult(null); setRobotHeading(pose.heading); setStats(prev => ({...prev,posX:pose.x,posY:pose.y,heading:pose.heading})); });
    const resize = () => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) { renderer.resizeCanvas(rect.width, rect.height); renderer.render(); }
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    if (canvasRef.current.parentElement) observer?.observe(canvasRef.current.parentElement);
    window.addEventListener('resize', resize);
    resize();
    renderer.render();
    addLog(`Đã tải sa bàn: ${board.name}`);
    return () => { clearInterval(networkTimer); detachScoring(); detachMission(); detachPlacement(); observer?.disconnect(); window.removeEventListener('resize', resize); bridge.stopExecution(); simulator.stop(); };
  }, []);

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
          if (!bridge.isExecuting()) { sim.stop(); setIsRunning(false); finishScore(bridge.getCompletionReason()==='time-limit'?'Hết 2 phút · STOP':'C++ đã kết thúc'); addLog(bridge.getCompletionReason()==='time-limit'?'[OK] Hết 2 phút, đã dừng robot':'[OK] Chương trình kết thúc'); }
        } catch (error) {
          sim.stop(); setIsRunning(false);
          if (sim.getFallState().status === 'fallen') finishScore('Robot bị rơi · điểm hiện trạng');
          addLog(`[ERROR] ${error instanceof Error ? error.message : String(error)}`);
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
    const level = message.includes('[ERROR]') || message.includes('Chưa có code') ? 'error' : message.includes('Đã tải sa bàn') || message.includes('Chạy code') ? 'success' : 'info';
    const text = message.replace(/^\[(?:ERROR|>|x|R|\|\|)\]\s*/, '');
    setLogs(prev => message.startsWith('Đã tải sa bàn:') && prev.some(log => log.message === text) ? prev : [...prev.slice(-199), { time: new Date().toLocaleTimeString('vi-VN', { hour12: false }), message: text, level }]);
  };

  const finishScore = (reason: string) => {
    const sim=simulatorRef.current;
    if (!sim) return;
    // V6 §11.4 scores final resting positions; let released models coast/settle.
    for(let i=0;i<1000&&sim.mission.hasMotion;i++)sim.mission.step(.005,sim.getRobotPose(),0,0);
    rendererRef.current?.render();
    const result=calculateScore(SYNAPSE_CITY,sim.mission.blocks,scoreCategory,[{pose:sim.getRobotPose(),startPose:scoringStartPose.current,fallen:sim.getFallState().status!=='supported'}]);
    setScoreResult(result);setScoreReason(reason);
    addLog(`Raw Score V6: ${result.total} · ${reason}`);
  };

  const handleStart = () => {
    if (!simulatorRef.current || !bridgeRef.current) return;

    if (simulatorRef.current.getFallState().status !== 'supported') { addLog('[ERROR] Đặt lại hoặc kéo robot về sa bàn trước khi chạy.'); return; }
    // Load and compile code
    const code = cppCode ?? '';
    if (!code.trim()) { addLog('Chưa có code C++. Hãy mở hoặc viết code trong IDE.'); return; }
    const result = bridgeRef.current.loadCode(code);

    if (!result.success) {
      addLog(`[ERROR] Error: ${result.error}`);
      return;
    }

    setScoreResult(null);
    scoringStartPose.current=simulatorRef.current.getRobotPose();
    simulatorRef.current.start();
    simulatorRef.current.setMotorSpeeds(0, 0);
    bridgeRef.current.startExecution();
    setIsRunning(true);
    setIsPaused(false);

    addLog('[>] Chạy code C++');
  };

  const handleStop = () => {
    if (!simulatorRef.current) return;
    bridgeRef.current?.stopExecution();
    simulatorRef.current.stop();
    setIsRunning(false);
    setIsPaused(false);
    setStats(prev => ({...prev,speedL:0,speedR:0}));
    finishScore('STOP · kết thúc lượt');
    addLog('Đã dừng mô phỏng');
  };

  const handlePause = () => {
    if (!simulatorRef.current) return;
    if (isPaused) {
      bridgeRef.current?.resetClock();
      simulatorRef.current.resume();
      setIsPaused(false);
      addLog('Đã tiếp tục mô phỏng');
    } else {
      simulatorRef.current.pause();
      setIsPaused(true);
      addLog('Đã tạm dừng mô phỏng');
    }
  };

  const handleReset = () => {
    if (!simulatorRef.current || !rendererRef.current) return;
    setScoreResult(null);scoringStartPose.current=undefined;
    simulatorRef.current.reset();
    simulatorRef.current.setSpeedMultiplier(1);
    setRobotHeading(simulatorRef.current.getRobotPose().heading);
    setSpeedMultiplier(1);
    if (bridgeRef.current) {
      bridgeRef.current.reset();
    }
    setIsRunning(false);
    setIsPaused(false);
    rendererRef.current.render();
    const pose = simulatorRef.current.getRobotPose();
    setStats({time:0,frames:0,posX:pose.x,posY:pose.y,heading:pose.heading,speedL:0,speedR:0,irC:0,distance:0});
    addLog('Đã đặt lại mô phỏng');
  };

  const handleSpeedChange = (multiplier: number) => {
    if (!simulatorRef.current) return;
    if (isRunning && !isPaused) {
      try {
        bridgeRef.current?.executeStep(performance.now());
        if (!bridgeRef.current?.isExecuting()) { simulatorRef.current.stop(); setIsRunning(false); finishScore(bridgeRef.current?.getCompletionReason()==='time-limit'?'Hết 2 phút · STOP':'C++ đã kết thúc'); }
      } catch (error) {
        handleStop();
        addLog(`[ERROR] ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
    }
    simulatorRef.current.setSpeedMultiplier(multiplier);
    setSpeedMultiplier(multiplier);
  };


  const fallStatus = simulatorRef.current?.getFallState().status;
  const status = fallStatus === 'falling' ? 'Đang rơi' : fallStatus === 'fallen' ? 'Đã rơi' : isPaused ? 'Tạm dừng' : isRunning ? 'Đang chạy' : 'Sẵn sàng';
  return (
    <div className="simulator-shell sim-studio">
      <header className="sim-heading">
        <div><span className="sim-eyebrow">KHÔNG GIAN THỬ NGHIỆM</span><h1>Giả lập Leanbot</h1></div>
        <span className={`sim-status ${fallStatus && fallStatus !== 'supported' ? 'fallen' : isRunning && !isPaused ? 'running' : ''}`}><span />{status}</span>
      </header>
      <div className="sim-toolbar" role="toolbar" aria-label="Điều khiển mô phỏng">
        <MultiRobotConnector />
        <div className="sim-playback">
          <button className="sim-button primary" onClick={handleStart} disabled={isRunning}><Play size={15} />Chạy</button>
          <button className="sim-button" onClick={handlePause} disabled={!isRunning}>{isPaused ? <Play size={15} /> : <Pause size={15} />}{isPaused ? 'Tiếp tục' : 'Tạm dừng'}</button>
          <button className="sim-button stop" onClick={handleStop} disabled={!isRunning}><Square size={14} />Dừng</button>
          <button className="sim-button icon-only" onClick={handleReset} title="Đặt lại mô phỏng" aria-label="Đặt lại mô phỏng"><RotateCcw size={16} /></button>
          {/* Speed multiplier controls */}
          <div className="sim-speed" role="group" aria-label="Tốc độ mô phỏng"><span>Tua</span>{[1,2,5,10].map(speed => <button key={speed} className="sim-button" aria-pressed={speedMultiplier === speed} onClick={() => handleSpeedChange(speed)} title={`Tốc độ ${speed} lần`}>{speed}×</button>)}</div>
        </div>
        <label className="sim-heading-input">Hướng robot <input aria-label="Góc robot" type="number" min="0" max="359" value={robotHeading} disabled={isRunning} onChange={e => {
          if (e.target.value === '') return;
          setScoreResult(null);
          simulatorRef.current?.setHeading(Number(e.target.value));
          const heading = simulatorRef.current?.getRobotPose().heading ?? 0;
          setRobotHeading(heading);
          setStats(prev => ({...prev,heading}));
          rendererRef.current?.render();
        }} /><span>°</span></label>
        <span className="sim-toolbar-note">Còn {Math.ceil(Math.max(0,ROUND_LIMIT_MS/1000-stats.time))} s / 120 s</span>
      </div>
      <div className="sim-layout">
        <div className="sim-main">
          <section className="sim-field" ref={fieldRef} aria-label="Sa bàn Synapse City">
            <div className="sim-section-heading"><div><MapPin size={15} /><strong>Synapse City · 4 ft × 4 ft</strong></div><button className="sim-button icon-only" title="Toàn màn hình sa bàn" aria-label="Toàn màn hình sa bàn" onClick={() => { void fieldRef.current?.requestFullscreen?.().catch(() => addLog('[ERROR] Không mở được toàn màn hình.')); }}><Maximize2 size={15} /></button></div>
            <div className="sim-canvas-wrap"><canvas ref={canvasRef} aria-label="Sa bàn và robot" /></div>
            <div className="sim-field-caption"><MousePointer2 size={13} /><span>Kéo để đặt robot · Đi qua mép sa bàn có thể rơi</span><span>2000 = 32,5 cm / 5 giây</span></div>
          </section>
          <section className="sim-log-panel" aria-label="Nhật ký mô phỏng">
            <div className="sim-section-heading"><div><Terminal size={15} /><strong>Nhật ký</strong><span className="sim-count">{logs.length}</span></div><div><label className="sim-follow"><input type="checkbox" checked={followLogs} onChange={e => setFollowLogs(e.target.checked)} />Theo dõi</label><button className="sim-button icon-only" aria-label="Xóa nhật ký" title="Xóa nhật ký" disabled={!logs.length} onClick={() => setLogs([])}><Trash2 size={14} /></button></div></div>
            <div className="sim-log-entries" ref={logViewRef} role="log" aria-live="polite" aria-relevant="additions">
              {logs.length === 0 ? <p className="sim-empty-log">Chưa có hoạt động. Chạy chương trình để xem kết quả tại đây.</p> : logs.map((log, i) => <div className={`sim-log-row ${log.level}`} key={`${log.time}-${i}`}><time>{log.time}</time>{log.level === 'error' ? <CircleAlert size={13} /> : log.level === 'success' ? <CircleCheck size={13} /> : <Info size={13} />}<span>{log.message}</span></div>)}
            </div>
          </section>
        </div>
        <aside className="sim-inspector" aria-label="Thiết lập mô phỏng">
          <ScorePanel key={scoreCategory} category={scoreCategory} result={scoreResult} reason={scoreReason} running={isRunning} onCategory={value=>{setScoreCategory(value);setScoreResult(null)}} onCalculate={()=>finishScore('Chấm hiện trạng thủ công')} onGenerate={()=>{
            const sim=simulatorRef.current;if(!sim)return;
            handleReset();createScoringMission(sim.mission,scoreCategory,Math.floor(Math.random()*4294967296));
            setScoreResult(null);rendererRef.current?.render();addLog(`Đã tạo nhiệm vụ ${scoreCategory}`);
          }}/>

          <section className="sim-telemetry"><div className="sim-section-heading"><div><Gauge size={15} /><strong>Trạng thái robot</strong></div><span>Trực tiếp</span></div>
            <p className="sim-robot-specs">{LEANBOT_GEOMETRY.length} × {LEANBOT_GEOMETRY.width} × {LEANBOT_GEOMETRY.height} mm · {LEANBOT_GEOMETRY.mass*1000} g</p><dl className="sim-metrics"><div><dt>Thời gian</dt><dd>{stats.time.toFixed(1)}<small>s</small></dd></div><div><dt>Hướng</dt><dd>{stats.heading.toFixed(0)}<small>°</small></dd></div><div><dt>Vị trí X / Y</dt><dd>{stats.posX.toFixed(0)} / {stats.posY.toFixed(0)}<small>mm</small></dd></div><div><dt>Tốc độ trái / phải</dt><dd>{stats.speedL.toFixed(0)} / {stats.speedR.toFixed(0)}<small>mm/s</small></dd></div></dl>
          </section>
          <details className="sim-settings" open><summary><Settings2 size={15} />Hiển thị sa bàn</summary><div className="sim-options"><label><input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} />Lưới tọa độ</label><label><input type="checkbox" checked={showTrajectory} onChange={e => setShowTrajectory(e.target.checked)} />Đường di chuyển</label><label><input type="checkbox" checked={showSensorDebug} onChange={e => setShowSensorDebug(e.target.checked)} />Cảm biến</label></div></details>
          <details className="sim-settings" open><summary><MapPin size={15} />Khối nhiệm vụ</summary><div ref={missionHostRef} /></details>
          <details className="sim-settings"><summary><Code2 size={15} />Chương trình C++</summary><pre className="sim-code">{cppCode?.trim() ? cppCode : 'Chưa có code C++. Mở hoặc viết code trong IDE.'}</pre></details>
        </aside>
      </div>
    </div>
  );
};

export default SimulatorDemo;
