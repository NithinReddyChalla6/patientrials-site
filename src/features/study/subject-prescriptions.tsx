import * as React from 'react'
import { Pill, Plus, X } from 'lucide-react'
import { medicationsApi, prescriptionsApi, ApiError } from '@/data/api'
import type { Medication, Prescription } from '@/data/types'
import { DAYS_OF_WEEK, DOSE_WINDOWS } from '@/data/reference'
import { useAsync } from '@/lib/use-async'
import { formatDate } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value]

/** Days written out only when it is not simply every day. */
function describeSchedule(prescription: Prescription) {
  const everyDay = prescription.days.length === DAYS_OF_WEEK.length
  const days = everyDay ? 'Every day' : prescription.days.join(', ')
  return `${days}, ${prescription.doseWindows.join(' and ')}`
}

/**
 * A participant's medication courses.
 *
 * The legacy flow reached this through a record tab, a New button and a lookup
 * window that opened a second browser window to pick the drug. Here it is a
 * searchable list of the medications the study already defined, so the name
 * cannot be mistyped and there is no popup to lose.
 */
export function SubjectPrescriptions({
  subjectId,
  studyId,
  canManage,
}: {
  subjectId: string
  studyId: string
  canManage: boolean
}) {
  const toast = useToast()
  const state = useAsync(() => prescriptionsApi.listForSubject(subjectId), [subjectId])
  const meds = useAsync(() => medicationsApi.list(studyId), [studyId])
  const [adding, setAdding] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string>()

  const byId = React.useMemo(() => {
    const map = new Map<string, Medication>()
    ;(meds.data ?? []).forEach((m) => map.set(m.id, m))
    return map
  }, [meds.data])

  async function remove(id: string) {
    setBusyId(id)
    try {
      await prescriptionsApi.remove(id)
      toast.success('Prescription removed')
      state.reload()
    } finally {
      setBusyId(undefined)
    }
  }

  const prescriptions = state.data ?? []

  return (
    <section className="border-t border-border p-5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Prescriptions
        </h4>
        {canManage && !adding && (
          <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            Prescribe
          </Button>
        )}
      </div>

      {state.isInitialLoading ? (
        <Skeleton className="mt-3 h-16" />
      ) : prescriptions.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing prescribed yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {prescriptions.map((p) => (
            <li
              key={p.id}
              className="flex items-start gap-3 rounded-lg border border-border bg-sunken p-3"
            >
              <Pill className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {byId.get(p.medicationId)?.name ?? 'Medication'}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDate(p.startDate)} to {formatDate(p.endDate)}, {p.quantity} per dose
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{describeSchedule(p)}</p>
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(p.id)}
                  disabled={busyId === p.id}
                  aria-label="Remove prescription"
                >
                  <X aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && adding && (
        <PrescribeForm
          subjectId={subjectId}
          medications={meds.data ?? []}
          onDone={() => {
            setAdding(false)
            state.reload()
          }}
          onCancel={() => setAdding(false)}
        />
      )}
    </section>
  )
}

function PrescribeForm({
  subjectId,
  medications,
  onDone,
  onCancel,
}: {
  subjectId: string
  medications: Medication[]
  onDone: () => void
  onCancel: () => void
}) {
  const toast = useToast()
  const today = new Date().toISOString().slice(0, 10)

  const [medicationId, setMedicationId] = React.useState('')
  const [startDate, setStartDate] = React.useState(today)
  const [endDate, setEndDate] = React.useState('')
  const [quantity, setQuantity] = React.useState('1')
  const [doseWindows, setDoseWindows] = React.useState<string[]>([])
  const [days, setDays] = React.useState<string[]>([])
  const [error, setError] = React.useState<string>()
  const [saving, setSaving] = React.useState(false)

  const allDays = days.length === DAYS_OF_WEEK.length

  async function save() {
    setError(undefined)
    setSaving(true)
    try {
      await prescriptionsApi.add({
        subjectId,
        medicationId,
        startDate,
        endDate,
        quantity: Number(quantity) || 0,
        doseWindows,
        days,
      })
      toast.success('Prescription added')
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not save this prescription.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h5 className="text-sm font-semibold text-foreground">Prescribe a medication</h5>
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel prescribing">
          <X aria-hidden="true" />
        </Button>
      </div>

      <div className="space-y-4">
        {error && (
          <Alert tone="error" title="We could not save this prescription">
            {error}
          </Alert>
        )}

        {medications.length === 0 && (
          <Alert tone="info" title="No medications on this study yet">
            Add a medication to the study first, then prescribe it here.
          </Alert>
        )}

        <FormField id="rxMedication" label="Medication" required>
          {(aria) => (
            <Combobox
              {...aria}
              options={medications.map((m) => ({ value: m.id, label: m.name }))}
              value={medicationId || undefined}
              onChange={(value) => setMedicationId(value ?? '')}
              placeholder="Select a medication"
              searchPlaceholder="Search medications"
            />
          )}
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="rxStart" label="Start date" required>
            {(aria) => (
              <Input
                {...aria}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            )}
          </FormField>

          <FormField id="rxEnd" label="End date" required>
            {(aria) => (
              <Input
                {...aria}
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            )}
          </FormField>
        </div>

        <FormField id="rxQuantity" label="Quantity per dose" required>
          {(aria) => (
            <Input
              {...aria}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              inputMode="numeric"
              className="sm:max-w-[8rem]"
            />
          )}
        </FormField>

        <fieldset>
          <legend className="text-sm font-medium text-foreground">Time of day</legend>
          <p className="mt-0.5 text-xs text-muted-foreground">When each dose is taken.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {DOSE_WINDOWS.map((window) => (
              <label key={window} className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={doseWindows.includes(window)}
                  onCheckedChange={() => setDoseWindows((prev) => toggle(prev, window))}
                  aria-label={window}
                />
                {window}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <div className="flex items-center justify-between gap-3">
            <legend className="text-sm font-medium text-foreground">Days of the week</legend>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDays(allDays ? [] : [...DAYS_OF_WEEK])}
            >
              {allDays ? 'Clear all' : 'Every day'}
            </Button>
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {DAYS_OF_WEEK.map((day) => (
              <label key={day} className="flex items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={days.includes(day)}
                  onCheckedChange={() => setDays((prev) => toggle(prev, day))}
                  aria-label={day}
                />
                {day}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={save}
            loading={saving}
            disabled={medications.length === 0}
          >
            Save prescription
          </Button>
        </div>
      </div>
    </div>
  )
}
