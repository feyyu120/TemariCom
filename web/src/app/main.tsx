import { createRoot } from 'react-dom/client'
import '@/global.css'
import App from '@/app/App'
import { ThemeProvider } from '@/theme'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element was not found')
}

createRoot(rootElement).render(
  <ThemeProvider initialMode="dark">
    <App />
  </ThemeProvider>
)
