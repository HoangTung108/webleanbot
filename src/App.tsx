import { StudentIDE } from './student/StudentIDE'
import SimulatorDemo from './simulator/demo'
import { useState } from 'react'
import { ArrowLeft, ScanLine } from 'lucide-react'

function App() {
  const [simulatorCode, setSimulatorCode] = useState('')
  const [showSimulator, setShowSimulator] = useState(false)
  const [simulatorOpened,setSimulatorOpened]=useState(false)
  const [codeLocked,setCodeLocked]=useState(false)

  return (
    <div className="studio-app">
      <nav className="studio-navigation" aria-label="Không gian làm việc">
        <span className="studio-context">LEANBOT <span>/ {showSimulator ? 'Synapse City' : 'Lập trình'}</span></span>
        <button className="workspace-switch" disabled={codeLocked&&showSimulator} title={codeLocked?'Code đã khóa trong lượt thi':undefined} onClick={() => {setSimulatorOpened(true);setShowSimulator(!showSimulator)}}>
          {showSimulator ? <><ArrowLeft size={14} />IDE</> : <><ScanLine size={14} />Simulator</>}
        </button>
      </nav>
      <div className="studio-view" style={{ display: showSimulator ? 'none' : 'block' }}><StudentIDE onSourceChange={setSimulatorCode} /></div>
      {simulatorOpened && <div className="studio-view" style={{display:showSimulator?'block':'none'}}><SimulatorDemo cppCode={simulatorCode} visible={showSimulator} onCodeLockChange={setCodeLocked}/></div>}
    </div>
  )
}

export default App
