import * as React from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowRight, MapPin, Search, SearchX } from 'lucide-react'
import { publicApi } from '@/data/api'
import { useAsync } from '@/lib/use-async'
import { pluralize } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { EmptyState } from '@/components/patterns/empty-state'
import { RecruitmentBadge } from '@/components/patterns/status-badge'

/**
 * Trial search for participants.
 *
 * The legacy page was a single unlabelled text box beside a `<div>` that read
 * SEARCH, which returned a list of headings identified only by NCT number — so a
 * participant had to already know the registry code of the study they wanted.
 * The field is labelled and searchable by condition here, and each result says
 * what the study is about, who it is for and where it runs.
 */
export function FindTrialsPage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('condition') ?? ''
  const [value, setValue] = React.useState(query)

  const state = useAsync(() => publicApi.search(query), [query])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setParams(value ? { condition: value } : {}, { replace: true })
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          Find a clinical trial
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Search by health condition or by the study's registry number. Taking part is voluntary,
          and looking does not commit you to anything.
        </p>
      </div>

      <form className="mt-8 max-w-2xl" onSubmit={submit}>
        <label htmlFor="condition" className="block text-sm font-medium text-foreground">
          Condition or study number
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Input
            id="condition"
            name="condition"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type 2 diabetes, COPD, or NCT07764380"
            className="h-12 sm:flex-1"
            autoComplete="off"
          />
          <Button type="submit" variant="brand" size="lg" className="sm:px-8">
            <Search aria-hidden="true" />
            Search
          </Button>
        </div>
      </form>

      <div className="mt-10">
        <AsyncBoundary
          state={state}
          loading={
            <ul className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-44" />
                </li>
              ))}
            </ul>
          }
          isEmpty={(trials) => trials.length === 0}
          empty={
            <div className="rounded-lg border border-dashed border-border bg-card">
              <EmptyState
                icon={SearchX}
                title={
                  query
                    ? `We could not find a trial matching "${query}"`
                    : 'No trials are recruiting right now'
                }
                description={
                  query
                    ? 'Try a different condition, or clear your search to see everything that is open.'
                    : 'Check back soon — new studies open regularly.'
                }
                action={
                  query ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setValue('')
                        setParams({}, { replace: true })
                      }}
                    >
                      Show all trials
                    </Button>
                  ) : undefined
                }
              />
            </div>
          }
          errorTitle="We could not load trials"
        >
          {(trials) => (
            <>
              <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
                {pluralize(trials.length, 'trial')} found
                {query ? ` for "${query}"` : ''}
              </p>
              <ul className="space-y-4">
                {trials.map((trial) => (
                  <li key={trial.nctId}>
                    <article className="rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-brand/40 sm:p-6">
                      <RecruitmentBadge status={trial.recruitmentStatus} />

                      <h2 className="mt-3 text-xl font-semibold leading-snug text-foreground">
                        <Link
                          to={`/trials/${trial.nctId}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {trial.title}
                        </Link>
                      </h2>

                      <p className="mt-2 leading-6 text-muted-foreground">{trial.summary}</p>

                      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
                          <dt className="sr-only">Locations</dt>
                          <dd className="text-muted-foreground">{trial.locations.join(' · ')}</dd>
                        </div>
                        <div>
                          <dt className="sr-only">Condition</dt>
                          <dd className="text-muted-foreground">{trial.condition}</dd>
                        </div>
                        <div>
                          <dt className="sr-only">Time commitment</dt>
                          <dd className="text-muted-foreground">{trial.estimatedDuration}</dd>
                        </div>
                      </dl>

                      <div className="mt-5 flex flex-wrap items-center gap-4">
                        <Button variant="brand" asChild>
                          <Link to={`/trials/${trial.nctId}`}>
                            See if you can take part
                            <ArrowRight aria-hidden="true" />
                          </Link>
                        </Button>
                        <span className="id text-xs text-muted-foreground">{trial.nctId}</span>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </>
          )}
        </AsyncBoundary>
      </div>
    </div>
  )
}
