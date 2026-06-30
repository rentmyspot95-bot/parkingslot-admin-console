import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app/App'

async function bootstrap() {
  // Dev-only: serve the admin API from in-memory fixtures when VITE_USE_MOCK=true.
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
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
