import { Network, Plus, LogIn, Check, Radio } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { robotNetworkManager } from '../lib/robotNetworkManager';
import { realRobotColorBridge } from '../lib/realRobotColorBridge';
import { type RobotColor, COLOR_HEX_MAP } from '../lib/robotColorSignal';

export function MultiRobotConnector() {
  const [connectionMode, setConnectionMode] = useState<'idle' | 'create' | 'join'>('idle');
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [isConnected, setIsConnected] = useState(robotNetworkManager.isConnected());
  const [currentRoom, setCurrentRoom] = useState<string | null>(robotNetworkManager.getRoomId());
  const [peers, setPeers] = useState<string[]>(robotNetworkManager.getAllPeers().map(peer => peer.id));
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [lastColor, setLastColor] = useState<RobotColor | null>(robotNetworkManager.getLastColorSignal()?.color ?? null);
  const [lastSender, setLastSender] = useState<string | null>(robotNetworkManager.getLastColorSignal()?.senderRobotId ?? null);

  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setPeers(robotNetworkManager.getAllPeers().map(peer => peer.id));
      setCurrentRoom(robotNetworkManager.getRoomId());
      setLastColor(robotNetworkManager.getLastColorSignal()?.color ?? null);
      setLastSender(robotNetworkManager.getLastColorSignal()?.senderRobotId ?? null);
      setError(null);
      setConnectionMode('idle');
    };

    const handleDisconnected = () => {
      setIsConnected(false);
      setCurrentRoom(null);
      setPeers([]);
      setLastColor(null);
      setLastSender(null);
    };

    const handlePeerJoined = (event: any) => {
      setPeers(prev => [...new Set([...prev, event.data.peerId])]);
    };

    const handlePeerLeft = (event: any) => {
      setPeers(prev => prev.filter(id => id !== event.data.peerId));
    };

    const handleColorSignal = (event: any) => {
      if (event.data?.color) {
        setLastColor(event.data.color);
        setLastSender(event.data.senderRobotId || event.data.peerId || null);
      }
    };

    const handleError = (event: any) => {
      setError(event.error);
    };

    robotNetworkManager.on('connected', handleConnected);
    robotNetworkManager.on('disconnected', handleDisconnected);
    robotNetworkManager.on('peer-joined', handlePeerJoined);
    robotNetworkManager.on('peer-left', handlePeerLeft);
    robotNetworkManager.on('color-signal', handleColorSignal);
    robotNetworkManager.on('error', handleError);

    return () => {
      robotNetworkManager.off('connected', handleConnected);
      robotNetworkManager.off('disconnected', handleDisconnected);
      robotNetworkManager.off('peer-joined', handlePeerJoined);
      robotNetworkManager.off('peer-left', handlePeerLeft);
      robotNetworkManager.off('color-signal', handleColorSignal);
      robotNetworkManager.off('error', handleError);
    };
  }, []);

  const handleCreateRoom = async () => {
    const newRoomId = await robotNetworkManager.createRoom(password || undefined);
    if (!newRoomId) {
      setError(current => current || 'Không tạo được phòng.');
    }
  };

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    const success = await robotNetworkManager.connectToRoom(roomId.trim().toUpperCase(), password || undefined);
    if (!success) {
      setError(current => current || 'Không tham gia được phòng.');
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
        aria-expanded={showMenu}
        aria-label="Kết nối nhiều robot"
        title={isConnected ? `Connected to room ${currentRoom}` : 'Click to connect'}
      >
        <Network size={16} /> {isConnected ? `${peers.length + 1}` : ''}
      </button>

      {/* Dropdown menu */}
      {showMenu && (
        <div style={styles.dropdown}>
          {isConnected && currentRoom ? (
            <>
              <div style={styles.dropdownHeader}><Check size={14} /> Connected</div>
              <div style={styles.dropdownRow}>
                <span style={styles.dropdownLabel}>Room:</span>
                <span style={styles.dropdownValue}>{currentRoom}</span>
              </div>
              <div style={styles.dropdownRow}>
                <span style={styles.dropdownLabel}>Robots:</span>
                <span style={styles.dropdownValue}>{peers.length + 1}/2</span>
              </div>
              <div style={styles.dropdownSection}>
                <div style={styles.dropdownLabel}><Radio size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> Tín hiệu màu (WiFi / WS):</div>
                <div style={styles.colorStatusRow}>
                  <span
                    style={{
                      ...styles.colorBadge,
                      backgroundColor: lastColor ? COLOR_HEX_MAP[lastColor] || '#9ca3af' : '#6b7280',
                      color: 'white',
                    }}
                  >
                    {lastColor || 'WAITING'}
                  </span>
                  {lastSender && (
                    <span style={{ fontSize: '11px', color: '#64748b' }} title="Robot gửi tín hiệu">
                      từ {lastSender}
                    </span>
                  )}
                </div>
                <div style={styles.colorActions}>
                  {(['RED', 'GREEN', 'BLUE', 'YELLOW', 'PURPLE'] as RobotColor[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={`Gửi tín hiệu màu ${c}`}
                      onClick={() => void realRobotColorBridge.sendColor(c, true)}
                      style={{
                        ...styles.colorBtn,
                        backgroundColor: COLOR_HEX_MAP[c],
                      }}
                    >
                      {c[0]}
                    </button>
                  ))}
                </div>
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
              <div style={styles.dropdownHeader}>Online · 2 robot song song</div>
              <p>Tạo phòng và gửi mã cho máy thứ hai. Mỗi máy mở Simulator và chạy chương trình riêng.</p>
              {error && <div style={styles.dropdownError}>{error}</div>}

              {connectionMode === 'idle' && (
                <>
                  <button 
                    onClick={() => setConnectionMode('create')}
                    style={styles.dropdownBtn}
                  >
                    <Plus size={14} /> Create Room
                  </button>
                  <button 
                    onClick={() => setConnectionMode('join')}
                    style={styles.dropdownBtn}
                  >
                    <LogIn size={14} /> Join Room
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
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
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
    maxWidth: 'calc(100vw - 24px)',
    padding: '8px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '13px',
  } as React.CSSProperties,
  dropdownHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 8px',
    fontWeight: 'bold',
    borderBottom: '1px solid #eee',
    marginBottom: '6px',
    color: '#333',
  } as React.CSSProperties,
  dropdownSection: {
    margin: '6px 0',
    padding: '6px 8px',
    backgroundColor: '#f8fafc',
    borderRadius: '4px',
    border: '1px solid #e2e8f0',
  } as React.CSSProperties,
  colorStatusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    margin: '4px 0',
  } as React.CSSProperties,
  colorBadge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
  } as React.CSSProperties,
  colorActions: {
    display: 'flex',
    gap: '4px',
    marginTop: '6px',
  } as React.CSSProperties,
  colorBtn: {
    flex: 1,
    padding: '4px 0',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    textAlign: 'center',
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
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
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
