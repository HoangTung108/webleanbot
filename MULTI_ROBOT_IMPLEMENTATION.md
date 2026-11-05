# Leanbot Multi-Robot Online System - Implementation Summary

## Overview

Đã triển khai hệ thống kết nối online cho 2 con robot Leanbot thông qua WebSocket. Hệ thống cho phép:
- Tạo phòng chơi online
- Tham gia phòng bằng Room ID
- Đồng bộ hóa trạng thái robot real-time
- Hiển thị cả 2 robots trên canvas tương tự

**BONUS:** Đã sửa lỗi kinematics - Robot giờ chuyển động chéo chính xác khi tốc độ hai bánh khác nhau.

---

## Files Created/Modified

### New Files Created

1. **`src/lib/robotNetworkManager.ts`** (350+ lines)
   - WebSocket client cho kết nối multi-robot
   - Quản lý room creation/joining
   - Event-based state sync
   - Auto-reconnect logic

2. **`src/components/MultiRobotConnector.tsx`** (300+ lines)
   - React UI component
   - Create room / Join room interface
   - Display Room ID and connected peers
   - Copy-to-clipboard functionality

3. **`src/lib/multiRobotSyncService.ts`** (200+ lines)
   - Service lớp tích hợp RobotNetworkManager + RobotSimulator
   - Đồng bộ trạng thái motor/pose theo định kỳ
   - Quản lý remote robot instances
   - Start/stop synchronization

4. **`src/simulator/multiRobotRenderer.ts`** (400+ lines)
   - Multi-robot canvas renderer
   - Local robot vs remote robots với màu khác nhau
   - Hiển thị sensor readings
   - Grid + wall rendering
   - Zoom/pan controls

5. **`server/robotNetworkServer.ts`** (300+ lines)
   - WebSocket server (Node.js, ws library)
   - Room management system
   - State broadcast logic
   - Client lifecycle management

6. **`src/student/MultiRobotIntegration.tsx`** (400+ lines)
   - Example integration code
   - `setupMultiRobotSync()` function
   - `useMultiRobotIntegration()` hook
   - Test suite example

7. **`docs/MULTI_ROBOT_ONLINE.md`** (500+ lines)
   - Full documentation
   - Architecture overview
   - Protocol specification
   - Usage examples
   - Troubleshooting guide

### Modified Files

1. **`src/simulator/robotSimulator.ts`**
   - Fixed `updateRobotKinematics()` with correct circular arc integration
   - Angular velocity: `w = (vR - vL) / wheelBase` (was wrong)
   - Proper integration for curved motion

2. **`package.json`**
   - Added `ws: ^8.14.2` dependency
   - Added `@types/ws: ^8.5.8` dev dependency

---

## Key Features Implemented

### 1. Room Management
```typescript
// Create room (auto-generates 6-char ID)
const roomId = await robotNetworkManager.createRoom('password?', 2);
// → Returns: "ABC123"

// Join room by ID
const success = await robotNetworkManager.connectToRoom("ABC123", "password?");
```

### 2. Real-time State Sync
- Local robot sends state every 50ms (20 FPS)
- Includes: pose (x, y, heading) + motor speeds
- Server broadcasts to all peers
- Remote robots update pose in real-time

### 3. Multi-Robot Rendering
```typescript
const renderer = new MultiRobotRenderer(canvas, localRobot);
renderer.addRemoteRobot(peerId, remoteRobot);
renderer.render(boardWidth, boardHeight); // Renders both
```

### 4. Event-Driven Architecture
```typescript
robotNetworkManager.on('connected', (event) => {
  console.log('Connected to room:', event.data.roomId);
});

robotNetworkManager.on('peer-joined', (event) => {
  console.log('New peer:', event.data.peerId);
});

robotNetworkManager.on('state-sync', (event) => {
  console.log('Peer state updated:', event.data.state);
});
```

### 5. Proper Kinematics (FIXED)
**Before (WRONG):**
```typescript
const w = (vL - vR) / wheelBase; // ❌ Wrong sign
```

**After (CORRECT):**
```typescript
const w = (vR - vL) / wheelBase; // ✅ Correct for differential drive
// + Circular arc integration instead of Euler
```

Test results:
- ✓ 2/2 tests pass in `robotHeading.test.ts`
- ✓ Build succeeds
- ✓ No compilation errors

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     StudentIDE (React)                  │
│                                                         │
│  ┌──────────────────┐         ┌────────────────────┐   │
│  │ MultiRobotConnector      │ SimulatorPanel       │   │
│  │ (UI: Create/Join Room)   │ (Canvas Rendering)   │   │
│  └────────┬───────────┘     └────────┬─────────────┘   │
│           │                           │                 │
│           ↓                           ↓                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │      MultiRobotSyncService                       │  │
│  │ - Manages sync lifecycle                         │  │
│  │ - Bridges simulator + network                    │  │
│  │ - Manages remote robot instances                 │  │
│  └────────┬──────────────────────────┬──────────────┘  │
│           │                          │                  │
│  ┌────────▼────┐          ┌──────────▼──────────────┐  │
│  │ RobotNetwork │          │ MultiRobotRenderer     │  │
│  │Manager       │          │ - Renders local + remote│  │
│  │ (WebSocket)  │          │ - Grid, walls, sensors │  │
│  └────────┬────┘          └──────────┬──────────────┘  │
│           │                           │                 │
│           ↓                           ↓                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │      RobotSimulator                              │  │
│  │ - Local: Physics + kinematics                    │  │
│  │ - Remote: Receives pose updates from network     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
           ↓ WebSocket Messages
┌──────────────────────────────────────────────────────────┐
│           RobotNetworkServer (Node.js)                  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Room Manager                                      │  │
│  │ - Tracks rooms (ID, clients, state)              │  │
│  │ - Broadcasts state between clients               │  │
│  │ - Handles join/leave events                      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  WebSocket Connections:                                │
│  - Client 1 (Robot 1): ws://localhost:8080?clientId=X │
│  - Client 2 (Robot 2): ws://localhost:8080?clientId=Y │
└──────────────────────────────────────────────────────────┘
```

---

## Usage

### Step 1: Start WebSocket Server

```bash
cd /Users/nguyenhoangtung08102003/SourceCode/webleanbot

# In Terminal 1: Start dev server
npm run dev

# In Terminal 2: Start robot network server
npx tsx server/robotNetworkServer.ts
# Server running on ws://localhost:8080
```

### Step 2: Create Room (Client 1)

```
1. Open http://localhost:5173
2. Click "➕ Create Room"
3. Copy Room ID (e.g., "ABC123")
4. Run robot code to sync state
```

### Step 3: Join Room (Client 2)

```
1. Open http://localhost:5173 in another browser tab
2. Click "🔗 Join Room"
3. Paste Room ID: "ABC123"
4. Click "Join"
5. Now both robots sync in real-time!
```

---

## Communication Protocol

### WebSocket Messages

**Create Room (Client → Server)**
```json
{
  "type": "create-room",
  "roomId": "ABC123",
  "password": "optional-password",
  "maxPeers": 2
}
```

**Robot State Update (Client → Server)**
```json
{
  "type": "robot-state",
  "clientId": "robot-1234-abc",
  "state": {
    "pose": { "x": 100.5, "y": 200.3, "heading": 45.2 },
    "motorLeft": 100,
    "motorRight": 150,
    "timestamp": 1699999999999
  }
}
```

**Peer Joined (Server → All Clients)**
```json
{
  "type": "peer-joined",
  "peerId": "robot-5678-def",
  "robotId": "Robot-2",
  "timestamp": 1699999999999
}
```

**State Sync (Server → Other Clients)**
```json
{
  "type": "state-sync",
  "peerId": "robot-5678-def",
  "state": {
    "pose": { "x": 150.0, "y": 250.0, "heading": 90.0 },
    "motorLeft": 80,
    "motorRight": 120,
    "timestamp": 1699999999999
  }
}
```

---

## Physics Fix Details

### Problem
Robot không chuyển động chéo khi tốc độ hai bánh khác nhau (e.g., left=100, right=200)

### Root Cause
1. **Sai dấu**: `w = (vL - vR) / wheelBase` ← Wrong!
   - Should be: `w = (vR - vL) / wheelBase` ✓

2. **Sai tích phân**: Sử dụng Euler method không chính xác cho curved motion
   - Should use: Circular arc integration ✓

### Solution
```typescript
private updateRobotKinematics(deltaTime: number): void {
  const v = (vL + vR) / 2;           // Linear velocity
  const w = (vR - vL) / wheelBase;   // Angular velocity (FIXED!)
  const theta = heading * Math.PI / 180;

  if (Math.abs(w) < 1e-6) {
    // Straight line
    pose.x += v * Math.cos(theta) * dt;
    pose.y += v * Math.sin(theta) * dt;
  } else {
    // Curved motion with circular arc (more accurate)
    const R = v / w;
    const dtheta = w * dt;
    const newTheta = theta + dtheta;
    pose.x += R * (Math.sin(newTheta) - Math.sin(theta));
    pose.y += R * (Math.cos(theta) - Math.cos(newTheta));
    pose.heading = (newTheta * 180 / Math.PI) % 360;
  }
}
```

### Test Results
```
✓ src/simulator/robotHeading.test.ts (2 tests) PASS
✓ npm run build: ✓ built in 19.11s
✓ No TypeScript errors
```

---

## Features Completed

### Multi-Robot Synchronization
- [x] WebSocket connection management
- [x] Room creation with auto-generated IDs
- [x] Join room by ID
- [x] Real-time state sync (20 FPS)
- [x] Peer discovery and notifications
- [x] Auto-reconnect on disconnect
- [x] Multiple event handlers

### UI Components
- [x] MultiRobotConnector React component
- [x] Create room modal
- [x] Join room modal
- [x] Room ID display with copy button
- [x] Connected peers list
- [x] Connection status indicator
- [x] Error handling and messages

### Rendering
- [x] MultiRobotRenderer class
- [x] Local robot display (local color)
- [x] Remote robots display (with color palette)
- [x] Heading indicators
- [x] Wheel rendering
- [x] Sensor visualization
- [x] Grid and walls
- [x] Proper coordinate transforms

### Backend
- [x] WebSocket server implementation
- [x] Room management system
- [x] Client lifecycle handling
- [x] State broadcast logic
- [x] Error handling
- [x] Connection pooling

### Physics
- [x] Fix kinematics formula (angular velocity sign)
- [x] Implement circular arc integration
- [x] Support diagonal movement
- [x] Unit tests passing

### Documentation
- [x] Complete API documentation
- [x] Usage examples
- [x] Protocol specification
- [x] Architecture diagrams
- [x] Troubleshooting guide
- [x] Integration examples

---

## How to Test

### Test 1: Build Check
```bash
npm run build
# Expected: ✓ built in X.XXs
```

### Test 2: Type Check
```bash
npx tsc --noEmit
# Expected: No errors
```

### Test 3: Unit Tests
```bash
npm test
# Expected: All tests pass
```

### Test 4: Manual Test - Create Room
1. Click "➕ Create Room"
2. See Room ID generated
3. Run robot code
4. Verify state is sent to server

### Test 5: Manual Test - Join Room
1. Browser 1: Create room "ABC123"
2. Browser 2: Join room "ABC123"
3. Click "Start" on both
4. Verify both robots move on both screens

### Test 6: Kinematics Test
1. Set motor speeds: left=100, right=200 (different!)
2. Robot should move in diagonal/curved line
3. Verify heading changes in real-time
4. Verify position changes correctly

---

## Known Issues & Limitations

### Current Limitations
- Max 2 robots per room (easily configurable to 4+)
- Room data not persisted (lost on server restart)
- No authentication system
- No room password enforcement
- Data not encrypted over WebSocket
- No collision detection between robots

### Future Enhancements
- [ ] Support 4+ robots per room
- [ ] Persistent room storage
- [ ] HTTPS/WSS support
- [ ] Authentication with tokens
- [ ] Data compression for bandwidth
- [ ] Collision detection between robots
- [ ] Audio/video chat overlay
- [ ] Replay recording system
- [ ] Spectator mode (viewer only)
- [ ] Match history/leaderboard

---

## Dependencies Added

```json
{
  "ws": "^8.14.2",
  "@types/ws": "^8.5.8"
}
```

Install:
```bash
npm install
```

---

## File Statistics

- **Total new lines of code**: ~2000+
- **Total new files**: 7
- **Total modified files**: 2
- **Total documentation**: 500+ lines

---

## Integration Steps (For Developer)

### 1. Add MultiRobotConnector to your UI
```tsx
import { MultiRobotConnector } from './components/MultiRobotConnector'

export function MyApp() {
  return (
    <>
      <MultiRobotConnector />
      <SimulatorPanel />
    </>
  )
}
```

### 2. Setup sync service in simulator
```tsx
import { initializeMultiRobotSync } from './lib/multiRobotSyncService'

useEffect(() => {
  if (simulator) {
    const syncService = initializeMultiRobotSync(simulator)
    syncService.start()
    
    return () => {
      syncService.stop()
      syncService.disconnect()
    }
  }
}, [simulator])
```

### 3. Use multi-robot renderer
```tsx
import { MultiRobotRenderer } from './simulator/multiRobotRenderer'

const renderer = new MultiRobotRenderer(canvas, localRobot)
renderer.render(boardWidth, boardHeight)
```

---

## Success Metrics

✅ **All tasks completed:**
1. Fixed diagonal movement kinematics
2. Implemented multi-robot WebSocket system
3. Created room creation/joining system
4. Real-time state synchronization
5. Multi-robot rendering on same canvas
6. Complete documentation
7. Integration examples
8. No breaking changes to existing code

---

Generated: 2024
System: Leanbot IDE Multi-Robot Enhancement
