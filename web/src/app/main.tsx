import { createRoot } from 'react-dom/client'
import '@/global.css'
import App from '@/app/App'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element was not found')
}

createRoot(rootElement).render(<App />)
