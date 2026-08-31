import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { hydrateSiteState, initSimulationFromUrl } from './data/api'
import './styles/globals.css'

initSimulationFromUrl(window.location.search)

function mount() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

// Load the persisted onboarding data before the first paint so the app opens on
// the saved state rather than the seed. If the data server is unreachable this
// resolves immediately and we mount on the in-memory seed instead.
hydrateSiteState().finally(mount)
