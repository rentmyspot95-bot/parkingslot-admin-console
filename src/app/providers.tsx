import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError, setUnauthorizedHandler } from '@/shared/api/client'
import { useSessionStore } from '@/shared/auth/session'
import { ToastViewport } from '@/shared/ui'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failureCount, error) => {
          // Don't retry auth/permission errors.
          if (error instanceof ApiError && (error.status === 401 || error.status === 403 || error.status === 404)) {
            return false
          }
          return failureCount < 2
        },
        refetchOnWindowFocus: false,
      },
    },
  })
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient)
  const clearSession = useSessionStore((s) => s.clearSession)

  useEffect(() => {
    // When a refresh ultimately fails, drop the session → forces re-login.
    setUnauthorizedHandler(() => {
      clearSession()
      queryClient.clear()
    })
    return () => setUnauthorizedHandler(null)
  }, [clearSession, queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastViewport />
    </QueryClientProvider>
  )
}
