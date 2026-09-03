import * as React from 'react'
import { CalendarClock, Plus, Trash2, Video } from 'lucide-react'
import { appointmentsApi, siteApi } from '@/data/api'
import type { AppointmentTemplate, Frequency, ScheduleType } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { useForm } from '@/lib/use-form'
import { all, inRange, required } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import { RadioCard, RadioGroup } from '@/components/ui/radio-group'
import { SkeletonRows } from '@/components/ui/skeleton'
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
import { FieldSet, FormField } from '@/components/patterns/form-field'
import { ConfirmDialog } from '@/components/patterns/confirm-dialog'
import { useAuth } from '@/features/auth/auth-context'
import { useStudy } from './study-layout'
import { AppointmentBookings } from './appointment-bookings'

/** "Week 2, day 6, 12:00" reads better than three loose numbers. */
function describeSchedule(template: AppointmentTemplate) {
  const parts = [
    template.week ? `week ${template.week}` : null,
    template.day ? `day ${template.day}` : null,
    template.hours ? `${String(template.hours).padStart(2, '0')}:00` : null,
  ].filter(Boolean)
  const when = parts.length > 0 ? parts.join(', ') : 'no timing set'
  return template.frequency === 'Recurring'
    ? `Repeats from ${when} after enrolment`
    : `Once at ${when} after enrolment`
}

/**
 * Appointment templates.
 *
 * The legacy form required pressing "Unlock Appointment", choosing a person from
 * a popup window, then pressing "Lock Appointment With" before the schedule
 * fields could be filled — three interactions that existed to satisfy the record
 * model, not the coordinator. Assigning someone is now one field, and the timing
 * fields state what they are relative to.
 */
export function AppointmentsTab() {
  const { study } = useStudy()
  const { can } = useAuth()
  const toast = useToast()
  const canManage = can('appointment.manage')

  const state = useAsync(() => appointmentsApi.list(study.id), [study.id])
  const people = useAsync(() => siteApi.lookupPeople(), [])
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [removeTarget, setRemoveTarget] = React.useState<AppointmentTemplate | null>(null)
  const [busy, setBusy] = React.useState(false)

  async function remove() {
    if (!removeTarget) return
    setBusy(true)
    try {
      await appointmentsApi.remove(removeTarget.id)
      toast.success('Appointment template removed')
      setRemoveTarget(null)
      state.reload()
    } finally {
      setBusy(false)
    }
  }

  const nameOf = (id?: string) => {
    const person = people.data?.find((p) => p.id === id)
    return person ? `${person.firstName} ${person.lastName}` : undefined
  }

  return (
    <div className="space-y-10">
      {/* Individual bookings lead: they are the day to day work. Templates
          below describe the pattern every participant follows. */}
      <AppointmentBookings studyId={study.id} />

      <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Appointment templates</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The visits every participant on this study is scheduled for, timed relative to when they
            enrol.
          </p>
        </div>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus aria-hidden="true" />
            Add template
          </Button>
        )}
      </div>

      <AsyncBoundary
        state={state}
        loading={
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <SkeletonRows rows={3} cols={3} />
          </div>
        }
        isEmpty={(items) => items.length === 0}
        empty={
          <div className="rounded-lg border border-dashed border-border bg-card">
            <EmptyState
              icon={CalendarClock}
              title="No appointment templates"
              description="Add the visits this protocol requires so participants are scheduled automatically when they enrol."
              action={
                canManage && (
                  <Button variant="brand" onClick={() => setDialogOpen(true)}>
                    <Plus aria-hidden="true" />
                    Add template
                  </Button>
                )
              }
            />
          </div>
        }
        errorTitle="We could not load appointment templates"
      >
        {(templates) => (
          <ul className="grid gap-3 sm:grid-cols-2">
            {templates.map((template) => (
              <li
                key={template.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  {template.scheduleType === 'Virtual' ? (
                    <Video className="size-4 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <CalendarClock className="size-4 text-muted-foreground" aria-hidden="true" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{template.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {describeSchedule(template)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={template.scheduleType === 'Virtual' ? 'info' : 'neutral'}>
                      {template.scheduleType}
                    </Badge>
                    <Badge tone="outline">{template.frequency}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {nameOf(template.assignedToId) ?? 'Not assigned to anyone'}
                  </p>
                </div>

                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setRemoveTarget(template)}
                    aria-label={`Remove ${template.name}`}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        studyId={study.id}
        people={(people.data ?? []).map((p) => ({
          value: p.id,
          label: `${p.firstName} ${p.lastName}`,
          description: p.email,
        }))}
        onSaved={() => {
          setDialogOpen(false)
          state.reload()
        }}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove this appointment template?"
        description={
          removeTarget
            ? `"${removeTarget.name}" will no longer be scheduled for new participants. Visits already booked are unaffected.`
            : ''
        }
        confirmLabel="Remove template"
        destructive
        loading={busy}
        onConfirm={remove}
      />
      </div>
    </div>
  )
}

function TemplateDialog({
  open,
  onOpenChange,
  studyId,
  people,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyId: string
  people: { value: string; label: string; description?: string }[]
  onSaved: () => void
}) {
  const toast = useToast()
  const [assignedToId, setAssignedToId] = React.useState<string>()
  const [scheduleType, setScheduleType] = React.useState<ScheduleType>('In person')
  const [frequency, setFrequency] = React.useState<Frequency>('One time')

  const form = useForm({
    initialValues: { name: '', week: '1', day: '1', hours: '09' },
    rules: {
      name: required('Name'),
      week: all(required('Week'), inRange(1, 104, 'Week')),
      day: all(required('Day'), inRange(1, 7, 'Day')),
      hours: all(required('Hour'), inRange(0, 23, 'Hour')),
    },
    onSubmit: async (values) => {
      await appointmentsApi.create({
        studyId,
        name: values.name,
        assignedToId,
        scheduleType,
        frequency,
        week: values.week,
        day: values.day,
        hours: values.hours,
      })
      toast.success('Appointment template added')
      onSaved()
    },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({ name: '', week: '1', day: '1', hours: '09' })
    setAssignedToId(undefined)
    setScheduleType('In person')
    setFrequency('One time')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.submit} noValidate>
          <DialogHeader>
            <DialogTitle>Add an appointment template</DialogTitle>
            <DialogDescription>
              Every participant who enrols on this study gets this visit scheduled automatically.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5">
            <FormField
              id="appointment-name"
              label="Name"
              hint="What participants will see in their schedule, for example: Screening visit."
              error={form.errors.name}
              required
            >
              {(aria) => <Input {...aria} {...form.field('name')} />}
            </FormField>

            <FormField
              id="appointment-assignee"
              label="Assign to"
              hint="The investigator or coordinator responsible for this visit."
            >
              {(aria) => (
                <Combobox
                  {...aria}
                  options={people}
                  value={assignedToId}
                  onChange={setAssignedToId}
                  placeholder="Select a person"
                  searchPlaceholder="Search your team"
                  emptyMessage="No one on your team matches that search."
                />
              )}
            </FormField>

            <FieldSet legend="How does the visit happen?" required>
              <RadioGroup
                value={scheduleType}
                onValueChange={(v) => setScheduleType(v as ScheduleType)}
                aria-label="Schedule type"
                className="sm:grid-cols-2"
              >
                <RadioCard
                  id="schedule-in-person"
                  value="In person"
                  label="In person"
                  description="At one of your approved locations."
                />
                <RadioCard
                  id="schedule-virtual"
                  value="Virtual"
                  label="Virtual"
                  description="A video call with the participant."
                />
              </RadioGroup>
            </FieldSet>

            <FieldSet legend="How often?" required>
              <RadioGroup
                value={frequency}
                onValueChange={(v) => setFrequency(v as Frequency)}
                aria-label="Frequency"
                className="sm:grid-cols-2"
              >
                <RadioCard
                  id="frequency-one-time"
                  value="One time"
                  label="Once"
                  description="A single visit."
                />
                <RadioCard
                  id="frequency-recurring"
                  value="Recurring"
                  label="Recurring"
                  description="Repeats on the same schedule."
                />
              </RadioGroup>
            </FieldSet>

            <fieldset>
              <legend className="text-sm font-medium text-foreground">
                When, relative to enrolment
              </legend>
              <p className="mb-3 mt-1 text-xs text-muted-foreground">
                Counted from the day a participant enrols on the study.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField id="appointment-week" label="Week" error={form.errors.week} required>
                  {(aria) => <Input {...aria} {...form.field('week')} inputMode="numeric" />}
                </FormField>
                <FormField
                  id="appointment-day"
                  label="Day"
                  hint="1 to 7"
                  error={form.errors.day}
                  required
                >
                  {(aria) => <Input {...aria} {...form.field('day')} inputMode="numeric" />}
                </FormField>
                <FormField
                  id="appointment-hours"
                  label="Hour"
                  hint="24-hour clock"
                  error={form.errors.hours}
                  required
                >
                  {(aria) => <Input {...aria} {...form.field('hours')} inputMode="numeric" />}
                </FormField>
              </div>
            </fieldset>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" loading={form.submitting}>
              Add template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
