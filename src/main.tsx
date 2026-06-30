import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App'

async function bootstrap() {
  // Serve the admin API from in-memory fixtures when VITE_USE_MOCK=true. Opt-in via
  // env (used for local dev and for backendless demo deploys). When the flag is not
  // 'true' at build time, this branch is statically dead and the mock is tree-shaken
  // out of the bundle entirely.
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { installMockApi } = await import('./shared/mock/install')
    installMockApi()
  }

  const rootEl = document.getElementById('root')
  if (!rootEl) throw new Error('Root element #root not found')

  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void bootstrap()
