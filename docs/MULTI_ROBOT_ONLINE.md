# Multi-Robot Online Synchronization System

Hệ thống kết nối online cho 2 con robot Leanbot thông qua WebSocket.

## Kiến Trúc

### Components

1. **RobotNetworkManager** (`src/lib/robotNetworkManager.ts`)
   - Quản lý kết nối WebSocket
   - Tạo/tham gia phòng
   - Đồng bộ hóa trạng thái robot

2. **MultiRobotConnector** (`src/components/MultiRobotConnector.tsx`)
   - Giao diện UI để tạo/tham gia phòng
   - Hiển thị Room ID
   - Danh sách peers kết nối

3. **MultiRobotSyncService** (`src/lib/multiRobotSyncService.ts`)
   - Tích hợp RobotNetworkManager với RobotSimulator
   - Đồng bộ trạng thái robot theo định kỳ
   - Quản lý remote robots

4. **MultiRobotRenderer** (`src/simulator/multiRobotRenderer.ts`)
   - Hiển thị cả local và remote robots trên canvas
   - Các robot remote có màu khác nhau
   - Hiển thị sensor readings

5. **RobotNetworkServer** (`server/robotNetworkServer.ts`)
   - WebSocket server xử lý kết nối
   - Quản lý phòng chơi
   - Đồng bộ trạng thái giữa các clients

## Quy Trình Hoạt Động

### Tạo Phòng
1. User clicks "Create Room"
2. Client tạo room ID ngẫu nhiên (6 ký tự)
3. Kết nối WebSocket tới server
4. Server tạo room và gán client làm host
5. Client nhận Room ID để chia sẻ

### Tham Gia Phòng
1. User nhập Room ID
2. Client kết nối WebSocket với Room ID đó
3. Server xác nhận room tồn tại
4. Server thông báo tới host: "Peer joined"
5. Host nhận danh sách peers mới

### Đồng Bộ Trạng Thái
1. Mỗi 50ms (20 FPS), local robot gửi trạng thái:
   - Vị trí (x, y)
   - Heading (góc quay)
   - Tốc độ motor (left, right)

2. Server broadcast trạng thái tới tất cả peers
3. Remote robots cập nhật pose dựa vào trạng thái nhận

4. Renderer vẽ cả local + remote robots

## Cách Sử Dụng

### 1. Khởi Động Server

```bash
# Terminal 1: Start WebSocket server
cd server
node robotNetworkServer.ts
# Server runs on ws://localhost:8080
```

### 2. Tích Hợp vào StudentIDE

```tsx
import { MultiRobotConnector } from './components/MultiRobotConnector'
import { initializeMultiRobotSync } from './lib/multiRobotSyncService'

export function App() {
  const [simulator, setSimulator] = useState<RobotSimulator | null>(null)

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

  return (
    <>
      <MultiRobotConnector />
      <SimulatorPanel simulator={simulator} />
    </>
  )
}
```

### 3. Hiển Thị Multiple Robots

```tsx
import { MultiRobotRenderer } from '../simulator/multiRobotRenderer'

export function SimulatorPanel() {
  const [renderer, setRenderer] = useState<MultiRobotRenderer | null>(null)
  
  useEffect(() => {
    if (simulator && canvas) {
      const multiRenderer = new MultiRobotRenderer(canvas, simulator)
      
      // Thêm remote robots
      const syncService = getMultiRobotSync()
      syncService?.getAllRemoteRobots().forEach((robot, idx) => {
        multiRenderer.addRemoteRobot(`peer-${idx}`, robot)
      })
      
      setRenderer(multiRenderer)
    }
  }, [simulator])
  
  // Trong animation loop:
  renderer?.render(boardWidth, boardHeight)
}
```

## Giao Thức WebSocket

### Client → Server

**Create Room**
```json
{
  "type": "create-room",
  "roomId": "ABC123",
  "password": "optional",
  "maxPeers": 2
}
```

**Robot State Update**
```json
{
  "type": "robot-state",
  "clientId": "robot-1234-abc",
  "state": {
    "pose": { "x": 100, "y": 50, "heading": 45 },
    "motorLeft": 100,
    "motorRight": 150,
    "timestamp": 1699999999
  }
}
```

### Server → Client

**Peer Joined**
```json
{
  "type": "peer-joined",
  "peerId": "client-5678-def",
  "robotId": "Robot-2",
  "timestamp": 1699999999
}
```

**State Sync**
```json
{
  "type": "state-sync",
  "peerId": "client-5678-def",
  "robotId": "Robot-2",
  "state": {
    "pose": { "x": 200, "y": 100, "heading": 90 },
    "motorLeft": 80,
    "motorRight": 120,
    "timestamp": 1699999999
  }
}
```

**Room Joined**
```json
{
  "type": "room-joined",
  "roomId": "ABC123",
  "clientId": "robot-1234-abc",
  "robotId": "Robot-1",
  "peers": [
    { "id": "client-5678-def", "robotId": "Robot-2" }
  ]
}
```

## Kiến Trúc Vật Lý Được Sửa

Đã fix lỗi kinematics trong `robotSimulator.ts`:

**Angular Velocity (BEFORE - WRONG):**
```typescript
const w = (vL - vR) / wheelBase; // Sai dấu!
```

**Angular Velocity (AFTER - CORRECT):**
```typescript
const w = (vR - vL) / wheelBase; // Đúng theo differential drive
```

**Integration Method:**
```typescript
if (Math.abs(w) < 1e-6) {
  // Chuyển động thẳng
  const dx = v * Math.cos(theta) * dt
  const dy = v * Math.sin(theta) * dt
} else {
  // Chuyển động cong với circular arc (chính xác hơn Euler)
  const R = v / w
  const dtheta = w * dt
  const newTheta = theta + dtheta
  const dx = R * (Math.sin(newTheta) - Math.sin(theta))
  const dy = R * (Math.cos(theta) - Math.cos(newTheta))
}
```

Kết quả: Robot giờ chuyển động chéo chính xác khi tốc độ hai bánh khác nhau.

## Cách Kiểm Tra

### Test Scenario 1: Tạo Phòng
```
1. Click "➕ Create Room"
2. Nhập password (optional)
3. Click "Create"
4. Copy Room ID được tạo
```

### Test Scenario 2: Tham Gia Phòng
```
1. Mở cửa sổ trình duyệt thứ 2
2. Mở Leanbot IDE
3. Click "🔗 Join Room"
4. Paste Room ID
5. Click "Join"
6. Thấy "Connected Robots: 2"
```

### Test Scenario 3: Kiểm Tra Đồng Bộ
```
1. Robot 1: Chạy motor left=100, right=200
2. Nhìn trên canvas:
   - Red robot (local) chuyển động chéo
   - Blue robot (remote) cũng chuyển động chéo tương tự
```

## Lỗi Có Thể Gặp

### "WebSocket connection error"
- Kiểm tra server đang chạy: `lsof -i :8080`
- Khởi động lại server

### "Room is full"
- Phòng chỉ cho phép 2 robots
- Tạo phòng mới hoặc chờ tham gia phòng khác

### "Failed to join room"
- Kiểm tra Room ID (case-sensitive)
- Kiểm tra kết nối internet
- Kiểm tra server logs

### Remote robot không cập nhật
- Kiểm tra animation loop đang chạy
- Kiểm tra state-sync messages trong DevTools

## Cấu Hình

### Sync Rate
Chỉnh trong `multiRobotSyncService.ts`:
```typescript
private syncRate = 50; // ms (20 FPS)
```

### Server Port
Chỉnh trong `server/robotNetworkServer.ts`:
```typescript
const server = new RobotNetworkServer(8080) // port
```

### Max Peers per Room
Chỉnh trong `robotNetworkManager.ts`:
```typescript
async createRoom(password?: string, maxPeers: number = 2)
```

## Dependencies

```json
{
  "ws": "^8.x", // WebSocket library for server
  "react": "^18.x",
  "typescript": "^5.x"
}
```

Cài đặt:
```bash
npm install ws
```

## Tương Lai (TODO)

- [ ] Làm sạch phòng trống tự động sau 5 phút
- [ ] Mã hóa trạng thái (nén dữ liệu)
- [ ] Support 4+ robots per room
- [ ] Persistent room storage
- [ ] Collision detection giữa local + remote robots
- [ ] Audio/video chat overlay
- [ ] Replay recording của cả 2 robots
- [ ] Authentication với token
