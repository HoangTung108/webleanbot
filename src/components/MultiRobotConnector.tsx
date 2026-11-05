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
  const [showMenu, setShowMenu] = useState(false);

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

  // Compact UI - just a small button with dropdown menu
  return (
    <div style={styles.wrapper}>
      {/* Status indicator button */}
      <button 
        onClick={() => setShowMenu(!showMenu)}
        style={{...styles.statusBtn, ...(isConnected ? styles.statusBtnConnected : {})}}
        title={isConnected ? `Connected to room ${currentRoom}` : 'Click to connect'}
      >
        🤖 {isConnected ? `${peers.length + 1}` : '○'}
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <div style={styles.dropdown}>
          {isConnected && currentRoom ? (
            <>
              <div style={styles.dropdownHeader}>Connected ✓</div>
              <div style={styles.dropdownRow}>
                <span style={styles.dropdownLabel}>Room:</span>
                <span style={styles.dropdownValue}>{currentRoom}</span>
              </div>
              <div style={styles.dropdownRow}>
                <span style={styles.dropdownLabel}>Robots:</span>
                <span style={styles.dropdownValue}>{peers.length + 1}</span>
              </div>
              <button 
                onClick={() => navigator.clipboard.writeText(currentRoom)}
                style={styles.dropdownBtn}
              >
                📋 Copy ID
              </button>
              <button 
                onClick={() => {
                  handleDisconnect();
                  setShowMenu(false);
                }}
                style={{...styles.dropdownBtn, ...styles.dropdownBtnDanger}}
              >
                Disconnect
              </button>
            </>
          ) : (
            <>
              <div style={styles.dropdownHeader}>Multi-Robot</div>
              {error && <div style={styles.dropdownError}>{error}</div>}

              {connectionMode === 'idle' && (
                <>
                  <button 
                    onClick={() => setConnectionMode('create')}
                    style={styles.dropdownBtn}
                  >
                    ➕ Create Room
                  </button>
                  <button 
                    onClick={() => setConnectionMode('join')}
                    style={styles.dropdownBtn}
                  >
                    🔗 Join Room
                  </button>
                </>
              )}

              {connectionMode === 'create' && (
                <>
                  <div style={styles.formGroup}>
                    <input
                      type="password"
                      placeholder="Password (optional)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={styles.formInput}
                    />
                  </div>
                  <button 
                    onClick={handleCreateRoom}
                    style={styles.dropdownBtn}
                  >
                    Create
                  </button>
                  <button 
                    onClick={() => { setConnectionMode('idle'); setPassword(''); }}
                    style={{...styles.dropdownBtn, ...styles.dropdownBtnCancel}}
                  >
                    Cancel
                  </button>
                </>
              )}

              {connectionMode === 'join' && (
                <>
                  <div style={styles.formGroup}>
                    <input
                      type="text"
                      placeholder="Room ID"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      maxLength={6}
                      style={styles.formInput}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={styles.formInput}
                    />
                  </div>
                  <button 
                    onClick={handleJoinRoom}
                    style={styles.dropdownBtn}
                  >
                    Join
                  </button>
                  <button 
                    onClick={() => { setConnectionMode('idle'); setRoomId(''); setPassword(''); }}
                    style={{...styles.dropdownBtn, ...styles.dropdownBtnCancel}}
                  >
                    Cancel
                  </button>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    position: 'relative',
    display: 'inline-block',
  } as React.CSSProperties,
  statusBtn: {
    padding: '6px 12px',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  statusBtnConnected: {
    backgroundColor: '#d4edda',
    borderColor: '#28a745',
    color: '#28a745',
  } as React.CSSProperties,
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '4px',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 1000,
    minWidth: '220px',
    padding: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
  } as React.CSSProperties,
  dropdownHeader: {
    padding: '6px 8px',
    fontWeight: 'bold',
    borderBottom: '1px solid #eee',
    marginBottom: '6px',
    color: '#333',
  } as React.CSSProperties,
  dropdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 8px',
    fontSize: '12px',
    gap: '8px',
  } as React.CSSProperties,
  dropdownLabel: {
    fontWeight: '600',
    color: '#666',
  } as React.CSSProperties,
  dropdownValue: {
    fontFamily: 'monospace',
    color: '#333',
    backgroundColor: '#f5f5f5',
    padding: '2px 6px',
    borderRadius: '2px',
    flex: 1,
    textAlign: 'right',
  } as React.CSSProperties,
  dropdownBtn: {
    display: 'block',
    width: '100%',
    padding: '6px 8px',
    marginTop: '4px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '500',
    transition: 'background 0.2s',
  } as React.CSSProperties,
  dropdownBtnCancel: {
    backgroundColor: '#95a5a6',
  } as React.CSSProperties,
  dropdownBtnDanger: {
    backgroundColor: '#e74c3c',
  } as React.CSSProperties,
  dropdownError: {
    padding: '6px 8px',
    marginBottom: '6px',
    backgroundColor: '#fee',
    border: '1px solid #f00',
    borderRadius: '3px',
    color: '#c00',
    fontSize: '12px',
  } as React.CSSProperties,
  formGroup: {
    marginBottom: '6px',
  } as React.CSSProperties,
  formInput: {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid #ccc',
    borderRadius: '3px',
    fontSize: '12px',
    boxSizing: 'border-box',
  } as React.CSSProperties,
};
