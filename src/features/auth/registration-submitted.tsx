import type { CSSProperties, ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Brand } from '@/components/layout/brand'
import { Button } from '@/components/ui/button'

/**
 * Registration confirmation — the "thank you" moment.
 *
 * A dimensional brand shield with a soft glow, an elegant serif headline, then
 * the plain facts: what was created, what happens now, and the one action that
 * follows. Sized to sit on a single screen without scrolling. Motion is one-shot
 * on mount and resolves to the final state under prefers-reduced-motion.
 */
export function RegistrationSubmittedPage() {
  const state = useLocation().state as { email?: string; orgName?: string } | null
  const org = state?.orgName

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-8">
      <main className="w-full max-w-md text-center">
        <div className="flex justify-center" style={rise(0)}>
          <Brand />
        </div>

        <div className="mt-6 flex justify-center" style={rise(120)}>
          <Shield />
        </div>

        <h1
          className="mt-4 text-[2.5rem] leading-none text-foreground"
          style={{ ...rise(480), fontFamily: '"Fraunces", Georgia, "Times New Roman", serif', fontWeight: 600 }}
        >
          Thank you
        </h1>

        <p
          className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground"
          style={rise(600)}
        >
          {org ? (
            <>
              We’ve received your registration for{' '}
              <span className="font-medium text-foreground">{org}</span>.{' '}
            </>
          ) : (
            'We’ve received your registration. '
          )}
          Your site is being set up — you’ll be able to sign in in a few minutes.
        </p>

        <div
          className="mx-auto mt-6 max-w-sm rounded-2xl border border-border bg-card p-4 text-left shadow-md"
          style={rise(700)}
        >
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            What happens next
          </p>
          <ol className="mt-2.5 space-y-2.5">
            <NextStep
              n={1}
              title="We confirm your details"
              body={
                state?.email ? (
                  <>
                    Emailed to <span className="font-medium text-foreground">{state.email}</span> once
                    ready.
                  </>
                ) : (
                  'A confirmation email goes out once your account is ready.'
                )
              }
            />
            <NextStep n={2} title="You sign in" body="With the email and password you just chose." />
            <NextStep
              n={3}
              title="You finish your site setup"
              body="A short guided setup — trial history, IRB, labs, team."
            />
          </ol>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center" style={rise(800)}>
          <Button variant="brand" size="lg" asChild>
            <Link to="/login">Go to sign in</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/find-trials">Browse trials</Link>
          </Button>
        </div>

        <p className="mt-4 text-[0.8125rem] text-muted-foreground" style={rise(880)}>
          Need help? Contact your PatienTrials coordinator.
        </p>
      </main>
    </div>
  )
}

/** Staggered entrance for a block: rises + fades in after `delay` ms. */
function rise(delay: number): CSSProperties {
  return {
    animation: `rt-rise 0.55s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms both`,
  }
}

/**
 * The focal mark — a glossy azure security shield inside a soft aura, with a
 * checkmark that draws itself. Built as one SVG so it stays crisp at any size.
 */
function Shield() {
  return (
    <svg
      viewBox="0 0 200 208"
      className="h-[120px] w-[120px]"
      role="img"
      aria-label="Registration received"
      style={{ animation: 'rt-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
    >
      <defs>
        <radialGradient id="rt-glow" cx="50%" cy="46%" r="50%">
          <stop offset="0%" stopColor="#1a95d8" stopOpacity="0.5" />
          <stop offset="45%" stopColor="#1a95d8" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#1a95d8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rt-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3fabe8" />
          <stop offset="52%" stopColor="#0a7abd" />
          <stop offset="100%" stopColor="#04587e" />
        </linearGradient>
        <linearGradient id="rt-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id="rt-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <clipPath id="rt-clip">
          <path d="M72 52 L128 52 Q140 52 140 64 L140 100 C140 128 122 148 100 159 C78 148 60 128 60 100 L60 64 Q60 52 72 52 Z" />
        </clipPath>
      </defs>

      <circle cx="100" cy="98" r="96" fill="url(#rt-glow)" />
      <ellipse cx="100" cy="168" rx="44" ry="9" fill="#04405f" opacity="0.16" filter="url(#rt-soft)" />

      <path
        d="M72 52 L128 52 Q140 52 140 64 L140 100 C140 128 122 148 100 159 C78 148 60 128 60 100 L60 64 Q60 52 72 52 Z"
        fill="url(#rt-body)"
        stroke="#63bdf0"
        strokeOpacity="0.45"
        strokeWidth="1"
      />
      <g clipPath="url(#rt-clip)">
        <ellipse cx="100" cy="66" rx="54" ry="34" fill="url(#rt-gloss)" />
      </g>

      <path
        d="M82 101 l11 12 l25 -28"
        fill="none"
        stroke="#ffffff"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: 56,
          strokeDashoffset: 56,
          animation: 'rt-check 0.45s ease-out 560ms forwards',
        }}
      />
    </svg>
  )
}

function NextStep({ n, title, body }: { n: number; title: string; body: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-[0.6875rem] font-semibold text-brand"
        aria-hidden="true"
      >
        {n}
      </span>
      <div>
        <p className="text-[0.8125rem] font-medium leading-5 text-foreground">{title}</p>
        <p className="text-xs leading-4 text-muted-foreground">{body}</p>
      </div>
    </li>
  )
}
