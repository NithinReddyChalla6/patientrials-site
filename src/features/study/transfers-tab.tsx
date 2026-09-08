import * as React from 'react'
import { ArrowRightLeft, CheckCircle2, Plus, X, XCircle } from 'lucide-react'
import { subjectsApi, transfersApi, ApiError } from '@/data/api'
import type { Subject, Transfer, TransferStatus } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { formatRelative } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { EmptyState } from '@/components/patterns/empty-state'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { InferredNotice } from '@/components/patterns/inferred-notice'
import { useAuth } from '@/features/auth/auth-context'
import { useStudy } from './study-layout'

const OUTCOME: Record<TransferStatus, { label: string; tone: BadgeTone }> = {
  initiated: { label: 'Awaiting the receiving site', tone: 'warning' },
  accepted: { label: 'Accepted', tone: 'success' },
  declined: { label: 'Declined', tone: 'danger' },
  withdrawn: { label: 'Withdrawn', tone: 'neutral' },
}

function nameOf(subject: Subject | undefined, id: string) {
  return subject ? `${subject.firstName} ${subject.lastName}` : `Participant ${id}`
}

/** One transfer, read the same way whether it is still open or long closed. */
function TransferCard({
  transfer,
  subject,
  onResolve,
  busy,
}: {
  transfer: Transfer
  subject: Subject | undefined
  /** Absent on the resolved list, which is history and not a worklist. */
  onResolve?: (status: Exclude<TransferStatus, 'initiated'>) => void
  busy: boolean
}) {
  const outcome = OUTCOME[transfer.status]

  return (
    <li className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {nameOf(subject, transfer.subjectId)}
            <span className="id ml-2 text-xs font-normal text-muted-foreground">
              {transfer.subjectId}
            </span>
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <ArrowRightLeft className="size-3.5 shrink-0" aria-hidden="true" />
            to {transfer.toSiteName}
          </p>
        </div>
        <Badge tone={outcome.tone}>{outcome.label}</Badge>
      </div>

      {transfer.reason && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{transfer.reason}</p>
      )}

      {transfer.resolutionNote && (
        <p className="mt-3 rounded-md border border-border bg-sunken p-3 text-sm text-muted-foreground">
          {transfer.resolutionNote}
        </p>
      )}

      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="id">{transfer.id}</span>
        <span>Started by {transfer.initiatedBy}</span>
        <span>{formatRelative(transfer.initiatedAt)}</span>
        {transfer.resolvedAt && <span>Closed {formatRelative(transfer.resolvedAt)}</span>}
      </p>

      {onResolve && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onResolve('accepted')}>
            <CheckCircle2 aria-hidden="true" />
            Accepted
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => onResolve('declined')}>
            <XCircle aria-hidden="true" />
            Declined
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={() => onResolve('withdrawn')}>
            Withdrawn
          </Button>
        </div>
      )}
    </li>
  )
}

/** Shared shell: the two tabs differ only in which transfers they hold. */
function TransfersView({ open }: { open: boolean }) {
  const { study } = useStudy()
  const { session, can } = useAuth()
  const toast = useToast()
  const canManage = can('transfer.manage')

  const state = useAsync(() => transfersApi.list(study.id), [study.id])
  const people = useAsync(
    () => subjectsApi.list({ studyId: study.id, status: 'all', page: 1, pageSize: 200 }),
    [study.id],
  )

  const [adding, setAdding] = React.useState(false)
  const [subjectId, setSubjectId] = React.useState('')
  const [toSiteName, setToSiteName] = React.useState('')
  const [reason, setReason] = React.useState('')
  const [error, setError] = React.useState<string>()
  const [saving, setSaving] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string>()

  const subjects = people.data?.items ?? []
  const byId = React.useMemo(() => {
    const map = new Map<string, Subject>()
    subjects.forEach((s) => map.set(s.id, s))
    return map
  }, [subjects])

  async function initiate() {
    setError(undefined)
    setSaving(true)
    try {
      await transfersApi.initiate({
        studyId: study.id,
        subjectId,
        toSiteName,
        reason,
        initiatedBy: session ? `${session.user.firstName} ${session.user.lastName}` : 'Study team',
      })
      toast.success('Transfer started', 'It stays here until the receiving site answers.')
      setSubjectId('')
      setToSiteName('')
      setReason('')
      setAdding(false)
      state.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not start this transfer.')
    } finally {
      setSaving(false)
    }
  }

  async function resolve(id: string, status: Exclude<TransferStatus, 'initiated'>) {
    setBusyId(id)
    try {
      await transfersApi.resolve(id, status)
      toast.success(`Transfer marked ${OUTCOME[status].label.toLowerCase()}`)
      state.reload()
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'We could not update this transfer.')
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
      errorTitle="We could not load the transfers for this study"
    >
      {(all) => {
        const shown = all.filter((t) => (t.status === 'initiated') === open)

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {open ? 'Transfer initiated' : 'Transfer resolved'}
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                {open
                  ? 'Participants this site has asked to move to another site, still waiting on an answer.'
                  : 'Transfers that have been settled — accepted, declined or withdrawn — kept as the record of where a participant went.'}
              </p>
            </div>

            <InferredNotice>
              {open
                ? 'A participant may have one transfer in progress at a time, so a second request cannot be started while one is open.'
                : 'Closed transfers are kept rather than removed. Where a participant went, and why, is part of their trial record.'}
            </InferredNotice>

            {open && (
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  {shown.length === 0 ? 'None in progress' : `${shown.length} in progress`}
                </h3>
                {canManage && !adding && (
                  <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                    <Plus aria-hidden="true" />
                    Start a transfer
                  </Button>
                )}
              </div>
            )}

            {open && canManage && adding && (
              <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <h3 className="text-sm font-semibold text-foreground">Start a transfer</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAdding(false)}
                    aria-label="Cancel this transfer"
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {error && (
                    <Alert tone="error" title="We could not start this transfer">
                      {error}
                    </Alert>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField id="transferSubject" label="Who is transferring" required>
                      {(aria) => (
                        <Combobox
                          {...aria}
                          options={subjects.map((s) => ({
                            value: s.id,
                            label: `${s.firstName} ${s.lastName} (${s.id})`,
                          }))}
                          value={subjectId || undefined}
                          onChange={(value) => setSubjectId(value ?? '')}
                          placeholder="Select a participant"
                          searchPlaceholder="Search by name or ID"
                        />
                      )}
                    </FormField>

                    <FormField
                      id="transferSite"
                      label="Receiving site"
                      hint="Typed, not chosen: the destination is often outside this network."
                      required
                    >
                      {(aria) => (
                        <Input
                          {...aria}
                          value={toSiteName}
                          onChange={(e) => setToSiteName(e.target.value)}
                          placeholder="Frisco Clinical Partners"
                        />
                      )}
                    </FormField>
                  </div>

                  <FormField
                    id="transferReason"
                    label="Why they are moving"
                    hint="The receiving site reads this, so give them what they need to decide."
                  >
                    {(aria) => (
                      <Textarea
                        {...aria}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        rows={3}
                      />
                    )}
                  </FormField>

                  <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
                    <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                      Cancel
                    </Button>
                    <Button type="button" variant="brand" onClick={initiate} loading={saving}>
                      Start transfer
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!open && (
              <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {shown.length === 0 ? 'None settled yet' : `${shown.length} settled`}
              </h3>
            )}

            {shown.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card">
                <EmptyState
                  compact
                  icon={ArrowRightLeft}
                  title={open ? 'No transfers in progress' : 'No settled transfers'}
                  description={
                    open
                      ? 'Requests to move a participant to another site appear here until they are answered.'
                      : 'Once a transfer is accepted, declined or withdrawn it moves here.'
                  }
                />
              </div>
            ) : (
              <ul className="space-y-3">
                {shown.map((transfer) => (
                  <TransferCard
                    key={transfer.id}
                    transfer={transfer}
                    subject={byId.get(transfer.subjectId)}
                    busy={busyId === transfer.id}
                    onResolve={
                      open && canManage
                        ? (status) => void resolve(transfer.id, status)
                        : undefined
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        )
      }}
    </AsyncBoundary>
  )
}

export function TransferInitiatedTab() {
  return <TransfersView open />
}

export function TransferResolvedTab() {
  return <TransfersView open={false} />
}
