/**
 * Example: Multi-Robot Integration with StudentIDE
 * 
 * This shows how to integrate MultiRobotConnector and synchronization
 * into the main StudentIDE component
 */

import React, { useEffect, useRef, useState } from 'react';
import { MultiRobotConnector } from '../components/MultiRobotConnector';
import { RobotSimulator } from '../simulator/robotSimulator';
import { 
  initializeMultiRobotSync, 
  getMultiRobotSync,
  type MultiRobotSyncService 
} from '../lib/multiRobotSyncService';
import { MultiRobotRenderer } from '../simulator/multiRobotRenderer';
import { robotNetworkManager } from '../lib/robotNetworkManager';

interface MultiRobotIntegrationProps {
  simulator: RobotSimulator | null;
  canvasElement: HTMLCanvasElement | null;
  boardWidth: number;
  boardHeight: number;
}

/**
 * Setup multi-robot synchronization for a simulator
 * 
 * Usage:
 * ```tsx
 * const syncService = setupMultiRobotSync({
 *   simulator: robotSimulator,
 *   canvasElement: canvasRef.current,
 *   boardWidth: 2000,
 *   boardHeight: 2000,
 * });
 * ```
 */
export function setupMultiRobotSync(props: MultiRobotIntegrationProps) {
  if (!props.simulator) return null;

  // Initialize sync service
  const syncService = initializeMultiRobotSync(props.simulator);
  syncService.start();

  // Setup UI
  const uiContainer = document.createElement('div');
  uiContainer.id = 'multi-robot-ui';
  uiContainer.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 1000;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  `;

  // Setup renderer
  let multiRenderer: MultiRobotRenderer | null = null;
  if (props.canvasElement) {
    multiRenderer = new MultiRobotRenderer(props.canvasElement, props.simulator);
    
    // Listen for peer updates and add remote robots to renderer
    robotNetworkManager.on('peer-joined', (event) => {
      const remoteRobot = syncService.getRemoteRobot(event.data.peerId);
      if (remoteRobot && multiRenderer) {
        multiRenderer.addRemoteRobot(event.data.peerId, remoteRobot);
      }
    });

    robotNetworkManager.on('peer-left', (event) => {
      if (multiRenderer) {
        multiRenderer.removeRemoteRobot(event.data.peerId);
      }
    });
  }

  return {
    syncService,
    multiRenderer,
    uiContainer,
    
    /**
     * Render frame with all robots
     */
    renderFrame() {
      if (multiRenderer) {
        multiRenderer.render(props.boardWidth, props.boardHeight);
      }
    },

    /**
     * Cleanup
     */
    cleanup() {
      syncService.stop();
      syncService.disconnect();
      uiContainer.remove();
    },
  };
}

/**
 * Hook to manage multi-robot integration
 */
export function useMultiRobotIntegration(
  simulator: RobotSimulator | null,
  canvasElement: HTMLCanvasElement | null,
  boardWidth: number = 2000,
  boardHeight: number = 2000
) {
  const [integration, setIntegration] = useState<ReturnType<typeof setupMultiRobotSync> | null>(null);

  useEffect(() => {
    if (!simulator || !canvasElement) return;

    const newIntegration = setupMultiRobotSync({
      simulator,
      canvasElement,
      boardWidth,
      boardHeight,
    });

    setIntegration(newIntegration);

    return () => {
      newIntegration?.cleanup();
    };
  }, [simulator, canvasElement, boardWidth, boardHeight]);

  return integration;
}

/**
 * Example: Enhanced StudentIDE Component
 * 
 * Shows how to add MultiRobotConnector to StudentIDE
 */
export function StudentIDEWithMultiRobot() {
  const [showMultiRobot, setShowMultiRobot] = useState(false);
  const simulatorRef = useRef<RobotSimulator | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Setup multi-robot when needed
  const integration = useMultiRobotIntegration(
    showMultiRobot ? simulatorRef.current : null,
    showMultiRobot ? canvasRef.current : null
  );

  return (
    <main className="student-shell">
      {/* Existing UI... */}
      
      {/* Add Multi-Robot Connector */}
      {showMultiRobot && (
        <div style={{ position: 'fixed', top: 10, right: 10, zIndex: 1000 }}>
          <MultiRobotConnector />
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setShowMultiRobot(!showMultiRobot)}
        style={{
          position: 'fixed',
          top: 10,
          left: 10,
          padding: '8px 16px',
          backgroundColor: showMultiRobot ? '#4caf50' : '#2196f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          zIndex: 999,
        }}
      >
        {showMultiRobot ? '🤖 Online' : '🔌 Offline'}
      </button>

      {/* Canvas for simulator */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'none', // Hidden, used only for multi-robot rendering
        }}
      />
    </main>
  );
}

/**
 * Example: Integration in Animation Loop
 * 
 * This shows how to call integration.renderFrame() in your animation loop
 */
export function SimulatorWithMultiRobot() {
  const [simulator, setSimulator] = useState<RobotSimulator | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const integrationRef = useRef<ReturnType<typeof setupMultiRobotSync> | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!simulator || !canvasRef.current) return;

    // Setup integration
    integrationRef.current = setupMultiRobotSync({
      simulator,
      canvasElement: canvasRef.current,
      boardWidth: 2000,
      boardHeight: 2000,
    });

    // Animation loop with multi-robot rendering
    const animate = () => {
      try {
        simulator.update(0.016); // 16ms per frame (~60 FPS)
        
        // Render both local and remote robots
        integrationRef.current?.renderFrame();
      } catch (error) {
        console.error('Animation error:', error);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      integrationRef.current?.cleanup();
    };
  }, [simulator]);

  return (
    <div>
      <MultiRobotConnector />
      <canvas ref={canvasRef} style={{ width: '100%', height: '100vh' }} />
    </div>
  );
}

/**
 * Example: Test Setup
 * 
 * For testing multi-robot functionality:
 */
export async function testMultiRobotIntegration() {
  console.log('=== Multi-Robot Integration Test ===\n');

  // 1. Create simulator
  const simulator = new RobotSimulator();
  console.log('✓ Simulator created');

  // 2. Initialize sync service
  const syncService = initializeMultiRobotSync(simulator);
  console.log('✓ Sync service initialized');

  // 3. Create room
  const roomId = await robotNetworkManager.createRoom('test-password', 2);
  console.log(`✓ Room created: ${roomId}`);

  // 4. Start sync
  syncService.start();
  console.log('✓ Sync started');

  // 5. Simulate robot movement
  simulator.setMotorSpeeds(100, 200); // Left: 100, Right: 200 = diagonal movement
  for (let i = 0; i < 10; i++) {
    simulator.update(0.016);
    const pose = simulator.getRobotPose();
    console.log(`Frame ${i}: pos=(${pose.x.toFixed(1)}, ${pose.y.toFixed(1)}), heading=${pose.heading.toFixed(1)}°`);
  }

  // 6. Check peer state
  const peers = robotNetworkManager.getAllPeers();
  console.log(`\n✓ Total peers: ${peers.length}`);

  // 7. Cleanup
  syncService.stop();
  syncService.disconnect();
  console.log('✓ Cleanup complete\n');
}

// Run test if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  testMultiRobotIntegration().catch(console.error);
}
