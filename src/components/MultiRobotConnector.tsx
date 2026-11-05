import React, { useState, useEffect } from 'react';
import { robotNetworkManager } from '../lib/robotNetworkManager';

export function MultiRobotConnector() {
  const [connectionMode, setConnectionMode] = useState<'idle' | 'create' | 'join'>('idle');
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [peers, setPeers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setCurrentRoom(robotNetworkManager.getRoomId());
      setError(null);
      setConnectionMode('idle');
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setCurrentRoom(null);
      setPeers([]);
    };

    const handlePeerJoined = (event: any) => {
      setPeers(prev => [...prev, event.data.peerId]);
    };

    const handlePeerLeft = (event: any) => {
      setPeers(prev => prev.filter(id => id !== event.data.peerId));
    };

    const handleError = (event: any) => {
      setError(event.error);
    };

    robotNetworkManager.on('connected', handleConnected);
    robotNetworkManager.on('disconnected', handleDisconnected);
    robotNetworkManager.on('peer-joined', handlePeerJoined);
    robotNetworkManager.on('peer-left', handlePeerLeft);
    robotNetworkManager.on('error', handleError);

    return () => {
      robotNetworkManager.off('connected', handleConnected);
      robotNetworkManager.off('disconnected', handleDisconnected);
      robotNetworkManager.off('peer-joined', handlePeerJoined);
      robotNetworkManager.off('peer-left', handlePeerLeft);
      robotNetworkManager.off('error', handleError);
    };
  }, []);

  const handleCreateRoom = async () => {
    const newRoomId = await robotNetworkManager.createRoom(password || undefined);
    if (!newRoomId) {
      setError('Failed to create room');
    }
  };

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    const success = await robotNetworkManager.connectToRoom(roomId.toUpperCase(), password || undefined);
    if (!success) {
      setError('Failed to join room');
    }
  };

  const handleDisconnect = () => {
    robotNetworkManager.disconnect();
  };

  if (isConnected && currentRoom) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3>🤖 Multi-Robot Network</h3>
        </div>
        <div style={styles.status}>
          <div style={styles.statusItem}>
            <span style={styles.label}>Room ID:</span>
            <span style={styles.value}>{currentRoom}</span>
            <button onClick={() => navigator.clipboard.writeText(currentRoom)} style={styles.copyBtn}>
              📋 Copy
            </button>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.label}>Connected Robots:</span>
            <span style={styles.value}>{peers.length + 1}</span>
          </div>
        </div>
        {peers.length > 0 && (
          <div style={styles.peerList}>
            <h4>Connected Peers:</h4>
            <ul>
              {peers.map((peerId, idx) => (
                <li key={peerId}>Robot {idx + 2}: {peerId.substring(0, 8)}...</li>
              ))}
            </ul>
          </div>
        )}
        <button onClick={handleDisconnect} style={styles.disconnectBtn}>
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3>🤖 Multi-Robot Network</h3>
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      {connectionMode === 'idle' && (
        <div style={styles.buttonGroup}>
          <button onClick={() => setConnectionMode('create')} style={styles.primaryBtn}>
            ➕ Create Room
          </button>
          <button onClick={() => setConnectionMode('join')} style={styles.secondaryBtn}>
            🔗 Join Room
          </button>
        </div>
      )}

      {connectionMode === 'create' && (
        <div style={styles.formContainer}>
          <h4>Create New Room</h4>
          <div style={styles.formGroup}>
            <label>Password (Optional):</label>
            <input
              type="password"
              placeholder="Leave empty for no password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.formActions}>
            <button onClick={handleCreateRoom} style={styles.primaryBtn}>
              Create
            </button>
            <button onClick={() => { setConnectionMode('idle'); setPassword(''); }} style={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {connectionMode === 'join' && (
        <div style={styles.formContainer}>
          <h4>Join Existing Room</h4>
          <div style={styles.formGroup}>
            <label>Room ID:</label>
            <input
              type="text"
              placeholder="e.g., ABC123"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              maxLength={6}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label>Password (if required):</label>
            <input
              type="password"
              placeholder="Leave empty if no password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.formActions}>
            <button onClick={handleJoinRoom} style={styles.primaryBtn}>
              Join
            </button>
            <button onClick={() => { setConnectionMode('idle'); setRoomId(''); setPassword(''); }} style={styles.cancelBtn}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '16px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: '#fafafa',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  } as React.CSSProperties,
  header: {
    marginBottom: '16px',
    borderBottom: '2px solid #3498db',
    paddingBottom: '8px',
  } as React.CSSProperties,
  status: {
    marginBottom: '12px',
  } as React.CSSProperties,
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  } as React.CSSProperties,
  label: {
    fontWeight: 'bold',
    minWidth: '120px',
  } as React.CSSProperties,
  value: {
    padding: '4px 8px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    fontFamily: 'monospace',
    border: '1px solid #ddd',
  } as React.CSSProperties,
  copyBtn: {
    padding: '4px 12px',
    marginLeft: '8px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
  } as React.CSSProperties,
  peerList: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#e8f4f8',
    borderRadius: '4px',
  } as React.CSSProperties,
  buttonGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  } as React.CSSProperties,
  formContainer: {
    padding: '12px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    border: '1px solid #ddd',
  } as React.CSSProperties,
  formGroup: {
    marginBottom: '12px',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '8px',
    marginTop: '4px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  formActions: {
    display: 'flex',
    gap: '8px',
  } as React.CSSProperties,
  primaryBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  } as React.CSSProperties,
  secondaryBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#95a5a6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  } as React.CSSProperties,
  cancelBtn: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  } as React.CSSProperties,
  disconnectBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  } as React.CSSProperties,
  errorBox: {
    padding: '12px',
    marginBottom: '12px',
    backgroundColor: '#fee',
    border: '1px solid #f00',
    borderRadius: '4px',
    color: '#c00',
    fontSize: '14px',
  } as React.CSSProperties,
};
