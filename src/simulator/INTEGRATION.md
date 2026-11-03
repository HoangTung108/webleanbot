# Simulator Integration Guide for StudentIDE

This guide shows how to integrate the 2D Leanbot Simulator into the existing StudentIDE.

## Step-by-Step Integration

### 1. Import Simulator Components

In `src/student/StudentIDE.tsx`, add these imports:

```typescript
import { SimulatorPanel } from '../components/SimulatorPanel';
```

### 2. Add Simulator State

In the `StudentIDE` component, add state for simulator visibility:

```typescript
const [showSimulator, setShowSimulator] = useState(false);
```

### 3. Modify Layout

Replace the current layout structure with a split view that includes the simulator:

```typescript
<main className="student-shell">
  <header className="student-header">
    {/* existing header code */}
  </header>
  
  <Toolbar 
    /* existing props */
    onShowSimulator={() => setShowSimulator(!showSimulator)}
  />
  
  <section className="editor-stage" aria-label="Không gian lập trình">
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Editor panel */}
      <div style={{ flex: showSimulator ? 0.5 : 1 }}>
        {/* existing editor code */}
      </div>
      
      {/* Simulator panel */}
      {showSimulator && (
        <div style={{ flex: 0.5, borderLeft: '1px solid var(--vscode-panel-border)' }}>
          <SimulatorPanel
            isVisible={showSimulator}
            cppCode={project.cppSource}
            onStatusChange={(msg) => setNotice({ message: msg, tone: 'info' })}
          />
        </div>
      )}
    </div>
  </section>
  
  <footer className="student-footer">
    {/* existing footer */}
  </footer>
</main>
```

### 4. Update Toolbar

Modify `src/student/Toolbar.tsx` to add a simulator toggle button:

```typescript
interface ToolbarProps {
  // existing props...
  onShowSimulator?: () => void;
}

export function Toolbar({ /* existing props */, onShowSimulator }: ToolbarProps) {
  return (
    /* existing toolbar code */
    <button
      onClick={onShowSimulator}
      title="Bật/Tắt mô phỏng 2D"
      className="toolbar-button"
    >
      <play icon /> Simulator
    </button>
    /* rest of toolbar */
  );
}
```

## Advanced Integration

### 1. Execute Simulator from Code Compilation

When the user clicks "Run", you can:
- Compile the C++ code normally (for upload)
- Also execute it in the simulator for preview

```typescript
async function run() {
  // ... existing compilation code ...
  
  if (showSimulator) {
    // Execute in simulator for preview
    const bridge = new CppSimulatorBridge(simulator);
    const result = bridge.loadCode(project.cppSource);
    if (result.success) {
      bridge.startExecution();
      // Animation loop managed by SimulatorPanel
    }
  }
  
  // ... rest of upload code ...
}
```

### 2. Real-time Sensor Feedback

Display sensor values from the simulator back in the IDE:

```typescript
const [sensorDisplay, setSensorDisplay] = useState<SensorReading | null>(null);

// In SimulatorPanel, add a callback:
onSensorUpdate={(readings) => setSensorDisplay(readings)}
```

### 3. Export Simulation Data

Add ability to export simulation history:

```typescript
function exportSimulationData() {
  const state = simulator.getSimulationState();
  const csv = convertHistoryToCSV(state.history);
  downloadFile(csv, 'simulation-history.csv');
}
```

## Styling

### CSS Classes

The SimulatorPanel uses these class names (add to your stylesheet):

```css
.simulator-panel {
  /* Main container */
  display: flex;
  flex-direction: column;
  height: 100%;
  border-top: 1px solid var(--vscode-panel-border);
}

.simulator-toolbar {
  /* Toolbar with buttons */
  display: flex;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.simulator-canvas {
  /* Canvas styling */
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: auto;
}
```

## Testing

### Test Scenarios

1. **Line Following**
   ```cpp
   Leanbot.begin();
   // Follow the line
   while(true) {
     int irLeft = LbIRLine.read();
     LbMotion.runLR(200, 200);
     LbDelay(10);
   }
   ```

2. **Navigation**
   ```cpp
   Leanbot.begin();
   LbMotion.setZeroOrigin();
   LbMotion.runLR(200, 200);
   LbMotion.waitDistanceMm(500);
   LbMotion.stopAndWait();
   ```

3. **Turn and Go**
   ```cpp
   Leanbot.begin();
   LbMotion.runLR(200, 100);
   LbDelay(500);
   LbMotion.stopAndWait();
   ```

## Performance Considerations

1. **Update Rate**: Simulator runs at 100Hz (10ms timestep)
2. **Rendering**: Canvas renders at 60fps
3. **Memory**: History is kept in memory (auto-pruned after 10k frames)
4. **CPU**: Disable sensor debug and trajectory for performance

```typescript
<SimulatorPanel
  isVisible={showSimulator}
  cppCode={project.cppSource}
  onStatusChange={handleStatus}
  defaultOptions={{
    showSensorDebug: false,
    showTrajectory: true,
    showGrid: true,
  }}
/>
```

## Customization

### Custom Boards

Add board selection to the IDE:

```typescript
<select onChange={(e) => setSelectedBoard(e.target.value)}>
  {getAllBoardNames().map(name => (
    <option key={name} value={name}>
      {AVAILABLE_BOARDS[name].name}
    </option>
  ))}
</select>
```

### Custom Robot Config

Modify the default robot configuration:

```typescript
const customRobotConfig: RobotConfig = {
  wheelRadius: 32.5,
  wheelBase: 150,
  maxSpeed: 500,
  maxAcceleration: 2000,
  sensorOffsets: { /* ... */ }
};

const simulator = new RobotSimulator(customRobotConfig);
```

## Troubleshooting

### Simulator Not Rendering
- Check if canvas has proper dimensions
- Verify board configuration is valid
- Check browser console for errors

### Motors Not Responding
- Ensure `simulator.start()` is called
- Check speed values are not zero
- Verify no collision is preventing movement

### Sensors Not Working
- Confirm board has lines/obstacles configured
- Check robot position relative to board elements
- Enable sensor debug view to visualize

## Future Enhancements

- [ ] Live sensor value display in IDE
- [ ] Breakpoint debugging support
- [ ] Multiple robot simulation
- [ ] 3D visualization option
- [ ] Network simulation (WiFi, BLE)
- [ ] Physics engine for complex interactions
- [ ] Replay/timeline scrubbing
- [ ] Export to video

## References

- [Simulator README](./README.md)
- [Type Definitions](./types.ts)
- [Examples](./examples.tsx)
