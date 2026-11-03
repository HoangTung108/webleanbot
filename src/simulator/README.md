# Leanbot 2D Robot Simulator

A comprehensive 2D robot simulator for Leanbot robotics programming, including support for AIROC 2026 competition boards.

## Features

- **2D Physics Simulation**: Realistic differential drive kinematics and collision detection
- **Sensor Simulation**: IR line sensors, ultrasonic distance sensors, and touch sensors
- **Multiple Boards**: Pre-configured boards including AIROC 2026 competition arenas
- **C++ Code Execution**: Direct execution of Leanbot C++ API commands
- **Real-time Visualization**: Canvas-based rendering with configurable debug views
- **Trajectory Recording**: Automatic recording of robot movement history

## Architecture

### Core Components

1. **RobotSimulator** (`robotSimulator.ts`)
   - Physics engine
   - Sensor simulation
   - State management
   - Collision detection

2. **SimulatorRenderer** (`renderer.ts`)
   - 2D canvas rendering
   - Viewport transformation
   - Debug visualization
   - Statistics display

3. **CppSimulatorBridge** (`cppBridge.ts`)
   - C++ code parsing
   - Command queue generation
   - Code execution timeline

4. **Board Configurations** (`boardConfigs.ts`)
   - AIROC 2026 boards
   - Tutorial boards
   - Custom board support

5. **React Component** (`SimulatorPanel.tsx`)
   - UI controls
   - Board selection
   - Real-time visualization

## Usage Examples

### Basic Setup

```typescript
import { RobotSimulator, SimulatorRenderer } from '@src/simulator';
import { AIROC2026_MAZE } from '@src/simulator/boardConfigs';

// Create simulator
const simulator = new RobotSimulator();
simulator.setBoard(AIROC2026_MAZE);

// Create renderer
const canvas = document.getElementById('simulator-canvas') as HTMLCanvasElement;
const renderer = new SimulatorRenderer(canvas, simulator, AIROC2026_MAZE);

// Start simulation
simulator.start();
simulator.setMotorSpeeds(200, 200); // mm/s
```

### C++ Code Execution

```typescript
import { CppSimulatorBridge } from '@src/simulator';

const bridge = new CppSimulatorBridge(simulator);

const cppCode = `
  Leanbot.begin();
  LbMotion.runLR(200, 200);    // Run both wheels at 200 mm/s
  LbDelay(2000);               // Wait 2 seconds
  LbMotion.runLR(150, 250);    // Turn slightly left
  LbDelay(1000);
  LbMotion.stopAndWait();
`;

const result = bridge.loadCode(cppCode);
if (result.success) {
  bridge.startExecution();
  // Update loop:
  bridge.executeStep(currentTime);
}
```

### React Component Integration

```tsx
import { SimulatorPanel } from '@src/components/SimulatorPanel';

function App() {
  return (
    <SimulatorPanel 
      isVisible={true}
      cppCode={userCode}
      onStatusChange={(msg) => console.log(msg)}
    />
  );
}
```

## Board Configuration

### Creating Custom Boards

```typescript
import { BoardConfig } from '@src/simulator';

const customBoard: BoardConfig = {
  name: 'My Custom Arena',
  width: 2000,
  height: 2000,
  walls: [
    // Border
    { id: 'wall-north', x1: 0, y1: 0, x2: 2000, y2: 0 },
    { id: 'wall-south', x1: 0, y1: 2000, x2: 2000, y2: 2000 },
    { id: 'wall-west', x1: 0, y1: 0, x2: 0, y2: 2000 },
    { id: 'wall-east', x1: 2000, y1: 0, x2: 2000, y2: 2000 },
    // Custom walls
    { id: 'sep-1', x1: 1000, y1: 0, x2: 1000, y2: 2000 },
  ],
  obstacles: [
    {
      id: 'block-1',
      x: 500,
      y: 500,
      width: 200,
      height: 200,
    },
  ],
  lines: [
    {
      id: 'track-1',
      points: [
        { x: 100, y: 100 },
        { x: 900, y: 100 },
        { x: 900, y: 900 },
      ],
      width: 50,
      color: '#000000',
    },
  ],
  metadata: {
    competition: 'Custom',
    boardType: 'custom',
  },
};

simulator.setBoard(customBoard);
```

## AIROC 2026 Boards

### 1. Maze Challenge (`AIROC2026_MAZE`)
- **Type**: Line following + navigation
- **Difficulty**: Medium
- **Features**:
  - Black lines for line following
  - Maze walls and obstacles
  - Starting line at (100, 1000)

### 2. Pickup & Delivery (`AIROC2026_DELIVERY`)
- **Type**: Object manipulation
- **Difficulty**: Hard
- **Features**:
  - Multiple delivery zones
  - Objects to pick up and move
  - Zone-based scoring

## Sensor Simulation

### IR Line Sensors

The simulator includes 3 IR line sensors (left, center, right):

```typescript
const readings = simulator.getSensorReadings();
console.log(readings.irLine.left);    // 0-4095
console.log(readings.irLine.center);  // 0-4095
console.log(readings.irLine.right);   // 0-4095
```

Values:
- `0`: No line detected (white surface)
- `4095`: Black line detected

### Ultrasonic Distance Sensor

Simulates front-facing distance measurement:

```typescript
const readings = simulator.getSensorReadings();
console.log(readings.distance); // Distance in mm
```

### Touch Sensors

Currently placeholder for future implementation:

```typescript
const readings = simulator.getSensorReadings();
console.log(readings.touch); // [false, false, false, false]
```

## Renderer Configuration

### Display Options

```typescript
renderer.setOptions({
  pixelsPerMM: 0.5,              // Zoom level
  showGrid: true,                // Show reference grid
  showSensorDebug: true,         // Show sensor rays and values
  showTrajectory: true,          // Show path history
  backgroundColor: '#ffffff',    // Canvas background
  robotColor: '#ff0000',         // Robot body color
  lineColor: '#000000',          // Line color
  wallColor: '#333333',          // Wall color
  obstacleColor: '#ff6600',      // Obstacle color
});
```

## Simulation State

Access detailed simulation state:

```typescript
const state = simulator.getSimulationState();
console.log(state.currentTime);           // Simulation time in ms
console.log(state.robotState.pose);       // { x, y, heading }
console.log(state.sensorReadings);        // Current sensor values
console.log(state.history);               // Array of SimulationStep
```

### Accessing History

```typescript
const steps = simulator.getSimulationState().history;
steps.forEach(step => {
  console.log(step.timestamp);            // Time in ms
  console.log(step.robotPose);            // Position and heading
  console.log(step.sensorReadings);       // Sensor values at that time
  console.log(step.motorSpeeds);          // Motor speeds at that time
});
```

## C++ API Support

### Supported Commands

The simulator parses and executes:

```cpp
// Motion
LbMotion.runLR(leftSpeed, rightSpeed);
LbMotion.waitDistanceMm(distance);
LbMotion.waitRotationDeg(degrees);
LbMotion.stopAndWait();

// Delays
LbDelay(milliseconds);

// Logging
Serial.println("message");
```

### Limitations

- IR sensor calibration commands are parsed but ignored
- Gripper commands are not yet simulated
- Touch sensor interrupts not yet supported
- Advanced sensor processing not yet implemented

## Integration with IDE

### Adding to StudentIDE

```tsx
import { SimulatorPanel } from '@src/components/SimulatorPanel';

export const StudentIDE: React.FC = () => {
  const [showSimulator, setShowSimulator] = useState(false);

  return (
    <div>
      <Toolbar onShowSimulator={() => setShowSimulator(!showSimulator)} />
      {showSimulator && (
        <SimulatorPanel 
          isVisible={showSimulator}
          cppCode={currentCode}
        />
      )}
    </div>
  );
};
```

## Physics Model

### Differential Drive Kinematics

The simulator uses standard differential drive kinematics:

```
v = (v_left + v_right) / 2       // Linear velocity
ω = (v_right - v_left) / wheelBase // Angular velocity
```

Where:
- `v_left`, `v_right`: Wheel velocities (mm/s)
- `wheelBase`: Distance between wheels (150 mm by default)

### Collision Model

- **Walls**: Elastic collisions that reverse and dampen motor speeds
- **Obstacles**: Stop motor and prevent further movement
- **Boundaries**: Robot is constrained within board limits

## Performance

- **Update Rate**: 100 Hz (10 ms timestep)
- **Rendering**: 60 FPS
- **History Buffer**: Automatically trimmed to last 10,000 frames
- **Canvas Resolution**: Adaptive to container size

## Troubleshooting

### Robot not moving
- Check that simulator is started: `simulator.start()`
- Verify motor speeds are set: `simulator.setMotorSpeeds(...)`
- Check for collision errors in console

### Sensors always return 0
- Ensure board has lines configured
- Verify robot position and orientation
- Check sensor debug view

### Performance issues
- Reduce history buffer size
- Disable trajectory rendering
- Reduce board complexity

## Future Enhancements

- [ ] 3D visualization option
- [ ] Physics-based gripper simulation
- [ ] Gyroscope/IMU sensor simulation
- [ ] WiFi communication simulation
- [ ] Multi-robot simulation
- [ ] Replay system with timeline
- [ ] Export simulation data to CSV
- [ ] Servo motor simulation
- [ ] Ball physics for soccer/pickup challenges

## API Reference

See `src/simulator/types.ts` for complete TypeScript interfaces.

## License

Part of Leanbot Studio - Educational Robotics Platform

### Synapse City

The default mat is 4 ft × 4 ft (1219.2 × 1219.2 mm, including its border).
`public/simulator/synapse-city.svg` reconstructs the supplied district layout; it is
not the original printed artwork. Colored reference annotations are omitted.
Track polylines use the same 794-unit reference coordinates scaled to millimetres
for IR sensing. Printed lines and district graphics are not physical walls.
The top-down Leanbot chassis is estimated at 80 × 55 mm, with wheels and a front
gripper (overall footprint about 87 × 75 mm); these are visual estimates, not calibrated hardware dimensions.

City road centerlines are calibrated to 350 mm between adjacent intersections
(35 cm per city side). The complete mat remains 1219.2 mm square, with 84.6 mm
from each edge to the outer road centerline. Illustration and IR polylines use
the same piecewise mapping. Straight driving uses mm/s × seconds without an
extra display-distance multiplier; robot artwork size does not scale travel.

### Running the current C++ editor source

The IDE sends its current source directly to the simulator. In React, select
“Code C++ đang viết”; the editor stays mounted when opening the simulator. The
static IDE reads the active file through `getLeanbotSimulatorCode()` on each Start.
Both use `cppRuntime.ts`, a cooperative interpreter (not a full C++ compiler).
It supports the custom mission fixture: functions/parameters, numeric casts,
variables, enums, numeric arrays, if/else, for/while, switch, break/return, common
math/string helpers, millis, motion encoder reads, waits, and gripper commands.
`LbMission.end()` finishes a simulated mission; touch-start is acknowledged by
Start. Unsupported calls stop with an error instead of running sample motion.

Motion calibration: runLR ±2000 maps to ±500 mm/s, wheelbase 75 mm. Encoder
distance is signed wheel-average travel; rotation accumulates without wrapping.
These speed values are a simulation approximation, not measured hardware PWM.
Pause freezes simulation time; Stop cancels the program; Start reloads edited code.
Run `npm run build:simulator` after editing the interpreter when using the static
IDE; production builds regenerate `public/leanbot-ide/cpp-runtime.js` automatically.
