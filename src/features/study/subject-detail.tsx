import * as React from 'react'
import { Check, CircleSlash, ThumbsUp, UserCheck, X } from 'lucide-react'
import type { Subject, TriageAction } from '@/data/types'
import { cn } from '@/lib/cn'
import { formatDate, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { SubjectStatusBadge } from '@/components/patterns/status-badge'
import { ConfirmDialog } from '@/components/patterns/confirm-dialog'
import { useAuth } from '@/features/auth/auth-context'
import { SubjectPrescriptions } from './subject-prescriptions'

interface SubjectDetailProps {
  subject: Subject
  canTriage: boolean
  busy: boolean
  onAction: (status: TriageAction) => void
}

/**
 * A participant's record and the three decisions a coordinator can make.
 *
 * The legacy flow required opening a preview icon, then an "Open Record" link,
 * then acting, then navigating all the way back to the studies list — the record
 * screen showed the raw table row and nothing about *why* the participant might
 * be eligible. Here the pre-screening answers are shown against the answer the
 * study wanted, so the decision has its evidence beside it.
 */
export function SubjectDetail({ subject, canTriage, busy, onAction }: SubjectDetailProps) {
  const [confirmReject, setConfirmReject] = React.useState(false)
  const { can } = useAuth()

  const mismatches = subject.prescreeningAnswers.filter(
    (a) => a.desired && a.answer !== a.desired,
  ).length

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground">
              {subject.firstName} {subject.lastName}
            </h3>
            <p className="id mt-0.5 text-sm text-muted-foreground">{subject.id}</p>
          </div>
          <SubjectStatusBadge status={subject.status} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Signed up {formatDateTime(subject.createdAt)}
        </p>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {mismatches > 0 && (
          <Alert tone="warning" title={`${mismatches} pre-screening answer${mismatches === 1 ? '' : 's'} did not match`}>
            Review the answers below before validating this participant.
          </Alert>
        )}

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Pre-screening answers
          </h4>
          {subject.prescreeningAnswers.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              This participant signed up before pre-screening questions were added.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {subject.prescreeningAnswers.map((answer, index) => {
                const matched = !answer.desired || answer.answer === answer.desired
                return (
                  <li key={index} className="rounded-md border border-border bg-card p-3">
                    <p className="text-sm text-foreground">{answer.question}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                          matched
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive',
                        )}
                      >
                        {matched ? (
                          <Check className="size-3" aria-hidden="true" />
                        ) : (
                          <X className="size-3" aria-hidden="true" />
                        )}
                        {answer.answer}
                      </span>
                      {answer.desired && (
                        <span className="text-xs text-muted-foreground">
                          Study wanted: {answer.desired}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Contact
          </h4>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Email" value={subject.email} />
            <Row label="Phone" value={subject.phone} />
            <Row label="Location" value={`${subject.city} ${subject.zipcode}`} />
          </dl>
        </section>

        <section>
          <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            About the participant
          </h4>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Date of birth" value={formatDate(subject.dateOfBirth)} />
            <Row label="Gender" value={subject.gender} />
            <Row label="Primary language" value={subject.primaryLanguage} />
            <Row label="Smoking status" value={subject.smokingStatus} />
            <Row label="Ethnicity" value={subject.ethnicity.join(', ') || '—'} />
          </dl>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground">Health condition, in their words</p>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground">
              {subject.healthCondition || '—'}
            </p>
          </div>
        </section>

        <SubjectPrescriptions
          subjectId={subject.id}
          studyId={subject.studyId}
          canManage={can('medication.manage')}
        />
      </div>

      {canTriage && (
        <div className="border-t border-border bg-sunken p-4">
          <p className="mb-3 text-xs text-muted-foreground">
            {subject.status === 'pending'
              ? 'Decide whether this participant should move forward.'
              : 'You can change this decision at any time.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAction('validated')}
              disabled={busy || subject.status === 'validated'}
            >
              <UserCheck aria-hidden="true" />
              Validate
            </Button>
            <Button
              variant="brand"
              size="sm"
              onClick={() => onAction('recruited')}
              disabled={busy || subject.status === 'recruited'}
            >
              <ThumbsUp aria-hidden="true" />
              Recruit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setConfirmReject(true)}
              disabled={busy || subject.status === 'rejected'}
            >
              <CircleSlash aria-hidden="true" />
              Reject
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReject}
        onOpenChange={setConfirmReject}
        title={`Reject ${subject.firstName} ${subject.lastName}?`}
        description={`${subject.id} will be marked as not eligible for this study and removed from your screening queue. They will not be contacted about it again. You can undo this from the "Not eligible" filter.`}
        confirmLabel="Reject participant"
        destructive
        loading={busy}
        onConfirm={() => {
          setConfirmReject(false)
          onAction('rejected')
        }}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,8rem)_1fr] gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-foreground">{value}</dd>
    </div>
  )
}
