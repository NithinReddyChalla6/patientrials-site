import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { auth, passwordProblems, ApiError } from '@/data/api'
import { PASSWORD_RULES } from '@/data/types'
import { useForm } from '@/lib/use-form'
import { matches, required } from '@/lib/validators'
import { Brand } from '@/components/layout/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { ErrorSummary } from '@/components/patterns/error-summary'
import { useAuth } from './auth-context'

const LABELS = {
  currentPassword: 'Current password',
  newPassword: 'New password',
  confirmPassword: 'Confirm new password',
}

/**
 * Choosing your own password, after an administrator issued one.
 *
 * The legacy portal dropped people onto the platform's own change-password
 * screen with the requirements listed as a wall of text under the field. The
 * requirements are the same; here they are a checklist that ticks off as you
 * type, so you can see which one you have not met rather than resubmitting to
 * find out.
 */
export function ChangePasswordPage() {
  const { user, updateUser, signOut } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [serverError, setServerError] = React.useState<string>()
  const summaryRef = React.useRef<HTMLDivElement>(null)

  const form = useForm({
    initialValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
    rules: {
      currentPassword: required(LABELS.currentPassword),
      newPassword: (value: string) =>
        required(LABELS.newPassword)(value) ?? passwordProblems(value),
      confirmPassword: required(LABELS.confirmPassword),
    },
    onSubmit: async (values) => {
      setServerError(undefined)
      if (!user) return
      try {
        await auth.changePassword(user.id, values.currentPassword, values.newPassword)
        updateUser({ mustChangePassword: false })
        toast.success('Password changed', 'You can use your new password from now on.')
        navigate('/hub', { replace: true })
      } catch (error) {
        setServerError(
          error instanceof ApiError ? error.message : 'We could not change your password.',
        )
      }
    },
  })

  const confirmError =
    form.errors.confirmPassword ??
    (form.touched.confirmPassword || form.submitAttempted
      ? matches(form.values.newPassword, 'Passwords')(form.values.confirmPassword)
      : undefined)

  const checks = React.useMemo(() => {
    const v = form.values.newPassword
    return [
      v.length >= 8,
      v.length > 0 && v.length <= 40,
      /[a-z]/.test(v),
      /[A-Z]/.test(v),
      /[0-9]/.test(v),
    ]
  }, [form.values.newPassword])

  async function onSubmit(e: React.FormEvent) {
    const result = await form.submit(e)
    if (!result.ok || confirmError) {
      window.requestAnimationFrame(() => summaryRef.current?.focus())
    }
  }

  const visibleErrors = {
    ...form.errors,
    ...(confirmError ? { confirmPassword: confirmError } : {}),
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 lg:py-14">
        <div className="rounded-xl border border-border bg-card p-6 shadow-md sm:p-8">
          <span className="flex size-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <KeyRound className="size-5" aria-hidden="true" />
          </span>
          <h1 className="mt-4 text-xl font-semibold text-foreground">Choose your own password</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your site administrator issued the password you just used. Set your own to carry on.
          </p>

          <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
            <div ref={summaryRef} tabIndex={-1} className="outline-none">
              {form.submitAttempted && (
                <ErrorSummary errors={visibleErrors} labels={LABELS} />
              )}
            </div>

            {serverError && (
              <Alert tone="error" title="We could not change your password">
                {serverError}
              </Alert>
            )}

            <FormField
              id="currentPassword"
              label={LABELS.currentPassword}
              hint="The one your administrator gave you."
              error={form.errors.currentPassword}
              required
            >
              {(aria) => (
                <Input
                  {...aria}
                  {...form.field('currentPassword')}
                  type="password"
                  autoComplete="current-password"
                />
              )}
            </FormField>

            <FormField
              id="newPassword"
              label={LABELS.newPassword}
              error={form.errors.newPassword}
              required
            >
              {(aria) => (
                <Input
                  {...aria}
                  {...form.field('newPassword')}
                  type="password"
                  autoComplete="new-password"
                />
              )}
            </FormField>

            <ul className="space-y-1.5 rounded-lg border border-border bg-sunken p-3">
              {PASSWORD_RULES.map((rule, i) => (
                <li key={rule} className="flex items-center gap-2 text-xs">
                  <ShieldCheck
                    className={checks[i] ? 'size-3.5 text-success' : 'size-3.5 text-muted-foreground'}
                    aria-hidden="true"
                  />
                  <span className={checks[i] ? 'text-foreground' : 'text-muted-foreground'}>
                    {rule}
                  </span>
                  <span className="sr-only">{checks[i] ? ' met' : ' not yet met'}</span>
                </li>
              ))}
            </ul>

            <FormField
              id="confirmPassword"
              label={LABELS.confirmPassword}
              error={confirmError}
              required
            >
              {(aria) => (
                <Input
                  {...aria}
                  {...form.field('confirmPassword')}
                  type="password"
                  autoComplete="new-password"
                />
              )}
            </FormField>

            <Button
              type="submit"
              variant="brand"
              size="lg"
              className="w-full"
              loading={form.submitting}
              loadingLabel="Saving"
            >
              Save password
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
