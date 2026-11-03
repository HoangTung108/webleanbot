import { StudentIDE } from './student/StudentIDE'
import SimulatorDemo from './simulator/demo'
import { useState } from 'react'

function App() {
  const [simulatorCode, setSimulatorCode] = useState('')
  const [showSimulator, setShowSimulator] = useState(false)

  return (
    <>
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 10000 }}>
        <button
          onClick={() => setShowSimulator(!showSimulator)}
          style={{
            padding: '10px 16px',
            backgroundColor: showSimulator ? '#c41e3a' : '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            transition: 'all 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {showSimulator ? '<- IDE' : '[BOT] Simulator ->'}
        </button>
      </div>
      <div style={{ display: showSimulator ? 'none' : 'contents' }}><StudentIDE onSourceChange={setSimulatorCode} /></div>
      {showSimulator && <SimulatorDemo cppCode={simulatorCode} />}
    </>
  )
}

export default App
