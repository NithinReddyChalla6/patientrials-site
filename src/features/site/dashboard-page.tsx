import { Link } from 'react-router-dom'
import { ArrowRight, FileText, FlaskConical, Inbox, TrendingUp, Users } from 'lucide-react'
import { dashboardApi } from '@/data/api'
import { useAsync } from '@/lib/use-async'
import { formatCount, formatRelative, pluralize } from '@/lib/format'
import { PageHeader } from '@/components/patterns/page-header'
import { StatTile } from '@/components/patterns/stat-tile'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { EmptyState } from '@/components/patterns/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { RequestStatusBadge, SubjectStatusBadge } from '@/components/patterns/status-badge'
import { InferredNotice } from '@/components/patterns/inferred-notice'

/**
 * Site overview.
 *
 * The legacy sidebar had a "Dashboard" entry, but no screenshot or automated
 * test in the source material shows what it contained, so this is a designed
 * answer to the question a site lead actually opens the portal with: what needs
 * me today? Every number links to the screen where the work happens.
 */
export function DashboardPage() {
  const state = useAsync(() => dashboardApi.get(), [])

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        title="Dashboard"
        description="Where your studies, participants and paperwork stand right now."
      />

      <InferredNotice>
        This overview is a redesign proposal. The legacy portal listed a Dashboard in its navigation
        but the source material does not show what it contained.
      </InferredNotice>

      <AsyncBoundary
        state={state}
        loading={
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
            <Skeleton className="h-64" />
          </div>
        }
      >
        {(data) => {
          const enrolmentPct =
            data.enrollment.target > 0
              ? Math.round((data.enrollment.enrolled / data.enrollment.target) * 100)
              : 0

          return (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile
                  label="Active studies"
                  value={data.studies.active}
                  hint={`${data.studies.promoted} promoted, ${data.studies.archived} archived`}
                  icon={FlaskConical}
                />
                <StatTile
                  label="Awaiting review"
                  value={data.pipeline.pending}
                  hint="Participants who signed up and need screening"
                  icon={Users}
                />
                <StatTile
                  label="Recruited"
                  value={data.pipeline.recruited}
                  hint={`${formatCount(data.pipeline.validated)} validated and ready`}
                  icon={TrendingUp}
                />
                <StatTile
                  label="Enrolment"
                  value={`${enrolmentPct}%`}
                  hint={`${formatCount(data.enrollment.enrolled)} of ${formatCount(
                    data.enrollment.target,
                  )} target`}
                  icon={TrendingUp}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Screening pipeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <PipelineBar pipeline={data.pipeline} />
                </CardContent>
              </Card>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="flex-row items-center justify-between">
                    <CardTitle>Recent sign-ups</CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/studies">
                        All studies
                        <ArrowRight aria-hidden="true" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {data.recentSubjects.length === 0 ? (
                      <EmptyState
                        compact
                        icon={Users}
                        title="No sign-ups yet"
                        description="Participants appear here as soon as they complete sign-up on a promoted study."
                      />
                    ) : (
                      <ul className="divide-y divide-border border-t border-border">
                        {data.recentSubjects.map((subject) => (
                          <li key={subject.id}>
                            <Link
                              to={`/studies/${subject.studyId}/participants`}
                              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/40"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  {subject.firstName} {subject.lastName}
                                </span>
                                <span className="id block text-xs text-muted-foreground">
                                  {subject.id} · {formatRelative(subject.createdAt)}
                                </span>
                              </span>
                              <SubjectStatusBadge status={subject.status} />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card>
                    <CardHeader className="flex-row items-center justify-between">
                      <CardTitle>Study requests to answer</CardTitle>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/requests">
                          All requests
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      {data.openRequests.length === 0 ? (
                        <EmptyState
                          compact
                          icon={Inbox}
                          title="Nothing waiting on you"
                          description="Sponsor requests appear here when a study is offered to your site."
                        />
                      ) : (
                        <ul className="divide-y divide-border border-t border-border">
                          {data.openRequests.map((request) => (
                            <li key={request.id}>
                              <Link
                                to={`/requests/${request.id}`}
                                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/40"
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium text-foreground">
                                    {request.title}
                                  </span>
                                  <span className="id block text-xs text-muted-foreground">
                                    {request.id} · {request.nctId}
                                  </span>
                                </span>
                                <RequestStatusBadge status={request.status} />
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex-row items-center justify-between">
                      <CardTitle>Unfinished forms</CardTitle>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/forms">
                          Form library
                          <ArrowRight aria-hidden="true" />
                        </Link>
                      </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                      {data.draftForms.length === 0 ? (
                        <EmptyState
                          compact
                          icon={FileText}
                          title="No drafts"
                          description="Every form in your library has been published."
                        />
                      ) : (
                        <ul className="divide-y divide-border border-t border-border">
                          {data.draftForms.map((form) => (
                            <li key={form.id}>
                              <Link
                                to={`/forms/${form.id}`}
                                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-secondary/40"
                              >
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium text-foreground">
                                    {form.title}
                                  </span>
                                  <span className="block text-xs text-muted-foreground">
                                    Edited {formatRelative(form.updatedAt)} ·{' '}
                                    {pluralize(
                                      form.sections.reduce((n, s) => n + s.questions.length, 0),
                                      'question',
                                    )}
                                  </span>
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )
        }}
      </AsyncBoundary>
    </div>
  )
}

function PipelineBar({
  pipeline,
}: {
  pipeline: { pending: number; validated: number; recruited: number; rejected: number }
}) {
  const stages = [
    { key: 'pending', label: 'Awaiting review', value: pipeline.pending, className: 'bg-warning' },
    { key: 'validated', label: 'Validated', value: pipeline.validated, className: 'bg-info' },
    { key: 'recruited', label: 'Recruited', value: pipeline.recruited, className: 'bg-success' },
    {
      key: 'rejected',
      label: 'Not eligible',
      value: pipeline.rejected,
      className: 'bg-muted-foreground/40',
    },
  ]
  const total = stages.reduce((n, s) => n + s.value, 0)

  if (total === 0) {
    return (
      <EmptyState
        compact
        icon={Users}
        title="No participants yet"
        description="Once people sign up, this shows how many are waiting, screened and recruited."
      />
    )
  }

  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-secondary" role="img" aria-label={
        stages.map((s) => `${s.label}: ${s.value}`).join(', ')
      }>
        {stages.map((stage) =>
          stage.value === 0 ? null : (
            <div
              key={stage.key}
              className={stage.className}
              style={{ width: `${(stage.value / total) * 100}%` }}
            />
          ),
        )}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stages.map((stage) => (
          <div key={stage.key}>
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`size-2 rounded-full ${stage.className}`} aria-hidden="true" />
              {stage.label}
            </dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
              {formatCount(stage.value)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
