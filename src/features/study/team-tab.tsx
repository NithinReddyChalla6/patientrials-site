import * as React from 'react'
import { UserRound, UserRoundCog } from 'lucide-react'
import { siteApi, studiesApi } from '@/data/api'
import { ROLE_LABELS } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { useForm } from '@/lib/use-form'
import { required } from '@/lib/validators'
import { initialsOf } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert } from '@/components/ui/alert'
import { Combobox } from '@/components/ui/combobox'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { EmptyState } from '@/components/patterns/empty-state'
import { FormField } from '@/components/patterns/form-field'
import { useAuth } from '@/features/auth/auth-context'
import { useStudy } from './study-layout'

/**
 * Who is running this study.
 *
 * Assigning the principal investigator in the legacy portal meant pressing
 * "Edit" on a platform form header, opening a lookup in a new browser window,
 * picking a row, pressing Update, then typing into a field labelled "Mandatory -
 * must be populated" before pressing Update a second time. The note that field
 * demanded is a genuinely good idea — a study's PI is a regulated fact and
 * changes should be explained — so it is kept, with a label that says why.
 */
export function TeamTab() {
  const { study, reload } = useStudy()
  const { can } = useAuth()
  const canAssign = can('study.assignInvestigator')

  const people = useAsync(() => siteApi.listCollaborators(), [])
  const [dialogOpen, setDialogOpen] = React.useState(false)

  return (
    <div className="space-y-6">
      <AsyncBoundary
        state={people}
        loading={<Skeleton className="h-64" />}
        errorTitle="We could not load your team"
      >
        {(members) => {
          const investigator = members.find((m) => m.id === study.principalInvestigatorId)
          const investigators = members.filter(
            (m) => m.active && m.role === 'principal_investigator',
          )

          return (
            <>
              <section>
                <h2 className="text-lg font-semibold text-foreground">Principal investigator</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  The investigator with overall responsibility for this study at your site.
                </p>

                <div className="mt-4 rounded-lg border border-border bg-card p-5 shadow-sm">
                  {investigator ? (
                    <div className="flex flex-wrap items-center gap-4">
                      <span
                        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand"
                        aria-hidden="true"
                      >
                        {initialsOf(`${investigator.firstName} ${investigator.lastName}`)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-foreground">
                          {investigator.firstName} {investigator.lastName}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {investigator.email}
                        </p>
                      </div>
                      {canAssign && (
                        <Button variant="outline" onClick={() => setDialogOpen(true)}>
                          <UserRoundCog aria-hidden="true" />
                          Change investigator
                        </Button>
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      compact
                      icon={UserRound}
                      title="No principal investigator assigned"
                      description="A study cannot open to recruitment without a named investigator."
                      action={
                        canAssign && (
                          <Button variant="brand" onClick={() => setDialogOpen(true)}>
                            Assign an investigator
                          </Button>
                        )
                      }
                    />
                  )}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-foreground">Site team</h2>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                  Everyone at your site who can work on this study. Manage the list from{' '}
                  <span className="font-medium text-foreground">Site → Team</span>.
                </p>

                <ul className="mt-4 divide-y divide-border rounded-lg border border-border bg-card">
                  {members
                    .filter((m) => m.active)
                    .map((member) => (
                      <li key={member.id} className="flex flex-wrap items-center gap-4 p-4">
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground"
                          aria-hidden="true"
                        >
                          {initialsOf(`${member.firstName} ${member.lastName}`)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        </div>
                        <Badge tone="neutral">{ROLE_LABELS[member.role]}</Badge>
                        {member.id === study.principalInvestigatorId && (
                          <Badge tone="brand">Principal investigator</Badge>
                        )}
                      </li>
                    ))}
                </ul>
              </section>

              <AssignDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                studyId={study.id}
                currentId={study.principalInvestigatorId}
                investigators={investigators.map((m) => ({
                  value: m.id,
                  label: `${m.firstName} ${m.lastName}`,
                  description: m.email,
                }))}
                onSaved={() => {
                  setDialogOpen(false)
                  reload()
                }}
              />
            </>
          )
        }}
      </AsyncBoundary>
    </div>
  )
}

function AssignDialog({
  open,
  onOpenChange,
  studyId,
  currentId,
  investigators,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyId: string
  currentId?: string
  investigators: { value: string; label: string; description?: string }[]
  onSaved: () => void
}) {
  const toast = useToast()
  const [selected, setSelected] = React.useState<string | undefined>(currentId)
  const [attempted, setAttempted] = React.useState(false)
  const [serverError, setServerError] = React.useState<string>()

  const form = useForm({
    initialValues: { note: '' },
    rules: { note: required('A reason') },
  })

  React.useEffect(() => {
    if (!open) return
    setSelected(currentId)
    setAttempted(false)
    setServerError(undefined)
    form.reset({ note: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentId])

  const selectError = attempted && !selected ? 'Choose an investigator' : undefined

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setAttempted(true)
    const result = await form.submit()
    if (!result.ok || !selected) return
    setServerError(undefined)
    try {
      await studiesApi.assignInvestigator(studyId, selected, form.values.note)
      toast.success('Principal investigator updated')
      onSaved()
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'We could not update the investigator.',
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Assign the principal investigator</DialogTitle>
            <DialogDescription>
              Only people with the Principal Investigator role can be assigned.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5">
            {serverError && (
              <Alert tone="error" title="We could not save this change">
                {serverError}
              </Alert>
            )}

            {investigators.length === 0 ? (
              <EmptyState
                compact
                icon={UserRound}
                title="No principal investigators on your site"
                description="Add someone with the Principal Investigator role from Site → Team first."
              />
            ) : (
              <>
                <FormField
                  id="assign-investigator"
                  label="Principal investigator"
                  error={selectError}
                  required
                >
                  {(aria) => (
                    <Combobox
                      {...aria}
                      options={investigators}
                      value={selected}
                      onChange={setSelected}
                      placeholder="Select an investigator"
                      searchPlaceholder="Search investigators"
                    />
                  )}
                </FormField>

                <FormField
                  id="assign-note"
                  label="Reason for the change"
                  hint="Kept on the study's audit trail. A sponsor or monitor may ask why the investigator changed."
                  error={form.errors.note}
                  required
                >
                  {(aria) => <Textarea {...aria} {...form.field('note')} rows={3} />}
                </FormField>
              </>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="brand"
              loading={form.submitting}
              disabled={investigators.length === 0}
            >
              Save assignment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
