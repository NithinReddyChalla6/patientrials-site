import { AuthProvider } from '@/features/auth/auth-context'
import { ToastProvider } from '@/components/ui/toast'
import { AppRoutes } from './router'

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  )
}
