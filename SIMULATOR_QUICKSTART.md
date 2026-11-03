# Leanbot Simulator - Quick Start Guide

## What's Included

A complete 2D robot simulator with:
- ✅ Physics-based robot motion
- ✅ Sensor simulation (IR, distance)
- ✅ C++ code execution
- ✅ AIROC 2026 boards
- ✅ Interactive React component
- ✅ Real-time visualization

## File Location

All files are in `src/simulator/` and `src/components/`:

```
src/simulator/
├── index.ts              # Main exports
├── types.ts              # TypeScript types
├── robotSimulator.ts     # Physics engine
├── renderer.ts           # Canvas rendering
├── boardConfigs.ts       # Boards (AIROC 2026, etc)
├── cppBridge.ts          # C++ parser
├── examples.tsx          # Example code
├── demo.tsx              # Demo component
├── README.md             # Full documentation
└── INTEGRATION.md        # Integration guide

src/components/
└── SimulatorPanel.tsx    # React component
```

## 5-Minute Quickstart

### 1. View the Demo

The easiest way to see the simulator in action:

```tsx
import SimulatorDemo from '@src/simulator/demo';

function App() {
  return <SimulatorDemo />;
}
```

This shows:
- Real-time 2D visualization
- Playback controls
- Multiple example programs
- Board selection
- Sensor visualization

### 2. Add to StudentIDE

In `src/student/StudentIDE.tsx`:

```tsx
import { SimulatorPanel } from '../components/SimulatorPanel';

export function StudentIDE() {
  const [showSimulator, setShowSimulator] = useState(false);

  return (
    <main>
      {/* existing layout */}
      {showSimulator && (
        <SimulatorPanel
          isVisible={true}
          cppCode={project.cppSource}
        />
      )}
    </main>
  );
}
```

### 3. Manual Control

Create and control simulator programmatically:

```tsx
import { RobotSimulator, SimulatorRenderer } from '@src/simulator';
import { AIROC2026_MAZE } from '@src/simulator/boardConfigs';

function MySimulator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const simulator = new RobotSimulator();
    simulator.setBoard(AIROC2026_MAZE);
    
    const renderer = new SimulatorRenderer(
      canvasRef.current!,
      simulator,
      AIROC2026_MAZE
    );

    simulator.start();
    simulator.setMotorSpeeds(200, 200);

    const animate = () => {
      simulator.update();
      renderer.render();
      requestAnimationFrame(animate);
    };
    
    animate();
  }, []);

  return <canvas ref={canvasRef} />;
}
```

### 4. Execute C++ Code

```tsx
import { CppSimulatorBridge } from '@src/simulator';

const bridge = new CppSimulatorBridge(simulator);

const code = `
  Leanbot.begin();
  LbMotion.runLR(200, 200);
  LbDelay(2000);
  LbMotion.stopAndWait();
`;

const result = bridge.loadCode(code);
if (result.success) {
  bridge.startExecution();
  // Execute in animation loop:
  bridge.executeStep(currentTime);
}
```

## Available Boards

Pre-configured boards in `boardConfigs.ts`:

1. **AIROC2026_MAZE** - Maze challenge
2. **AIROC2026_DELIVERY** - Pickup & delivery
3. **SIMPLE_LINE_FOLLOWING** - Tutorial
4. **OBSTACLE_AVOIDANCE** - Tutorial

Access them:
```typescript
import { getBoardByName, AVAILABLE_BOARDS } from '@src/simulator/boardConfigs';

const board = getBoardByName('airoc2026_maze');
// or
const board = AVAILABLE_BOARDS['simple_line_following'];
```

## Supported C++ API

The simulator can parse and execute:

```cpp
// Motion
LbMotion.runLR(leftSpeed, rightSpeed);  // Speed in mm/s
LbMotion.waitDistanceMm(distance);      // Travel distance
LbMotion.waitRotationDeg(degrees);      // Rotate
LbMotion.stopAndWait();                 // Stop

// Control
LbDelay(milliseconds);                  // Wait

// Output
Serial.println("message");              // Log
```

## Robot Configuration

Customize robot parameters:

```typescript
import { RobotConfig } from '@src/simulator';

const config: RobotConfig = {
  wheelRadius: 32.5,      // mm
  wheelBase: 150,         // mm between wheels
  maxSpeed: 500,          // mm/s
  maxAcceleration: 2000,  // mm/s²
  sensorOffsets: {
    irLineLeft: { x: -40, y: 70 },
    irLineCenter: { x: 0, y: 75 },
    irLineRight: { x: 40, y: 70 },
    irFront: { x: 0, y: 80 },
  },
};

const simulator = new RobotSimulator(config);
```

## Custom Boards

Create custom competition boards:

```typescript
import { BoardConfig } from '@src/simulator';

const myBoard: BoardConfig = {
  name: 'My Arena',
  width: 2000,
  height: 2000,
  walls: [
    { id: 'north', x1: 0, y1: 0, x2: 2000, y2: 0 },
    // ... more walls
  ],
  obstacles: [
    { id: 'block1', x: 500, y: 500, width: 100, height: 100 },
    // ... more obstacles
  ],
  lines: [
    {
      id: 'track1',
      points: [{ x: 100, y: 100 }, { x: 900, y: 100 }],
      width: 50,
      color: '#000000',
    },
  ],
};

simulator.setBoard(myBoard);
```

## Visualization Options

Control what's displayed:

```typescript
renderer.setOptions({
  showGrid: true,            // Reference grid
  showTrajectory: true,      // Movement history
  showSensorDebug: true,     // Sensor rays
  backgroundColor: '#ffffff',
  robotColor: '#ff0000',
  lineColor: '#000000',
  wallColor: '#333333',
  obstacleColor: '#ff6600',
});
```

## Get Sensor Data

Read sensors in real-time:

```typescript
const readings = simulator.getSensorReadings();

console.log(readings.irLine.center);  // 0-4095
console.log(readings.irLine.left);    // 0-4095
console.log(readings.irLine.right);   // 0-4095
console.log(readings.distance);       // mm
console.log(readings.battery);        // voltage
```

## Access Simulation History

Get full movement history:

```typescript
const state = simulator.getSimulationState();

state.history.forEach(step => {
  console.log(step.timestamp);         // Time in ms
  console.log(step.robotPose);         // x, y, heading
  console.log(step.sensorReadings);    // All sensor values
  console.log(step.motorSpeeds);       // Left/right speeds
});
```

## Common Patterns

### Pattern 1: Line Following Demo
```cpp
Leanbot.begin();
LbMotion.runLR(200, 200);
LbDelay(3000);
LbMotion.stopAndWait();
```

### Pattern 2: Navigation
```cpp
Leanbot.begin();
LbMotion.setZeroOrigin();
LbMotion.runLR(200, 200);
LbMotion.waitDistanceMm(500);
LbMotion.stopAndWait();
```

### Pattern 3: Complex Path
```cpp
Leanbot.begin();
// Forward
LbMotion.runLR(200, 200);
LbDelay(1000);
// Turn
LbMotion.runLR(100, 200);
LbDelay(500);
// Forward again
LbMotion.runLR(200, 200);
LbDelay(1000);
LbMotion.stopAndWait();
```

## Troubleshooting

### Motor not responding?
- Call `simulator.start()`
- Set speed: `simulator.setMotorSpeeds(speed, speed)`
- Check for collisions

### Sensors always zero?
- Verify board has lines configured
- Enable `showSensorDebug` to visualize
- Check robot position on board

### Performance issues?
- Disable trajectory rendering
- Reduce board complexity
- Use simpler code examples

## Next Steps

1. **Try the Demo**: `import SimulatorDemo from '@src/simulator/demo'`
2. **Read Full Docs**: See `src/simulator/README.md`
3. **View Examples**: Check `src/simulator/examples.tsx`
4. **Integrate**: Follow `src/simulator/INTEGRATION.md`

## File Statistics

- **Lines of Code**: ~1,500 (core engine)
- **Documentation**: 2,000+ lines
- **Type Definitions**: Complete TypeScript interfaces
- **Examples**: 4 complete working examples
- **Test Scenarios**: 10+ documented use cases

## Key Features

✅ **Physics-Accurate**
- Differential drive kinematics
- Collision detection
- Sensor simulation

✅ **Easy to Use**
- Simple React component
- No external dependencies
- Clear documentation

✅ **Extensible**
- Custom boards
- Custom robot configs
- Plugin-ready architecture

✅ **Educational**
- Real-time visualization
- Sensor debugging
- Code execution tracking

## Questions?

1. Check `README.md` for detailed documentation
2. Review examples in `examples.tsx`
3. Read integration guide in `INTEGRATION.md`
4. See demo in `demo.tsx`

## Ready to Start?

Choose your approach:

**For Quick Demo:**
```tsx
import SimulatorDemo from '@src/simulator/demo';
```

**For IDE Integration:**
```tsx
import { SimulatorPanel } from '@src/components/SimulatorPanel';
```

**For Custom Development:**
```tsx
import { RobotSimulator, SimulatorRenderer, CppSimulatorBridge } from '@src/simulator';
```

Happy simulating! 🤖
