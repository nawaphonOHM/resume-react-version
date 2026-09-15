import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@jetbrains/ring-ui-built/components/style.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
