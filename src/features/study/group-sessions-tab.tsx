import * as React from 'react'
import { CalendarDays, MapPin, Plus, X } from 'lucide-react'
import { groupSessionsApi, locationsApi, ApiError } from '@/data/api'
import type { ApprovedLocation, GroupSession } from '@/data/types'
import { SESSION_ROLES } from '@/data/reference'
import { useAsync } from '@/lib/use-async'
import { formatDateTime } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
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
 * Sessions several participants attend together.
 *
 * The legacy form asked for a venue category and a venue as two unrelated
 * pickers, the second of which opened a search window, so it was possible to
 * book a clinic session into a research unit. Here the venue is chosen from the
 * study's approved locations and the category follows from it, which removes the
 * mismatch rather than validating it after the fact.
 */
export function GroupSessionsTab() {
  const { study } = useStudy()
  const { can } = useAuth()
  const toast = useToast()
  const canManage = can('appointment.manage')

  const state = useAsync(() => groupSessionsApi.list(study.id), [study.id])
  const locations = useAsync(() => locationsApi.list(study.id), [study.id])
  const [adding, setAdding] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string>()

  const locationById = React.useMemo(() => {
    const map = new Map<string, ApprovedLocation>()
    ;(locations.data ?? []).forEach((l) => map.set(l.id, l))
    return map
  }, [locations.data])

  async function remove(session: GroupSession) {
    setBusyId(session.id)
    try {
      await groupSessionsApi.remove(session.id)
      toast.success('Session removed')
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
      errorTitle="We could not load the group sessions for this study"
    >
      {(sessions) => (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Group appointments</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Sessions several participants attend together, such as an orientation or a group
              education visit, held at one of this study's approved locations.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {sessions.length === 0 ? 'None scheduled' : `${sessions.length} scheduled`}
            </h3>
            {canManage && !adding && (
              <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                <Plus aria-hidden="true" />
                Add group session
              </Button>
            )}
          </div>

          {canManage && adding && (
            <SessionForm
              studyId={study.id}
              locations={locations.data ?? []}
              onDone={() => {
                setAdding(false)
                state.reload()
              }}
              onCancel={() => setAdding(false)}
            />
          )}

          {sessions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-card">
              <EmptyState
                compact
                icon={CalendarDays}
                title="No group sessions"
                description="Schedule a session participants attend together."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {sessions.map((session) => {
                const location = locationById.get(session.locationId)
                return (
                  <li key={session.id} className="flex flex-wrap items-start gap-4 p-4">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
                      aria-hidden="true"
                    >
                      <CalendarDays className="size-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                        {session.description}
                        <Badge tone="neutral">{session.role}</Badge>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTime(session.startAt)} to {formatDateTime(session.endAt)}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" aria-hidden="true" />
                        {location
                          ? `${location.facilityName}, ${location.address}`
                          : 'Location no longer approved'}
                      </p>
                    </div>

                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(session)}
                        disabled={busyId === session.id}
                        aria-label={`Remove ${session.description}`}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </AsyncBoundary>
  )
}

function SessionForm({
  studyId,
  locations,
  onDone,
  onCancel,
}: {
  studyId: string
  locations: ApprovedLocation[]
  onDone: () => void
  onCancel: () => void
}) {
  const toast = useToast()
  const usable = locations.filter((l) => l.enabled)

  const [description, setDescription] = React.useState('')
  const [role, setRole] = React.useState('')
  const [locationId, setLocationId] = React.useState('')
  const [startAt, setStartAt] = React.useState('')
  const [endAt, setEndAt] = React.useState('')
  const [error, setError] = React.useState<string>()
  const [saving, setSaving] = React.useState(false)

  // The venue decides the category, so the two can never disagree.
  const category = usable.find((l) => l.id === locationId)?.facilityType ?? ''

  async function save() {
    setError(undefined)
    if (!description.trim()) {
      setError('Describe what the session is for.')
      return
    }
    if (!role) {
      setError('Choose who runs the session.')
      return
    }
    setSaving(true)
    try {
      await groupSessionsApi.add({
        studyId,
        description: description.trim(),
        category,
        role,
        startAt,
        endAt,
        locationId,
      })
      toast.success('Group session scheduled')
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not save this session.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h3 className="text-sm font-semibold text-foreground">Add a group session</h3>
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel this session">
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-4">
        {error && (
          <Alert tone="error" title="We could not save this session">
            {error}
          </Alert>
        )}

        {usable.length === 0 && (
          <Alert tone="info" title="No approved locations yet">
            Add an approved location to this study before scheduling a group session.
          </Alert>
        )}

        <FormField
          id="sessionDescription"
          label="What the session is for"
          hint="Participants see this, so name it the way they would recognise it."
          required
        >
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
          <FormField id="sessionLocation" label="Where it is held" required>
            {(aria) => (
              <Combobox
                {...aria}
                options={usable.map((l) => ({ value: l.id, label: l.facilityName }))}
                value={locationId || undefined}
                onChange={(value) => setLocationId(value ?? '')}
                placeholder="Select a location"
                searchPlaceholder="Search approved locations"
              />
            )}
          </FormField>

          <FormField
            id="sessionCategory"
            label="Venue type"
            hint="Set by the location you choose."
          >
            {(aria) => (
              <Input
                {...aria}
                value={category || 'Choose a location first'}
                readOnly
                className="bg-sunken text-muted-foreground"
              />
            )}
          </FormField>
        </div>

        <FormField id="sessionRole" label="Who runs it" required>
          {(aria) => (
            <Select
              {...aria}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              options={SESSION_ROLES}
              placeholder="Select a role"
            />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="sessionStart" label="Starts" required>
            {(aria) => (
              <Input
                {...aria}
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            )}
          </FormField>

          <FormField id="sessionEnd" label="Ends" required>
            {(aria) => (
              <Input
                {...aria}
                type="datetime-local"
                value={endAt}
                min={startAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            )}
          </FormField>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={save}
            loading={saving}
            disabled={usable.length === 0}
          >
            Save session
          </Button>
        </div>
      </div>
    </div>
  )
}
