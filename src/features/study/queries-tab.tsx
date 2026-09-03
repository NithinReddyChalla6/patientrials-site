import * as React from 'react'
import { MessageSquare, Plus, X } from 'lucide-react'
import { sponsorQueriesApi, ApiError } from '@/data/api'
import type { SponsorQuery } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { formatDateTime } from '@/lib/format'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { EmptyState } from '@/components/patterns/empty-state'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { useAuth } from '@/features/auth/auth-context'
import { useStudy } from './study-layout'

/**
 * Questions raised with the sponsor about this study.
 *
 * The legacy screen was a bare record list behind a New button, where a query
 * and the answer to it were separate rows you had to match up yourself. Here a
 * question carries its answer, so reading one tells you where it stands, and
 * what is still outstanding is the thing the list leads with.
 */
export function QueriesTab() {
  const { study } = useStudy()
  const { can, user } = useAuth()
  const toast = useToast()
  const canManage = can('query.manage')

  const state = useAsync(() => sponsorQueriesApi.list(study.id), [study.id])
  const [asking, setAsking] = React.useState(false)
  const [question, setQuestion] = React.useState('')
  const [error, setError] = React.useState<string>()
  const [saving, setSaving] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string>()

  async function send() {
    setError(undefined)
    setSaving(true)
    try {
      await sponsorQueriesApi.add({
        studyId: study.id,
        question,
        raisedByName: user ? `${user.firstName} ${user.lastName}` : 'Site staff',
      })
      toast.success('Query sent', 'It stays open until the sponsor answers.')
      setQuestion('')
      setAsking(false)
      state.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not send this query.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(query: SponsorQuery) {
    setBusyId(query.id)
    try {
      await sponsorQueriesApi.remove(query.id)
      toast.success('Query withdrawn')
      state.reload()
    } finally {
      setBusyId(undefined)
    }
  }

  return (
    <AsyncBoundary
      state={state}
      loading={
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-40" />
        </div>
      }
      errorTitle="We could not load the queries for this study"
    >
      {(queries) => {
        const open = queries.filter((q) => q.status === 'open').length

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Queries with the sponsor</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Questions this site has raised about the protocol or a participant, and the
                sponsor's answers.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {queries.length === 0
                  ? 'None raised'
                  : `${queries.length} raised, ${open} awaiting an answer`}
              </h3>
              {canManage && !asking && (
                <Button variant="outline" size="sm" onClick={() => setAsking(true)}>
                  <Plus aria-hidden="true" />
                  New query
                </Button>
              )}
            </div>

            {canManage && asking && (
              <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <h4 className="text-sm font-semibold text-foreground">Raise a query</h4>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAsking(false)}
                    aria-label="Cancel this query"
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {error && (
                    <Alert tone="error" title="We could not send this query">
                      {error}
                    </Alert>
                  )}

                  <FormField
                    id="queryQuestion"
                    label="Your question"
                    hint="Give the sponsor enough context to answer without coming back to you."
                    required
                  >
                    {(aria) => (
                      <Textarea
                        {...aria}
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        rows={4}
                        placeholder="For example: is a 36 hour delay to the day 8 blood draw within the visit window?"
                      />
                    )}
                  </FormField>

                  <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
                    <Button type="button" variant="ghost" onClick={() => setAsking(false)}>
                      Cancel
                    </Button>
                    <Button type="button" variant="brand" onClick={send} loading={saving}>
                      Send query
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {queries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card">
                <EmptyState
                  compact
                  icon={MessageSquare}
                  title="No queries raised"
                  description="Ask the sponsor about the protocol, a deviation, or a participant."
                />
              </div>
            ) : (
              <ul className="space-y-3">
                {queries.map((query) => (
                  <li
                    key={query.id}
                    className="rounded-lg border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge tone={query.status === 'answered' ? 'success' : 'warning'}>
                          {query.status === 'answered' ? 'Answered' : 'Awaiting sponsor'}
                        </Badge>
                        <span className="id text-xs text-muted-foreground">{query.id}</span>
                      </div>
                      {canManage && query.status === 'open' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(query)}
                          disabled={busyId === query.id}
                        >
                          Withdraw
                        </Button>
                      )}
                    </div>

                    <p className="mt-2 whitespace-pre-line text-sm text-foreground">
                      {query.question}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Raised by {query.raisedByName}, {formatDateTime(query.createdAt)}
                    </p>

                    {query.status === 'answered' && query.response && (
                      <div className="mt-3 rounded-md border-l-2 border-success bg-sunken p-3">
                        <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                          Sponsor's answer
                        </p>
                        <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                          {query.response}
                        </p>
                        {query.respondedAt && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDateTime(query.respondedAt)}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      }}
    </AsyncBoundary>
  )
}
