import ReactDOM from 'react-dom/client'
import { setApiBaseUrl } from '@burro/core'
import App from './App'
import './styles.css'

// The desktop renderer runs from file:// in production, so hosted AI
// providers (the /stream worker endpoint) need an absolute API base.
// Ollama/custom providers talk to their own base URL and work offline.
// TODO: default this to the deployed Burro worker URL once it's stable.
setApiBaseUrl(import.meta.env.VITE_BURRO_API_URL ?? '')

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
