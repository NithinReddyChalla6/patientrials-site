import * as React from 'react'
import { Link } from 'react-router-dom'
import { Archive, Megaphone, TriangleAlert } from 'lucide-react'
import { studiesApi, subjectsApi } from '@/data/api'
import { useAsync } from '@/lib/use-async'
import { formatCount, formatDate } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert } from '@/components/ui/alert'
import { useToast } from '@/components/ui/toast'
import { StatTile } from '@/components/patterns/stat-tile'
import { ConfirmDialog } from '@/components/patterns/confirm-dialog'
import { useAuth } from '@/features/auth/auth-context'
import { useStudy } from './study-layout'

/**
 * Study overview — the state of one study and what is missing from its setup.
 *
 * The legacy portal opened a study straight into a platform record form, so the
 * first thing a coordinator saw was field metadata rather than whether the study
 * was ready to recruit. The readiness list here names the specific gaps and
 * links to the tab that closes each one.
 */
export function OverviewTab() {
  const { study, reload } = useStudy()
  const { can } = useAuth()
  const toast = useToast()
  const counts = useAsync(() => subjectsApi.counts(study.id), [study.id])
  const [archiveOpen, setArchiveOpen] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  const pct =
    study.enrollmentTarget > 0
      ? Math.min(100, Math.round((study.enrolled / study.enrollmentTarget) * 100))
      : 0

  const gaps = [
    !study.principalInvestigatorId && {
      label: 'No principal investigator assigned',
      to: `/studies/${study.id}/team`,
      cta: 'Assign one',
    },
    study.status !== 'promoted' && {
      label: 'Not promoted, so participants cannot find it',
      to: `/studies/${study.id}`,
      cta: 'Promote below',
    },
  ].filter(Boolean) as { label: string; to: string; cta: string }[]

  async function archive() {
    setBusy(true)
    try {
      await studiesApi.setStatus(study.id, 'archived')
      toast.success('Study archived', 'It no longer appears in your active list.')
      setArchiveOpen(false)
      reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Awaiting review"
          value={counts.data?.pending ?? '—'}
          hint="Participants who have signed up"
        />
        <StatTile label="Validated" value={counts.data?.validated ?? '—'} hint="Passed screening" />
        <StatTile
          label="Recruited"
          value={counts.data?.recruited ?? '—'}
          hint="Enrolled on the study"
        />
        <StatTile
          label="Enrolment"
          value={study.enrollmentTarget > 0 ? `${pct}%` : '—'}
          hint={
            study.enrollmentTarget > 0
              ? `${formatCount(study.enrolled)} of ${formatCount(study.enrollmentTarget)} target`
              : 'No target set'
          }
        />
      </div>

      {gaps.length > 0 && (
        <Alert tone="warning" title="This study is not ready to recruit">
          <ul className="mt-1 space-y-2">
            {gaps.map((gap) => (
              <li key={gap.label} className="flex flex-wrap items-center gap-2">
                <TriangleAlert className="size-3.5 shrink-0 text-warning" aria-hidden="true" />
                <span>{gap.label}</span>
                <Link
                  to={gap.to}
                  className="font-medium text-brand underline underline-offset-4 hover:no-underline"
                >
                  {gap.cta}
                </Link>
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Study details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <Row label="Study ID" value={<span className="id">{study.id}</span>} />
              <Row label="NCT number" value={<span className="id">{study.nctId}</span>} />
              <Row label="Condition" value={study.condition} />
              <Row label="Phase" value={study.phase} />
              <Row label="Sponsor" value={study.sponsor} />
              <Row label="Recruitment status" value={study.recruitmentStatus} />
              <Row label="Created" value={formatDate(study.createdAt)} />
              {study.promotedAt && <Row label="Promoted" value={formatDate(study.promotedAt)} />}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Public listing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {study.promotion ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Participants can find this study and sign up themselves.
                </p>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
                      About the study
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {study.promotion.upcomingResearch.join(' ')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
                      Who can take part
                    </dt>
                    <dd className="mt-1">
                      <ul className="space-y-1 text-foreground">
                        {study.promotion.conditions.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                  <Row label="Locations" value={study.promotion.locations.join(', ')} />
                  <Row label="Minimum age" value={study.promotion.minimumAge} />
                </dl>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/trials/${study.nctId}`} target="_blank" rel="noreferrer">
                    View the public page
                  </Link>
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  This study is not promoted. Participants cannot find it or sign up themselves,
                  and pre-screening questions will not be asked.
                </p>
                {can('study.promote') && (
                  <Button variant="brand" size="sm" asChild>
                    <Link to={`/studies/${study.id}/promote`}>
                      <Megaphone aria-hidden="true" />
                      Promote this study
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {can('study.archive') && study.status !== 'archived' && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Archive this study</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Archiving removes the study from your active list and stops new participants signing up.
            Its records stay available.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setArchiveOpen(true)}>
            <Archive aria-hidden="true" />
            Archive study
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive this study?"
        description={`${study.title} will move to your archived list. Participants will no longer be able to find or sign up for it. You can move it back to active at any time.`}
        confirmLabel="Archive study"
        loading={busy}
        onConfirm={archive}
      />

      {counts.isInitialLoading && <Skeleton className="h-2 w-full" />}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{value}</dd>
    </div>
  )
}
