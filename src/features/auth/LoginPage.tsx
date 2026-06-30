import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '@/shared/auth/useAuth'
import { useSessionStore } from '@/shared/auth/session'
import { Button, Card, FormField, Input, Logo, toast } from '@/shared/ui'
import { toastApiError } from '@/shared/hooks/useMutationToast'

export function LoginPage() {
  const { signIn } = useAuth()
  const status = useSessionStore((s) => s.status)
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totp, setTotp] = useState('')
  const [needsTotp, setNeedsTotp] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'authenticated') return <Navigate to={from} replace />

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const result = await signIn({ email, password, totp: totp || undefined })
      if (result.totpRequired) {
        setNeedsTotp(true)
        toast.info('Enter your authenticator code', 'Two-factor authentication is required.')
        return
      }
      navigate(from, { replace: true })
    } catch (err) {
      toastApiError(err, 'Sign-in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-brand-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-white">
          <Logo variant="fullWhite" className="mb-3 h-28 w-auto" alt="ParkingSlot" />
          <h1 className="text-lg font-bold text-white">Admin Console</h1>
          <p className="text-sm text-brand-200">Internal operations · sign in to continue</p>
        </div>
        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField label="Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={needsTotp}
                required
              />
            </FormField>
            <FormField label="Password" htmlFor="password" required>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={needsTotp}
                required
              />
            </FormField>
            {needsTotp && (
              <FormField label="Authenticator code" htmlFor="totp" hint="6-digit code from your TOTP app" required>
                <Input
                  id="totp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={totp}
                  onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                  required
                />
              </FormField>
            )}
            <Button type="submit" className="w-full" loading={submitting}>
              {needsTotp ? 'Verify & sign in' : 'Sign in'}
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-xs text-brand-300">
          Access is restricted and audited. Unauthorized use is prohibited.
        </p>
      </div>
    </div>
  )
}
