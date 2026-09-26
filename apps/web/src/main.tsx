import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { initErrorReporting } from './lib/errorReporting'

initErrorReporting()

// After a deploy, an already-open tab may still point at page chunks that no longer exist. Reload once to pick
// up the new build instead of leaving a blank or half-loaded screen.
window.addEventListener('vite:preloadError', () => {
  try {
    if (sessionStorage.getItem('herai.chunkReload') === '1') return
    sessionStorage.setItem('herai.chunkReload', '1')
  } catch {
    // Private mode: reload anyway, once per page load.
  }
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
