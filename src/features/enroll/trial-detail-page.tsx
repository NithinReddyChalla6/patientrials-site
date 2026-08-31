import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, ShieldCheck, Users } from 'lucide-react'
import { publicApi } from '@/data/api'
import { useAsync } from '@/lib/use-async'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { RecruitmentBadge } from '@/components/patterns/status-badge'

/**
 * The public page for one trial.
 *
 * The legacy app went from a search result straight to a "Sign Up" button, so a
 * participant decided to enter a clinical trial from a heading and a registry
 * number. This page answers what the study is, who it is for, where it happens
 * and what it asks of them before offering the same button.
 */
export function TrialDetailPage() {
  const { nctId = '' } = useParams()
  const state = useAsync(() => publicApi.get(nctId), [nctId])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/find-trials">
          <ArrowLeft aria-hidden="true" />
          Back to search
        </Link>
      </Button>

      <AsyncBoundary
        state={state}
        loading={
          <div className="mt-6 space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
          </div>
        }
        errorTitle="We could not load this trial"
      >
        {(trial) => (
          <article className="mt-6">
            <RecruitmentBadge status={trial.recruitmentStatus} />

            <h1 className="mt-3 text-3xl font-semibold leading-tight text-foreground">
              {trial.title}
            </h1>
            <p className="id mt-2 text-sm text-muted-foreground">{trial.nctId}</p>

            <p className="mt-5 text-lg leading-7 text-foreground">{trial.summary}</p>

            <dl className="mt-6 grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
              <Fact icon={Users} label="Who it is for" value={`Aged ${trial.minimumAge} and over`} />
              <Fact icon={MapPin} label="Where" value={trial.locations.join(' · ')} />
              <Fact icon={CalendarDays} label="Time commitment" value={trial.estimatedDuration} />
              <Fact icon={ShieldCheck} label="Run by" value={trial.sponsor} />
            </dl>

            <section className="mt-8">
              <h2 className="text-xl font-semibold text-foreground">
                You may be able to take part if
              </h2>
              <ul className="mt-3 space-y-2">
                {trial.eligibility.map((line) => (
                  <li key={line} className="flex gap-3 leading-6 text-foreground">
                    <span
                      className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand"
                      aria-hidden="true"
                    />
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                We will ask you a few questions to check. Answering them does not sign you up.
              </p>
            </section>

            <section className="mt-8 rounded-lg border border-border bg-sunken p-5">
              <h2 className="text-base font-semibold text-foreground">Before you decide</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <li>Taking part is voluntary. You can stop at any time, for any reason.</li>
                <li>Your usual care continues either way.</li>
                <li>
                  The study team will explain everything and answer your questions before anything
                  begins.
                </li>
              </ul>
            </section>

            <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center">
              <Button variant="brand" size="lg" asChild>
                <Link to={`/trials/${trial.nctId}/sign-up`}>
                  Sign Up
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                Takes about five minutes. You can stop part way through.
              </p>
            </div>
          </article>
        )}
      </AsyncBoundary>
    </div>
  )
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-[0.06em] text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
      </div>
    </div>
  )
}
