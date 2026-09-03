import * as React from 'react'
import { CalendarCheck, MapPin, Plus, User, X } from 'lucide-react'
import { bookingsApi, formsApi, locationsApi, siteApi, subjectsApi, ApiError } from '@/data/api'
import type { Appointment, ApprovedLocation, ScheduleType, Subject } from '@/data/types'
import { APPOINTMENT_SLOTS } from '@/data/reference'
import { useAsync } from '@/lib/use-async'
import { formatDate } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { EmptyState } from '@/components/patterns/empty-state'
import { useAuth } from '@/features/auth/auth-context'

const SCHEDULE_TYPES: ScheduleType[] = ['In person', 'Virtual']

/**
 * Visits booked for individual participants.
 *
 * The legacy form asked for a facility type and then a location as two separate
 * pickers, and reached the person through an "Unlock Appointment" popup. Here
 * the location carries its own type, the person is a combobox over the study
 * team, and the participant cannot be booked into the same slot twice.
 */
export function AppointmentBookings({ studyId }: { studyId: string }) {
  const { can } = useAuth()
  const toast = useToast()
  const canManage = can('appointment.manage')

  const state = useAsync(() => bookingsApi.listForStudy(studyId), [studyId])
  const subjects = useAsync(
    () => subjectsApi.list({ studyId, pageSize: 200 }),
    [studyId],
  )
  const locations = useAsync(() => locationsApi.list(studyId), [studyId])
  const forms = useAsync(() => formsApi.list({ category: 'form' }), [])
  const team = useAsync(() => siteApi.listCollaborators(), [])

  const [adding, setAdding] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string>()

  const subjectById = React.useMemo(() => {
    const map = new Map<string, Subject>()
    ;(subjects.data?.items ?? []).forEach((s) => map.set(s.id, s))
    return map
  }, [subjects.data])

  const locationById = React.useMemo(() => {
    const map = new Map<string, ApprovedLocation>()
    ;(locations.data ?? []).forEach((l) => map.set(l.id, l))
    return map
  }, [locations.data])

  async function remove(booking: Appointment) {
    setBusyId(booking.id)
    try {
      await bookingsApi.remove(booking.id)
      toast.success('Appointment cancelled')
      state.reload()
    } finally {
      setBusyId(undefined)
    }
  }

  const bookings = state.data ?? []

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Booked appointments</h3>
          <p className="mt-0.5 max-w-2xl text-sm text-muted-foreground">
            Visits scheduled for individual participants on this study.
          </p>
        </div>
        {canManage && !adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Book appointment
          </Button>
        )}
      </div>

      {canManage && adding && (
        <BookingForm
          studyId={studyId}
          subjects={subjects.data?.items ?? []}
          locations={(locations.data ?? []).filter((l) => l.enabled)}
          forms={(forms.data ?? []).map((f) => ({ id: f.id, title: f.title }))}
          team={(team.data ?? []).map((m) => `${m.firstName} ${m.lastName}`)}
          onDone={() => {
            setAdding(false)
            state.reload()
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {state.isInitialLoading ? (
        <Skeleton className="h-28" />
      ) : bookings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card">
          <EmptyState
            compact
            icon={CalendarCheck}
            title="No appointments booked"
            description="Book a visit for a participant on this study."
          />
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {bookings.map((booking) => {
            const subject = subjectById.get(booking.subjectId)
            const location = locationById.get(booking.locationId ?? '')
            return (
              <li key={booking.id} className="flex flex-wrap items-start gap-4 p-4">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
                  aria-hidden="true"
                >
                  <CalendarCheck className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                    {subject ? `${subject.firstName} ${subject.lastName}` : 'Participant'}
                    <span className="id text-xs text-muted-foreground">{booking.subjectId}</span>
                    <Badge tone={booking.scheduleType === 'Virtual' ? 'info' : 'neutral'}>
                      {booking.scheduleType}
                    </Badge>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{booking.description}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      {formatDate(booking.date)}, {booking.timeSlot}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User className="size-3.5" aria-hidden="true" />
                      {booking.withName}
                    </span>
                    {booking.scheduleType === 'In person' && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {location ? location.facilityName : 'Location not set'}
                      </span>
                    )}
                  </p>
                  {booking.formIds.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {booking.formIds.length === 1
                        ? '1 form to complete'
                        : `${booking.formIds.length} forms to complete`}
                    </p>
                  )}
                </div>

                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(booking)}
                    disabled={busyId === booking.id}
                    aria-label="Cancel this appointment"
                  >
                    <X aria-hidden="true" />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function BookingForm({
  studyId,
  subjects,
  locations,
  forms,
  team,
  onDone,
  onCancel,
}: {
  studyId: string
  subjects: Subject[]
  locations: ApprovedLocation[]
  forms: { id: string; title: string }[]
  team: string[]
  onDone: () => void
  onCancel: () => void
}) {
  const toast = useToast()
  const [description, setDescription] = React.useState('')
  const [subjectId, setSubjectId] = React.useState('')
  const [scheduleType, setScheduleType] = React.useState<ScheduleType>('In person')
  const [withName, setWithName] = React.useState('')
  const [formIds, setFormIds] = React.useState<string[]>([])
  const [date, setDate] = React.useState('')
  const [timeSlot, setTimeSlot] = React.useState('')
  const [locationId, setLocationId] = React.useState('')
  const [error, setError] = React.useState<string>()
  const [saving, setSaving] = React.useState(false)

  async function save() {
    setError(undefined)
    if (!description.trim()) {
      setError('Say what the visit is for.')
      return
    }
    if (!withName) {
      setError('Choose who the participant is seeing.')
      return
    }
    setSaving(true)
    try {
      await bookingsApi.add({
        studyId,
        subjectId,
        description: description.trim(),
        scheduleType,
        withName,
        formIds,
        date,
        timeSlot,
        locationId: scheduleType === 'In person' ? locationId : undefined,
      })
      toast.success('Appointment booked')
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not book this appointment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h4 className="text-sm font-semibold text-foreground">Book an appointment</h4>
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel this booking">
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-4">
        {error && (
          <Alert tone="error" title="We could not book this appointment">
            {error}
          </Alert>
        )}

        <FormField id="apptDescription" label="What the visit is for" required>
          {(aria) => (
            <Textarea
              {...aria}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="apptSubject" label="Participant" required>
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

          <FormField id="apptWith" label="Appointment with" required>
            {(aria) => (
              <Combobox
                {...aria}
                options={team.map((name) => ({ value: name, label: name }))}
                value={withName || undefined}
                onChange={(value) => setWithName(value ?? '')}
                placeholder="Select a person"
                searchPlaceholder="Search the team"
              />
            )}
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <FormField id="apptType" label="Schedule type" required>
            {(aria) => (
              <Select
                {...aria}
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as ScheduleType)}
                options={SCHEDULE_TYPES}
              />
            )}
          </FormField>

          <FormField id="apptDate" label="Date" required>
            {(aria) => (
              <Input
                {...aria}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
          </FormField>

          <FormField id="apptSlot" label="Time" required>
            {(aria) => (
              <Select
                {...aria}
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                options={APPOINTMENT_SLOTS}
                placeholder="Select a time"
              />
            )}
          </FormField>
        </div>

        {scheduleType === 'In person' && (
          <FormField
            id="apptLocation"
            label="Location"
            hint="Chosen from this study's approved locations, which carry their own facility type."
            required
          >
            {(aria) => (
              <Combobox
                {...aria}
                options={locations.map((l) => ({
                  value: l.id,
                  label: `${l.facilityName} (${l.facilityType})`,
                }))}
                value={locationId || undefined}
                onChange={(value) => setLocationId(value ?? '')}
                placeholder="Select a location"
                searchPlaceholder="Search approved locations"
              />
            )}
          </FormField>
        )}

        <fieldset>
          <legend className="text-sm font-medium text-foreground">Required forms</legend>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Completed during this visit. Optional.
          </p>
          {forms.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No forms published yet.</p>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {forms.map((form) => (
                <label
                  key={form.id}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <Checkbox
                    checked={formIds.includes(form.id)}
                    onCheckedChange={() =>
                      setFormIds((prev) =>
                        prev.includes(form.id)
                          ? prev.filter((id) => id !== form.id)
                          : [...prev, form.id],
                      )
                    }
                    aria-label={form.title}
                  />
                  {form.title}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="brand" onClick={save} loading={saving}>
            Book appointment
          </Button>
        </div>
      </div>
    </div>
  )
}
