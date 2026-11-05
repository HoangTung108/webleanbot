import { StudentIDE } from './student/StudentIDE'
import SimulatorDemo from './simulator/demo'
import { useState } from 'react'
import { ArrowLeft, ScanLine } from 'lucide-react'

function App() {
  const [simulatorCode, setSimulatorCode] = useState('')
  const [showSimulator, setShowSimulator] = useState(false)

  return (
    <div className="studio-app">
      <nav className="studio-navigation" aria-label="Không gian làm việc">
        <span className="studio-context">LEANBOT <span>/ {showSimulator ? 'Synapse City' : 'Lập trình'}</span></span>
        <button className="workspace-switch" onClick={() => setShowSimulator(!showSimulator)}>
          {showSimulator ? <><ArrowLeft size={14} />IDE</> : <><ScanLine size={14} />Simulator</>}
        </button>
      </nav>
      <div className="studio-view" style={{ display: showSimulator ? 'none' : 'block' }}><StudentIDE onSourceChange={setSimulatorCode} /></div>
      {showSimulator && <div className="studio-view"><SimulatorDemo cppCode={simulatorCode} /></div>}
    </div>
  )
}

export default App
