import { useState } from 'react'
import { TopNav } from './components/layout/TopNav.tsx'
import { AsIsMap } from './features/maps/components/AsIsMap.tsx'
import { PlaceholderView } from './features/maps/components/PlaceholderView.tsx'
import { ToBeMap } from './features/maps/components/ToBeMap.tsx'
import type { MapView } from './types/map.ts'

function App() {
  const [activeView, setActiveView] = useState<MapView>('as-is')

  return (
    <div className="app-shell">
      <TopNav activeView={activeView} onChange={setActiveView} />
      <main className="workspace">
        {activeView === 'as-is' ? (
          <AsIsMap />
        ) : activeView === 'to-be' ? (
          <ToBeMap />
        ) : (
          <PlaceholderView
            title="ARCHITECTURE"
            message="This view is reserved for software architecture mapping. No architecture has been designed yet."
          />
        )}
      </main>
    </div>
  )
}

export default App
