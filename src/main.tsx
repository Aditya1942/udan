import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import '@fontsource-variable/piazzolla'
import './styles/hallmark/tokens.css'
import './styles/tokens.css'
import './styles/hallmark/base.css'
import './styles/base.css'
import './styles/buttons.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
