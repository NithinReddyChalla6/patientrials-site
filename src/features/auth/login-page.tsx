import * as React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  UserRoundPlus,
  Users,
} from 'lucide-react'
import { Brand } from '@/components/layout/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/patterns/form-field'
import { useForm } from '@/lib/use-form'
import { all, email as emailRule, required } from '@/lib/validators'
import { useAuth } from './auth-context'
import { DEMO_ACCOUNTS } from './demo-accounts'

/**
 * Where a fresh sign-in lands. A site administrator is taken straight to the
 * Site Onboard wizard, the way the legacy portal opened onto it after login;
 * everyone else goes to the workspace hub. An explicit `from` — set when a
 * protected page bounced the user here — always wins.
 */
function destinationAfterLogin(role: string | undefined): string {
  return role === 'site_administrator' ? '/onboarding' : '/hub'
}

/**
 * Sign in, and the four ways to join.
 *
 * The legacy landing page stacked four registration panels in a scrolling column
 * beside the login form, giving equal weight to the thing most visitors do every
 * day (sign in) and the thing they do once (register). Sign-in leads here; the
 * join paths sit alongside as a secondary panel, each stating who it is for.
 */

const JOIN_PATHS = [
  {
    persona: 'site_admin',
    icon: Stethoscope,
    title: 'Site Administrator',
    description:
      'Set up a new site location on PatienTrials and invite the staff who will run its studies.',
    cta: 'Register a site',
  },
  {
    persona: 'site_network_admin',
    icon: Users,
    title: 'Site Network Administrator',
    description: 'Oversee several sites in a network from one account.',
    cta: 'Register a network',
  },
  {
    persona: 'independent_nurse',
    icon: UserRoundPlus,
    title: 'Independent Nurse',
    description: 'Create a nurse profile to support visits across participating sites.',
    cta: 'Register as a nurse',
  },
] as const

export function LoginPage() {
  const { signIn, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = React.useState<string>()
  const from = (location.state as { from?: string } | null)?.from
  // Set while a fresh sign-in computes its own destination, so the effect below
  // does not also redirect and race it.
  const handlingSubmit = React.useRef(false)

  React.useEffect(() => {
    if (session && !handlingSubmit.current) navigate(from ?? '/hub', { replace: true })
  }, [session, navigate, from])

  const form = useForm({
    initialValues: { email: '', password: '' },
    rules: {
      email: all(required('Email address'), emailRule),
      password: required('Password'),
    },
    onSubmit: async (values) => {
      setServerError(undefined)
      handlingSubmit.current = true
      try {
        const next = await signIn(values.email, values.password)
        navigate(from ?? destinationAfterLogin(next.user.role), { replace: true })
      } catch (error) {
        handlingSubmit.current = false
        setServerError(error instanceof Error ? error.message : 'Sign-in failed.')
      }
    },
  })

  return (
    <div className="min-h-dvh bg-background">
      <a href="#signin" className="skip-link">
        Skip to sign in
      </a>

      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <Button variant="ghost" size="sm" className="text-cta hover:text-cta" asChild>
            <Link to="/find-trials">Looking for a trial?</Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16 lg:py-16">
        {/* Sign in */}
        <section id="signin" className="order-1 lg:order-2">
          <div className="rounded-xl border border-border bg-card p-6 shadow-md sm:p-8">
            <h1 className="text-xl font-semibold text-foreground">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              For researchers, principal investigators and study staff.
            </p>

            <form
              className="mt-6 space-y-4"
              onSubmit={form.submit}
              noValidate
              aria-describedby={serverError ? 'signin-error' : undefined}
            >
              {serverError && (
                <div id="signin-error">
                  <Alert tone="error" title="We could not sign you in">
                    {serverError}
                  </Alert>
                </div>
              )}

              <FormField id="email" label="Email address" error={form.errors.email} required>
                {(aria) => (
                  <Input
                    {...aria}
                    {...form.field('email')}
                    type="email"
                    name="email"
                    autoComplete="username"
                    data-testid="user-email"
                    placeholder="you@yoursite.com"
                  />
                )}
              </FormField>

              <FormField id="password" label="Password" error={form.errors.password} required>
                {(aria) => (
                  <Input
                    {...aria}
                    {...form.field('password')}
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    data-testid="user-password"
                  />
                )}
              </FormField>

              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="w-full"
                loading={form.submitting}
                loadingLabel="Signing you in"
              >
                Log in
              </Button>
            </form>

            <div className="mt-6 border-t border-border pt-5">
              <h2 className="text-sm font-medium text-foreground">Forgot your password?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Site staff accounts are managed by your site administrator. Contact your site
                coordinator to have your credentials reset.
              </p>
            </div>

            <DemoAccounts
              onUse={(accountEmail) => {
                // Shared password the auth API seeds for every demo account.
                form.setMany({ email: accountEmail, password: 'PatienTrials@2026' })
              }}
            />
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-success" aria-hidden="true" />
            Secure, role-based sign-in
          </p>
        </section>

        {/* Join paths */}
        <section className="order-2 min-w-0 lg:order-1">
          <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
            Run your trials from one place
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Onboard your site, take on studies, screen and recruit participants, and build the forms
            your protocol needs.
          </p>

          <div className="mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              New to PatienTrials?
            </h3>
            <ul className="mt-3 space-y-3">
              {JOIN_PATHS.map((path) => (
                <li key={path.persona}>
                  <Link
                    to={`/register?as=${path.persona}`}
                    className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-[background-color,border-color,box-shadow] duration-200 hover:border-brand/50 hover:bg-accent/30 hover:shadow-sm"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-brand transition-colors duration-200 group-hover:bg-brand group-hover:text-brand-foreground">
                      <path.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">{path.title}</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        {path.description}
                      </span>
                      <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand">
                        {path.cta}
                        <ArrowRight
                          className="size-3.5 transition-transform group-hover:translate-x-0.5"
                          aria-hidden="true"
                        />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-lg border border-cta/25 bg-cta/5 p-4">
              <div className="flex items-start gap-3">
                <HeartPulse className="mt-0.5 size-5 shrink-0 text-cta" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-foreground">Are you a participant?</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    You do not need an account to look for a study.
                  </p>
                  <Link
                    to="/find-trials"
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-cta underline-offset-4 hover:underline"
                  >
                    Find a trial
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

/**
 * There is no identity provider behind this build, so the seeded accounts are
 * listed rather than left for the reviewer to guess.
 */
function DemoAccounts({ onUse }: { onUse: (email: string) => void }) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="mt-5 rounded-lg border border-border bg-sunken p-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-9 w-full items-center justify-between text-left text-sm font-medium text-foreground"
      >
        Demo accounts
        <span className="text-xs font-normal text-muted-foreground">
          {open ? 'Hide' : 'Show'}
        </span>
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                onClick={() => onUse(account.email)}
                className="flex min-h-11 w-full flex-col justify-center rounded-md px-2 text-left transition-colors hover:bg-card"
              >
                <span className="text-sm text-foreground">{account.email}</span>
                <span className="text-xs text-muted-foreground">{account.role}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <p className="mt-2 px-2 text-xs text-muted-foreground">
          Choosing an account fills its email and the shared demo password.
        </p>
      )}
    </div>
  )
}
