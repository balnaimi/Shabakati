import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@fontsource/zain/arabic-400.css'
import '@fontsource/zain/arabic-700.css'
import '@fontsource/zain/latin-400.css'
import '@fontsource/zain/latin-700.css'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
