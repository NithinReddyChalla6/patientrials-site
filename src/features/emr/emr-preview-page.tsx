import * as React from 'react'
import { Check, Database, Minus, Search, UserRound } from 'lucide-react'
import { loadRecord, searchPatients, FhirError, type EmrPatient, type EmrRecord } from '@/data/fhir'
import { formatDate } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/patterns/empty-state'
import { PageHeader } from '@/components/patterns/page-header'
import { InferredNotice } from '@/components/patterns/inferred-notice'

/**
 * Which of our own participant fields an EMR can fill, and which it cannot.
 *
 * The whole question this screen answers is what we stop asking staff to type.
 * Listing the fields an EMR has no concept of matters as much as listing the
 * ones it fills: a protocol visit window is not a medical record, so no EMR —
 * bought, built or connected — will ever supply it.
 */
const MAPPED: { field: string; source: string; of: (p: EmrPatient) => string }[] = [
  { field: 'First name', source: 'Patient.name.given', of: (p) => p.firstName },
  { field: 'Last name', source: 'Patient.name.family', of: (p) => p.lastName },
  { field: 'Date of birth', source: 'Patient.birthDate', of: (p) => p.dateOfBirth },
  { field: 'Gender', source: 'Patient.gender', of: (p) => p.gender },
  { field: 'Email', source: 'Patient.telecom', of: (p) => p.email },
  { field: 'Phone', source: 'Patient.telecom', of: (p) => p.phone },
  { field: 'City', source: 'Patient.address.city', of: (p) => p.city },
  { field: 'Zipcode', source: 'Patient.address.postalCode', of: (p) => p.zipcode },
  { field: 'Primary language', source: 'Patient.communication', of: (p) => p.primaryLanguage },
]

const UNMAPPED = [
  { field: 'Study', why: 'A trial enrolment, not a medical fact' },
  { field: 'Status', why: 'Pending, validated, recruited — our recruitment funnel' },
  { field: 'Enrolment date', why: 'When they joined the study, not the practice' },
  { field: 'Pre-screening answers', why: 'Our eligibility questions' },
  { field: 'Protocol visit windows', why: 'Defined by the protocol, not the chart' },
  { field: 'Deviations', why: 'A trial concept an EMR has no notion of' },
]

function fullName(p: EmrPatient) {
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Unnamed record'
}

export function EmrPreviewPage() {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<EmrPatient[]>()
  const [searching, setSearching] = React.useState(false)
  const [record, setRecord] = React.useState<EmrRecord>()
  const [loadingId, setLoadingId] = React.useState<string>()
  const [error, setError] = React.useState<string>()

  async function run(term: string) {
    setError(undefined)
    setSearching(true)
    setRecord(undefined)
    try {
      setResults(await searchPatients(term))
    } catch (err) {
      setError(err instanceof FhirError ? err.message : 'The search failed.')
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  async function open(patient: EmrPatient) {
    setError(undefined)
    setLoadingId(patient.id)
    try {
      setRecord(await loadRecord(patient.id))
    } catch (err) {
      setError(err instanceof FhirError ? err.message : 'We could not open that record.')
    } finally {
      setLoadingId(undefined)
    }
  }

  // Load a first page on arrival, so the screen demonstrates itself without
  // the reader having to guess a name that exists on a server of strangers.
  React.useEffect(() => {
    void run('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filled = record ? MAPPED.filter((m) => m.of(record.patient)).length : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="EMR preview"
        description="Patient records read live from an external medical records system, to show which fields we would stop asking staff to type."
      />

      <InferredNotice>
        A working experiment, not a feature. It reads from a public HL7 FHIR test server holding
        invented patients — no real person's data is involved, and nothing is written back. The same
        code speaks to Epic or Cerner, because FHIR is the standard all of them expose.
      </InferredNotice>

      {error && (
        <Alert tone="error" title="The records server did not answer">
          {error} It is a free shared server, so it is sometimes slow or briefly unavailable.
        </Alert>
      )}

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void run(query)
        }}
      >
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <label htmlFor="emr-search" className="text-sm font-medium text-foreground">
            Find a patient
          </label>
          <Input
            id="emr-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, or leave blank"
            className="mt-1.5"
          />
        </div>
        <Button type="submit" variant="brand" loading={searching}>
          <Search aria-hidden="true" />
          Search
        </Button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {searching ? 'Searching' : `${results?.length ?? 0} records`}
          </h2>

          {searching ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
            </div>
          ) : results && results.length === 0 ? (
            <div className="mt-3 rounded-lg border border-dashed border-border bg-card">
              <EmptyState
                compact
                icon={UserRound}
                title="No records"
                description="Try another name, or search with the box empty."
              />
            </div>
          ) : (
            <ul className="mt-3 max-h-[32rem] space-y-2 overflow-y-auto pr-1">
              {(results ?? []).map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => void open(p)}
                    disabled={loadingId === p.id}
                    className={
                      record?.patient.id === p.id
                        ? 'w-full rounded-lg border border-brand bg-accent/40 p-3 text-left'
                        : 'w-full rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-brand/40 hover:bg-accent/20'
                    }
                  >
                    <span className="block truncate text-sm font-medium text-foreground">
                      {fullName(p)}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {p.gender || 'gender not recorded'}
                      {p.dateOfBirth ? ` · born ${p.dateOfBirth}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0">
          {!record ? (
            <div className="rounded-lg border border-dashed border-border bg-card">
              <EmptyState
                icon={Database}
                title="Choose a record"
                description="Pick a patient on the left to see which of our fields their medical record fills in."
              />
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-foreground">
                      {fullName(record.patient)}
                    </h3>
                    <p className="id mt-0.5 text-xs text-muted-foreground">
                      EMR record {record.patient.id}
                    </p>
                  </div>
                  <Badge tone={filled >= 6 ? 'success' : filled >= 4 ? 'warning' : 'danger'}>
                    {filled} of {MAPPED.length} fields filled
                  </Badge>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[34rem] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-[0.06em] text-muted-foreground">
                        <th scope="col" className="py-2 pr-4 font-semibold">
                          Our field
                        </th>
                        <th scope="col" className="py-2 pr-4 font-semibold">
                          Comes from
                        </th>
                        <th scope="col" className="py-2 font-semibold">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {MAPPED.map((m) => {
                        const value = m.of(record.patient)
                        return (
                          <tr key={m.field}>
                            <td className="py-2 pr-4 font-medium text-foreground">{m.field}</td>
                            <td className="py-2 pr-4">
                              <code className="text-xs text-muted-foreground">{m.source}</code>
                            </td>
                            <td className="py-2">
                              {value ? (
                                <span className="inline-flex items-center gap-1.5 text-foreground">
                                  <Check className="size-3.5 text-success" aria-hidden="true" />
                                  {value}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                                  <Minus className="size-3.5" aria-hidden="true" />
                                  not recorded
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <RecordList title="Conditions" items={record.conditions} />
                <RecordList title="Medications" items={record.medications} />
                <RecordList
                  title="Appointments"
                  items={record.appointments.map((a) =>
                    a.date ? `${formatDate(a.date)} — ${a.description}` : a.description,
                  )}
                />
              </div>

              <div className="rounded-lg border border-border bg-sunken p-5">
                <h3 className="text-sm font-semibold text-foreground">
                  What no EMR can give us
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  A medical record describes care. These are trial concepts, so they stay ours
                  whether we connect to an EMR or build one.
                </p>
                <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                  {UNMAPPED.map((u) => (
                    <li key={u.field} className="flex items-start gap-2 text-sm">
                      <Minus className="mt-1 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span>
                        <span className="font-medium text-foreground">{u.field}</span>
                        <span className="block text-xs text-muted-foreground">{u.why}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function RecordList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">None on file</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {items.map((item, i) => (
            <li key={`${item}-${i}`} className="text-sm text-foreground">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
