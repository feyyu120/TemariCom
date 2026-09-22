import { createRoot } from 'react-dom/client'
import '@/global.css'
import App from '@/app/App'
import { ThemeProvider } from '@/theme'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/services/queryClient'
import { AuthProvider } from '@/features/auth'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element was not found')
}

createRoot(rootElement).render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider initialMode="dark">
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
)
