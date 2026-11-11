import {MOTION_CALIBRATION} from './motionCalibration';
import { HeadingDial } from './HeadingDial';
import { SimulatorDock } from './SimulatorDock';
import { RoutePlannerPanel } from './RoutePlannerPanel';
import type {OnlineCompetitionState,OnlineCommand} from './onlineCompetition';
import {CompetitionFlow,COMPETITION_PHASE_LABELS} from './competitionFlow';
import {CompetitionPanel,type CompetitionAction} from './CompetitionPanel';
import { robotNetworkManager } from '../lib/robotNetworkManager';
import { MultiRobotConnector } from '../components/MultiRobotConnector';
import { LEANBOT_GEOMETRY } from './robotGeometry';
import { ScorePanel } from './ScorePanel';
import type { Pose } from './types';
import { calculateScore, createScoringMission, SCORE_CATEGORIES, ROUND_LIMIT_MS, type ScoreCategory, type ScoreResult } from './scoring';
import { mountMissionEditor } from './missionEditor';
/**
 * Complete Simulator Demo Component
 * Standalone demo showing all simulator features
 */

import { Play, Pause, Square, RotateCcw, Terminal, Trash2, Maximize2, Minimize2, Settings2, CircleAlert, Info, CircleCheck, MapPin, Gauge, MousePointer2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import {
  RobotSimulator,
  SimulatorRenderer,
  CppSimulatorBridge,
  SYNAPSE_CITY,
} from '../simulator';

export const SimulatorDemo: React.FC<{ cppCode?: string;visible?:boolean;onCodeLockChange?:(locked:boolean)=>void }> = ({ cppCode,visible=true,onCodeLockChange }) => {
  const [activeDock, setActiveDock] = useState<string | null>(null);
  const [routeToolsHost, setRouteToolsHost] = useState<HTMLDivElement | null>(null);
  const [routePreviewHost, setRoutePreviewHost] = useState<HTMLDivElement | null>(null);
  const activeDockRef = useRef<string | null>(null);
  const missionHostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulatorRef = useRef<RobotSimulator | null>(null);
  const rendererRef = useRef<SimulatorRenderer | null>(null);
  const bridgeRef = useRef<CppSimulatorBridge | null>(null);
  const animationRef = useRef<number | null>(null);

  const flowRef=useRef(new CompetitionFlow());
  const competitionEnabled=useRef(false);
  const onlineRef=useRef<OnlineCompetitionState|null>(null);
  const frozenOnlineCode=useRef('');
  const sendOnline=(command:OnlineCommand)=>robotNetworkManager.sendCompetitionCommand(command);
  const [competitionMode,setCompetitionMode]=useState(false);
  const [flowVersion,setFlowVersion]=useState(0);
  const visibleRef=useRef(visible);visibleRef.current=visible;
  const refreshFlow=()=>setFlowVersion(v=>v+1);
  useEffect(()=>{onCodeLockChange?.(competitionMode&&flowRef.current.locked);},[competitionMode,flowVersion,onCodeLockChange]);
  useEffect(()=>()=>onCodeLockChange?.(false),[onCodeLockChange]);
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
  const [fieldFullscreen, setFieldFullscreen] = useState(false);
  useEffect(() => {
    const syncFullscreen = () => setFieldFullscreen(document.fullscreenElement === fieldRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    syncFullscreen();
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);
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
    let peerSignature = "";
    const updatePeers=(render=true)=>{
      const peers=robotNetworkManager.getAllPeers();
      const signature=peers.map(p=>`${p.id}:${p.pose.x}:${p.pose.y}:${p.pose.heading}:${p.gripper?.left}:${p.gripper?.right}:${p.supported}:${p.rgb?.join(',')}`).join('|');
      if(signature!==peerSignature) {
        peerSignature=signature;renderer.setRemoteRobots(peers);
        const state=simulator.getSimulationState();
        if(render&&(!state.isRunning||state.isPaused))renderer.render();
      }
    };
    const onPeerUpdate=()=>updatePeers();
    const peerEvents=['state-sync','peer-left','disconnected'] as const;
    peerEvents.forEach(event=>robotNetworkManager.on(event,onPeerUpdate));
    const networkTimer = setInterval(() => {
      if (robotNetworkManager.isConnected()&&!onlineRef.current) {
        const state = simulator.getSimulationState();
        robotNetworkManager.sendRobotState(simulator.getRobotPose(),state.robotState.velocityLeft,state.robotState.velocityRight,{gripper:simulator.getGripper(),supported:simulator.getFallState().status==='supported'});
      }
      updatePeers();
    }, 50);
    const onCorrection=(event:{data?:any})=>{
      if(onlineRef.current)return;
      updatePeers(false);
      simulator.applyNetworkPose(event.data?.pose);
      const state=simulator.getSimulationState();
      if(!state.isRunning||state.isPaused) {
        const pose=simulator.getRobotPose();setStats(prev=>({...prev,posX:pose.x,posY:pose.y,heading:pose.heading}));
        setRobotHeading(pose.heading);renderer.render();
      }
      setScoreResult(null);
    };
    robotNetworkManager.on('pose-correction',onCorrection);
    const onOnline=(event:{data?:OnlineCompetitionState|null})=>{
      const state=event.data??null,previous=onlineRef.current;onlineRef.current=state;
      if(!state){
        if(previous){simulator.releaseOnlinePresentation();competitionEnabled.current=false;setCompetitionMode(false);flowRef.current=new CompetitionFlow();setIsRunning(false);refreshFlow();}
        return;
      }
      bridgeRef.current?.stopExecution();
      competitionEnabled.current=true;setCompetitionMode(true);
      const me=state.players.find(p=>p.id===robotNetworkManager.getClientId());
      const displayTimeMs=state.phase==='preparation'?(me?.simulationTimeMs??0):state.elapsedMs;
      if(me)simulator.presentOnline(me,displayTimeMs);
      simulator.mission.blocks=state.blocks.map(b=>({...b}));simulator.mission.hidePollutionColors=state.hiddenColors;
      simulator.mission.changed();updatePeers(false);
      setIsRunning(state.phase==='running'||state.players.some(p=>p.programRunning));setIsPaused(false);
      setSpeedMultiplier(state.rate);
      if(me){setRobotHeading(me.pose.heading);setStats(prev=>({...prev,time:displayTimeMs/1000,posX:me.pose.x,posY:me.pose.y,heading:me.pose.heading,speedL:me.motorLeft,speedR:me.motorRight}));}
      if(!previous||previous.sessionId!==state.sessionId||previous.revision!==state.revision){
        const flow=new CompetitionFlow();flow.phase=state.phase;flow.round=state.round;flow.category=state.category;
        flow.layout=state.layout;flow.records=state.records;flow.localCodeLocked=me?.locked??false;flow.frozenCode=frozenOnlineCode.current;
        flowRef.current=flow;setScoreCategory(state.category);refreshFlow();
        const last=state.records.at(-1);setScoreResult(state.phase==='finished'||state.phase==='complete'?last?.score??null:null);setScoreReason(last?.reason??'');
        addLog(`Online · Vòng ${state.round}: ${COMPETITION_PHASE_LABELS[state.phase]}`);
      }
      if(state.notice&&state.notice!==previous?.notice)addLog(`[ERROR] ${state.notice}`);
      if(visibleRef.current)renderer.render();
    };
    const onConnected=()=>{if(!onlineRef.current&&competitionEnabled.current){bridgeRef.current?.stopExecution();simulator.stop();competitionEnabled.current=false;setCompetitionMode(false);setIsRunning(false);flowRef.current=new CompetitionFlow();refreshFlow();}};
    robotNetworkManager.on('connected',onConnected);
    const onNetworkError=(event:{error?:string})=>addLog(`[ERROR] ${event.error??'Lỗi mạng'}`);
    const onDisconnected=()=>{
      if(!onlineRef.current)return;
      onlineRef.current=null;competitionEnabled.current=false;flowRef.current=new CompetitionFlow();
      simulator.releaseOnlinePresentation();setCompetitionMode(false);setIsRunning(false);refreshFlow();
      addLog('[ERROR] Mất kết nối: phiên thi đã dừng trên máy chủ. Kết nối lại hoặc tạo phòng mới để tiếp tục.');
    };
    robotNetworkManager.on('competition-state',onOnline);robotNetworkManager.on('error',onNetworkError);robotNetworkManager.on('disconnected',onDisconnected);

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
      locked: () => activeDockRef.current !== 'mission'||competitionEnabled.current||simulator.getSimulationState().isRunning,
      pose: () => simulator.getRobotPose(), render: () => renderer.render(),
    }) : () => {};
    const detachScoring = simulator.mission.subscribe(() => {if(!onlineRef.current)setScoreResult(null);});
    const detachPlacement = renderer.enablePlacement(pose => { setScoreResult(null); setRobotHeading(pose.heading); setStats(prev => ({...prev,posX:pose.x,posY:pose.y,heading:pose.heading})); },()=>!competitionEnabled.current||(['setup','preparation'].includes(flowRef.current.phase)&&!flowRef.current.locked),pose=>{if(!onlineRef.current)return false;sendOnline({action:'place-robot',pose});return true;});
    const resize = () => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) { renderer.resizeCanvas(rect.width, rect.height); renderer.render(); }
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    if (canvasRef.current.parentElement) observer?.observe(canvasRef.current.parentElement);
    window.addEventListener('resize', resize);
    const visibilityClock=()=>bridge.resetClock(performance.now());
    document.addEventListener('visibilitychange',visibilityClock);
    resize();
    renderer.render();
    addLog(`Đã tải sa bàn: ${board.name}`);
    return () => { robotNetworkManager.off('connected',onConnected);robotNetworkManager.off('competition-state',onOnline);robotNetworkManager.off('error',onNetworkError);robotNetworkManager.off('disconnected',onDisconnected);clearInterval(networkTimer); peerEvents.forEach(event=>robotNetworkManager.off(event,onPeerUpdate)); robotNetworkManager.off('pose-correction',onCorrection); detachScoring(); detachMission(); detachPlacement(); observer?.disconnect(); window.removeEventListener('resize', resize); document.removeEventListener('visibilitychange',visibilityClock); bridge.stopExecution(); simulator.stop(); };
  }, []);

  useEffect(() => {
    rendererRef.current?.setOptions({ showGrid, showTrajectory, showSensorDebug });
    rendererRef.current?.render();
  }, [showGrid, showTrajectory, showSensorDebug]);

  // Animation loop
  useEffect(() => {
    let lastStats = -Infinity;
    const animate = () => {
      if (
        !simulatorRef.current ||
        !rendererRef.current ||
        !!onlineRef.current ||
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
          bridge.executeStep(performance.now(),8);
          if (!bridge.isExecuting()) { sim.stop(); setIsRunning(false); finishScore(bridge.getCompletionReason()==='time-limit'?'Hết 2 phút · STOP':'C++ đã kết thúc'); addLog(bridge.getCompletionReason()==='time-limit'?'[OK] Hết 2 phút, đã dừng robot':'[OK] Chương trình kết thúc'); }
        } catch (error) {
          sim.stop(); setIsRunning(false);
          if (sim.getFallState().status === 'fallen') finishScore('Robot bị rơi · điểm hiện trạng');
          addLog(`[ERROR] ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // Render
      if(visibleRef.current)rend.render();

      // Update stats
      const state = sim.getSimulationState();
      const readings = sim.getSensorReadings();
      const now=performance.now();
      if(now-lastStats>=100||!bridge?.isExecuting()) {
        lastStats=now;
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
      }

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
    if(competitionEnabled.current&&flowRef.current.phase==='preparation') {addLog('Lượt tập kết thúc · cấu hình chuẩn bị được giữ nguyên');return;}
    // V6 §11.4 scores final resting positions; let released models coast/settle.
    for(let i=0;i<1000&&sim.mission.hasMotion;i++)sim.mission.step(.005,sim.getRobotPose(),0,0);
    rendererRef.current?.render();
    const result=calculateScore(SYNAPSE_CITY,sim.mission.blocks,scoreCategory,[{pose:sim.getRobotPose(),startPose:scoringStartPose.current,fallen:sim.getFallState().status!=='supported'}]);
    setScoreResult(result);setScoreReason(reason);
    if(competitionEnabled.current&&flowRef.current.phase==='running'){flowRef.current.finish(result,sim.getSimulationState().currentTime,reason);refreshFlow();}
    addLog(`Raw Score: ${result.total} · ${reason}`);
  };

  const handleStart = (routeCode?: string, routeStart?: Pose) => {
    if(onlineRef.current){sendOnline({action:onlineRef.current.phase==='ready'?'start':'practice-run',code:cppCode??''});return;}
    if (!simulatorRef.current || !bridgeRef.current) return;

    if (simulatorRef.current.getFallState().status !== 'supported') { addLog('[ERROR] Đặt lại hoặc kéo robot về sa bàn trước khi chạy.'); return; }
    // Load and compile code
    const official=competitionEnabled.current&&flowRef.current.phase==='ready';
    if(competitionEnabled.current&&!['preparation','ready'].includes(flowRef.current.phase)){addLog('[ERROR] Hoàn tất công bố cấu hình và cách ly trước khi Chạy.');return;}
    if(official&&robotNetworkManager.getAllPeers().length+1>SCORE_CATEGORIES[flowRef.current.category].robots){addLog('[ERROR] Số robot trong phòng vượt giới hạn hạng mục.');return;}
    const code = official?flowRef.current.frozenCode:(routeCode ?? cppCode ?? '');
    if (!code.trim()) { addLog('Chưa có code C++. Hãy mở hoặc viết code trong IDE.'); return; }
    const result = bridgeRef.current.loadCode(code);

    if (!result.success) {
      addLog(`[ERROR] Error: ${result.error}`);
      return;
    }

    if (routeStart && !competitionEnabled.current) {
      simulatorRef.current.reset(routeStart);
      setRobotHeading(routeStart.heading);
    }
    if(official) {
      const round=flowRef.current.start(simulatorRef.current.mission);
      simulatorRef.current.reset(round.pose);refreshFlow();
    }
    setScoreResult(null);
    scoringStartPose.current=simulatorRef.current.getRobotPose();
    simulatorRef.current.start();
    simulatorRef.current.setMotorSpeeds(0, 0);
    bridgeRef.current.startExecution(performance.now(),{keepRoundClock:official});
    setIsRunning(true);
    setIsPaused(false);

    addLog('[>] Chạy code C++');
  };

  const handleStop = () => {
    if(onlineRef.current){sendOnline({action:'stop'});return;}
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
    if(onlineRef.current)return;
    if (!simulatorRef.current) return;
    if (isPaused) {
      bridgeRef.current?.resetClock(performance.now());
      simulatorRef.current.resume();
      setIsPaused(false);
      addLog('Đã tiếp tục mô phỏng');
    } else {
      try {
        bridgeRef.current?.executeStep(performance.now(),8);
        if(!bridgeRef.current?.isExecuting()) {
          simulatorRef.current.stop();setIsRunning(false);
          finishScore(bridgeRef.current?.getCompletionReason()==='time-limit'?'Hết 2 phút · STOP':'C++ đã kết thúc');return;
        }
      } catch(error) {handleStop();addLog(`[ERROR] ${error instanceof Error?error.message:String(error)}`);return;}
      simulatorRef.current.pause();
      setIsPaused(true);
      addLog('Đã tạm dừng mô phỏng');
    }
  };

  const handleReset = () => {
    if(onlineRef.current){sendOnline({action:'practice-reset'});return;}
    if(competitionEnabled.current&&!['setup','preparation'].includes(flowRef.current.phase))return;
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
    if(onlineRef.current){sendOnline({action:'speed',speed:multiplier});return;}
    const simulator=simulatorRef.current,bridge=bridgeRef.current;
    if(!simulator||!bridge)return;
    try {
      bridge.setPlaybackSpeed(multiplier,performance.now());
      if(isRunning&&!isPaused&&!bridge.isExecuting()) {
        simulator.stop();setIsRunning(false);
        finishScore(bridge.getCompletionReason()==='time-limit'?'Hết 2 phút · STOP':'C++ đã kết thúc');
      }
      setSpeedMultiplier(simulator.getSpeedMultiplier());
    } catch(error) {handleStop();addLog(`[ERROR] ${error instanceof Error?error.message:String(error)}`);}
  };
  const handleCompetitionMode=(enabled:boolean)=>{
    if(robotNetworkManager.isConnected()){sendOnline({action:enabled?'enable':'disable'});return;}
    if(isRunning||flowRef.current.locked)return;
    competitionEnabled.current=enabled;setCompetitionMode(enabled);flowRef.current=new CompetitionFlow();
    if(simulatorRef.current){simulatorRef.current.mission.hidePollutionColors=false;simulatorRef.current.mission.changed();}
    setScoreResult(null);refreshFlow();rendererRef.current?.render();
  };
  const handleCompetitionAction=(action:CompetitionAction)=>{
    if(onlineRef.current){if(action==='quarantine')frozenOnlineCode.current=cppCode??'';sendOnline({action:action==='quarantine'?'lock-code':action,code:action==='quarantine'?cppCode??'':undefined});return;}
    const sim=simulatorRef.current,flow=flowRef.current;if(!sim||isRunning)return;
    try {
      const seed=()=>Math.floor(Math.random()*4294967296);
      if(action==='announce'){flow.announce(sim.mission,scoreCategory,seed());sim.reset();setScoreResult(null);}
      if(action==='quarantine'){
        const result=bridgeRef.current?.loadCode(cppCode??'');if(!result?.success)throw new Error(result?.error??'Không biên dịch được code.');
        flow.quarantine(sim.mission,cppCode??'',sim.getRobotPose());sim.reset(flow.startPose);
      }
      if(action==='reveal')flow.reveal(sim.mission,seed());
      if(action==='next'){flow.next();if(flow.phase==='setup')setScoreResult(null);}
      if(action==='new'){flowRef.current=new CompetitionFlow();setScoreResult(null);}
      refreshFlow();rendererRef.current?.render();addLog(`Vòng ${flowRef.current.round}: ${COMPETITION_PHASE_LABELS[flowRef.current.phase]}`);
    }catch(error){addLog(`[ERROR] ${error instanceof Error?error.message:String(error)}`);}
  };
  useEffect(()=>{
    if(!visible&&simulatorRef.current?.getSimulationState().isRunning&&!flowRef.current.locked){simulatorRef.current.pause();setIsPaused(true);}
    if(visible)rendererRef.current?.render();
  },[visible]);



  const fallStatus = simulatorRef.current?.getFallState().status;
  const status = fallStatus==='falling'?'Đang rơi':fallStatus==='fallen'?'Đã rơi':competitionMode&&flowRef.current.phase==='complete'?'Hoàn thành 2 vòng':competitionMode&&flowRef.current.phase==='finished'?'Đã chốt vòng':competitionMode&&flowRef.current.phase==='running'&&!bridgeRef.current?.isProgramRunning()?'Chờ chốt lượt':isPaused?'Tạm dừng':isRunning?'Đang chạy':'Sẵn sàng';
  return (
    <div className="simulator-shell sim-studio">
      <header className="sim-heading">
        <div><span className="sim-eyebrow">KHÔNG GIAN THỬ NGHIỆM</span><h1>Giả lập Leanbot</h1></div>
        <span className={`sim-status ${fallStatus && fallStatus !== 'supported' ? 'fallen' : isRunning && !isPaused ? 'running' : ''}`}><span />{status}</span>
      </header>
      <div className="sim-toolbar" role="toolbar" aria-label="Điều khiển mô phỏng">
        <MultiRobotConnector />
        <div className="sim-playback">
          <button className="sim-button primary" onClick={() => handleStart()} disabled={isRunning||(competitionMode&&!['preparation','ready'].includes(flowRef.current.phase))||(!!onlineRef.current&&(flowRef.current.phase==='ready'?!robotNetworkManager.isHost():flowRef.current.localCodeLocked))}><Play size={15} />Chạy</button>
          <button className="sim-button" onClick={handlePause} disabled={!isRunning||!!onlineRef.current||(competitionMode&&flowRef.current.phase==='running')}>{isPaused ? <Play size={15} /> : <Pause size={15} />}{isPaused ? 'Tiếp tục' : 'Tạm dừng'}</button>
          <button className="sim-button stop" onClick={handleStop} disabled={!isRunning}><Square size={14} />Dừng</button>
          <button className="sim-button icon-only" onClick={handleReset} disabled={competitionMode&&!['setup','preparation'].includes(flowRef.current.phase)} title="Đặt lại mô phỏng" aria-label="Đặt lại mô phỏng"><RotateCcw size={16} /></button>
          {/* Speed multiplier controls */}
          <div className="sim-speed" role="group" aria-label="Tốc độ mô phỏng"><span>Tua</span>{[1,2,5,10].map(speed => <button key={speed} className="sim-button" aria-pressed={speedMultiplier === speed} disabled={!!onlineRef.current&&!robotNetworkManager.isHost()} onClick={() => handleSpeedChange(speed)} title={`Tốc độ ${speed} lần`}>{speed}×</button>)}</div>
        </div>
        <HeadingDial value={robotHeading} disabled={isRunning||flowRef.current.localCodeLocked||(competitionMode&&!['setup','preparation'].includes(flowRef.current.phase))} onChange={value => {
          if(onlineRef.current){const pose=simulatorRef.current?.getRobotPose();if(pose)sendOnline({action:'place-robot',pose:{...pose,heading:value}});return;}
          setScoreResult(null);
          simulatorRef.current?.setHeading(value);
          const heading = simulatorRef.current?.getRobotPose().heading ?? 0;
          setRobotHeading(heading);
          setStats(prev => ({...prev,heading}));
          rendererRef.current?.render();
        }} />
        <span className="sim-toolbar-note">{competitionMode&&['ready','running','finished','complete'].includes(flowRef.current.phase)?`Còn ${Math.ceil(Math.max(0,ROUND_LIMIT_MS/1000-stats.time))} s / 120 s`:`Luyện tập · ${stats.time.toFixed(1)} s · Không giới hạn 120 s`}</span>
      </div>
<SimulatorDock logEvent={logs.at(-1)} onPanelChange={id => { activeDockRef.current = id; setActiveDock(id); if (id === 'logs' && followLogs) requestAnimationFrame(() => { if (logViewRef.current) logViewRef.current.scrollTop = logViewRef.current.scrollHeight; }); }} panels={[
{ id: 'route', label: 'Lộ trình', icon: <MousePointer2 size={20} />, content: <><div ref={setRouteToolsHost} /><div ref={setRoutePreviewHost} /></> },
{ id: 'mission', label: 'Nhiệm vụ', icon: <MapPin size={20} />, content: <><details className="sim-settings" open><summary><MapPin size={15} />Khối nhiệm vụ</summary><div ref={missionHostRef} /></details></> },
{ id: 'competition', label: 'Thi đấu', icon: <CircleCheck size={20} />, content: <><CompetitionPanel key={competitionMode?'competition':'practice'} flow={flowRef.current} enabled={competitionMode} running={isRunning} onMode={handleCompetitionMode} onAction={handleCompetitionAction} online={onlineRef.current} clientId={robotNetworkManager.getClientId()} isHost={robotNetworkManager.isHost()}/>
          <ScorePanel configurationLocked={competitionMode&&(flowRef.current.phase!=='setup'||flowRef.current.round>1||(!!onlineRef.current&&!robotNetworkManager.isHost()))} actionsLocked={competitionMode} key={scoreCategory} category={scoreCategory} result={scoreResult} reason={scoreReason} running={isRunning} onCategory={value=>{if(onlineRef.current){sendOnline({action:'category',category:value});return;}setScoreCategory(value);setScoreResult(null)}} onCalculate={()=>finishScore('Chấm hiện trạng thủ công')} onGenerate={()=>{
            const sim=simulatorRef.current;if(!sim)return;
            handleReset();createScoringMission(sim.mission,scoreCategory,Math.floor(Math.random()*4294967296));
            setScoreResult(null);rendererRef.current?.render();addLog(`Đã tạo nhiệm vụ ${scoreCategory}`);
          }}/>

          </> },
{ id: 'display', label: 'Hiển thị', icon: <Settings2 size={20} />, content: <><details className="sim-settings" open><summary><Settings2 size={15} />Hiển thị sa bàn</summary><div className="sim-options"><label><input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} />Lưới tọa độ</label><label><input type="checkbox" checked={showTrajectory} onChange={e => setShowTrajectory(e.target.checked)} />Đường di chuyển</label><label><input type="checkbox" checked={showSensorDebug} onChange={e => setShowSensorDebug(e.target.checked)} />Cảm biến</label></div></details></> },
{ id: 'logs', label: 'Logs', icon: <Terminal size={20} />, content: <>          <section className="sim-log-panel" aria-label="Nhật ký mô phỏng">
            <div className="sim-section-heading"><div><Terminal size={15} /><strong>Logs</strong><span className="sim-count">{logs.length}</span></div><div><label className="sim-follow"><input type="checkbox" checked={followLogs} onChange={e => setFollowLogs(e.target.checked)} />Theo dõi</label><button className="sim-button icon-only" aria-label="Xóa nhật ký" title="Xóa nhật ký" disabled={!logs.length} onClick={() => setLogs([])}><Trash2 size={14} /></button></div></div>
            <div className="sim-log-entries" ref={logViewRef} role="log" aria-live="polite" aria-relevant="additions">
              {logs.length === 0 ? <p className="sim-empty-log">Chưa có hoạt động. Chạy chương trình để xem kết quả tại đây.</p> : logs.map((log, i) => <div className={`sim-log-row ${log.level}`} key={`${log.time}-${i}`}><time>{log.time}</time>{log.level === 'error' ? <CircleAlert size={13} /> : log.level === 'success' ? <CircleCheck size={13} /> : <Info size={13} />}<span>{log.message}</span></div>)}
            </div>
          </section></> }
]}>
          <section className="sim-field" ref={fieldRef} aria-label="Sa bàn Synapse City">
            <div className="sim-section-heading"><div><MapPin size={15} /><strong>Synapse City · 4 ft × 4 ft</strong></div><button className="sim-button icon-only" title={fieldFullscreen ? 'Thu nhỏ sa bàn' : 'Toàn màn hình sa bàn'} aria-label={fieldFullscreen ? 'Thu nhỏ sa bàn' : 'Toàn màn hình sa bàn'} aria-pressed={fieldFullscreen} onClick={async () => {
              try {
                if (document.fullscreenElement === fieldRef.current) await document.exitFullscreen();
                else await fieldRef.current?.requestFullscreen();
              } catch { addLog('[ERROR] Không thay đổi được chế độ toàn màn hình.'); }
            }}>{fieldFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button></div>
            <RoutePlannerPanel toolsHost={routeToolsHost} previewHost={routePreviewHost} toolsVisible={activeDock === 'route'} simulator={simulatorRef.current} renderer={rendererRef.current} canvas={canvasRef.current} locked={isRunning || competitionMode} onRun={handleStart}>
            <div className="sim-canvas-wrap"><canvas ref={canvasRef} aria-label="Sa bàn và robot" /><section className="sim-telemetry sim-telemetry-overlay"><div className="sim-section-heading"><div><Gauge size={15} /><strong>Trạng thái robot</strong></div><span>Trực tiếp</span></div>
            <p className="sim-robot-specs">{LEANBOT_GEOMETRY.length} × {LEANBOT_GEOMETRY.width} × {LEANBOT_GEOMETRY.height} mm · {LEANBOT_GEOMETRY.mass*1000} g</p><dl className="sim-metrics"><div><dt>Thời gian</dt><dd>{stats.time.toFixed(1)}<small>s</small></dd></div><div><dt>Hướng</dt><dd>{stats.heading.toFixed(0)}<small>°</small></dd></div><div><dt>Vị trí X / Y</dt><dd>{stats.posX.toFixed(0)} / {stats.posY.toFixed(0)}<small>mm</small></dd></div><div><dt>Tốc độ trái / phải</dt><dd>{stats.speedL.toFixed(0)} / {stats.speedR.toFixed(0)}<small>mm/s</small></dd></div></dl>
          </section></div>
            </RoutePlannerPanel>
            <div className="sim-field-caption"><MousePointer2 size={13} /><span>Kéo để đặt robot · Đi qua mép sa bàn có thể rơi</span><span>2000 = 32,5 cm / 5 giây · mm thực / mm encoder = {MOTION_CALIBRATION.physicalMmPerEncoderMm.toFixed(5)}</span></div>
          </section>
</SimulatorDock>
    </div>
  );
};

export default SimulatorDemo;
