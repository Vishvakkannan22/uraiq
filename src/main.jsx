import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'
/* Imported for its side effect: applies the saved theme attribute to <html>
   before the first render, so there's no flash of the wrong theme. */
import './lib/theme.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
