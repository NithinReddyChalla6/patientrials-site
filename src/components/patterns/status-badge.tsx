import { Badge, type BadgeTone } from '@/components/ui/badge'
import { cn } from '@/lib/cn'
import type {
  FormStatus,
  StudyRequestStatus,
  StudyStatus,
  SubjectStatus,
  TrialStatus,
} from '@/data/types'

/**
 * One place where every domain status decides how it looks.
 *
 * The legacy UI rendered statuses as plain text in whatever column they landed
 * in, so "Terminated" and "Recruiting" were equally quiet. Mapping each status
 * to a tone once, here, means a new status is a one-line change and can never
 * drift between the studies list, the study header and the dashboard.
 */

const STUDY_TONES: Record<StudyStatus, { tone: BadgeTone; label: string }> = {
  promoted: { tone: 'brand', label: 'Promoted' },
  active: { tone: 'success', label: 'Active' },
  archived: { tone: 'neutral', label: 'Archived' },
}

const RECRUITMENT_TONES: Record<TrialStatus, BadgeTone> = {
  'Not yet recruiting': 'outline',
  Recruiting: 'success',
  'Enrolling by invitation': 'info',
  'Active, not recruiting': 'warning',
  Suspended: 'warning',
  Terminated: 'danger',
  Completed: 'neutral',
}

const SUBJECT_TONES: Record<SubjectStatus, { tone: BadgeTone; label: string }> = {
  pending: { tone: 'warning', label: 'Awaiting review' },
  validated: { tone: 'info', label: 'Validated' },
  recruited: { tone: 'success', label: 'Recruited' },
  rejected: { tone: 'danger', label: 'Not eligible' },
}

const FORM_TONES: Record<FormStatus, { tone: BadgeTone; label: string }> = {
  draft: { tone: 'outline', label: 'Draft' },
  published: { tone: 'success', label: 'Published' },
}

const REQUEST_TONES: Record<StudyRequestStatus, { tone: BadgeTone; label: string }> = {
  submitted: { tone: 'warning', label: 'Awaiting response' },
  under_review: { tone: 'info', label: 'Under review' },
  site_selected: { tone: 'success', label: 'Site selected' },
  declined: { tone: 'neutral', label: 'Declined' },
}

export function StudyStatusBadge({ status, className }: { status: StudyStatus; className?: string }) {
  const { tone, label } = STUDY_TONES[status]
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  )
}

export function RecruitmentBadge({
  status,
  className,
}: {
  status: TrialStatus
  className?: string
}) {
  return (
    <Badge tone={RECRUITMENT_TONES[status]} className={className}>
      {status}
    </Badge>
  )
}

export function SubjectStatusBadge({
  status,
  className,
}: {
  status: SubjectStatus
  className?: string
}) {
  const { tone, label } = SUBJECT_TONES[status]
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  )
}

export function FormStatusBadge({ status, className }: { status: FormStatus; className?: string }) {
  const { tone, label } = FORM_TONES[status]
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  )
}

export function RequestStatusBadge({
  status,
  className,
}: {
  status: StudyRequestStatus
  className?: string
}) {
  const { tone, label } = REQUEST_TONES[status]
  return (
    <Badge tone={tone} className={className}>
      {label}
    </Badge>
  )
}

/** Active / inactive marker for people and facilities. */
export function ActiveDot({ active, className }: { active: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <span
        className={cn('size-1.5 rounded-full', active ? 'bg-success' : 'bg-muted-foreground/50')}
        aria-hidden="true"
      />
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}
