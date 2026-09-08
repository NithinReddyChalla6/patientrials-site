/**
 * Reading patient records from an external EMR.
 *
 * Every modern medical records system exposes HL7 FHIR, so one client works
 * against Epic, Cerner or any other. This points at a public test server
 * carrying invented patients: nothing here touches a real person, and nothing
 * is written back — the spike exists to answer whether the data an EMR holds
 * can fill the fields this portal asks staff to type.
 *
 * Deliberately outside `api.ts`. That module is the seam over *our* store; an
 * EMR is a second, foreign source, and conflating the two would hide which
 * facts we own and which we borrow.
 */

/** Public HAPI test server. A real deployment points this at the site's EMR. */
export const FHIR_BASE = 'https://hapi.fhir.org/baseR4'

/** The parts of an EMR patient record that map onto our own `Subject`. */
export interface EmrPatient {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: string
  email: string
  phone: string
  city: string
  zipcode: string
  primaryLanguage: string
}

export interface EmrRecord {
  patient: EmrPatient
  conditions: string[]
  medications: string[]
  appointments: { date: string; description: string; status: string }[]
}

export class FhirError extends Error {}

async function get(path: string): Promise<Record<string, unknown>> {
  let res: Response
  try {
    res = await fetch(`${FHIR_BASE}/${path}`, {
      headers: { Accept: 'application/fhir+json' },
    })
  } catch {
    throw new FhirError('We could not reach the records server.')
  }
  if (!res.ok) throw new FhirError(`The records server returned ${res.status}.`)
  return (await res.json()) as Record<string, unknown>
}

/** The resources inside a FHIR search result, which nests each one under `resource`. */
function entries(bundle: Record<string, unknown>): Record<string, unknown>[] {
  const list = (bundle.entry as { resource?: Record<string, unknown> }[] | undefined) ?? []
  return list.map((e) => e.resource).filter(Boolean) as Record<string, unknown>[]
}

/** First `value` of a contact point of the given kind — FHIR allows several. */
function contact(resource: Record<string, unknown>, system: 'email' | 'phone'): string {
  const points = (resource.telecom as { system?: string; value?: string }[] | undefined) ?? []
  return points.find((p) => p.system === system && p.value)?.value ?? ''
}

/**
 * A FHIR `Patient` in the shape our own screens use.
 *
 * Every field falls back to an empty string rather than throwing. Real EMR
 * records are patchy — a name with no family part, a patient with no address —
 * and a mapper that refuses incomplete records would reject most of a live
 * system. Showing the gap is the point of this screen.
 */
export function toEmrPatient(resource: Record<string, unknown>): EmrPatient {
  const names = (resource.name as { given?: string[]; family?: string }[] | undefined) ?? []
  const name = names[0] ?? {}
  const addresses = (resource.address as { city?: string; postalCode?: string }[] | undefined) ?? []
  const address = addresses[0] ?? {}
  const languages =
    (resource.communication as
      | { language?: { text?: string; coding?: { display?: string }[] } }[]
      | undefined) ?? []
  const language = languages[0]?.language

  return {
    id: String(resource.id ?? ''),
    firstName: name.given?.[0] ?? '',
    lastName: name.family ?? '',
    dateOfBirth: String(resource.birthDate ?? ''),
    gender: String(resource.gender ?? ''),
    email: contact(resource, 'email'),
    phone: contact(resource, 'phone'),
    city: address.city ?? '',
    zipcode: address.postalCode ?? '',
    primaryLanguage: language?.text ?? language?.coding?.[0]?.display ?? '',
  }
}

/** A coded concept's human-readable text, whichever of the two places holds it. */
function label(concept: unknown): string {
  const c = concept as { text?: string; coding?: { display?: string; code?: string }[] } | undefined
  return c?.text ?? c?.coding?.[0]?.display ?? c?.coding?.[0]?.code ?? ''
}

/** Patients whose name contains `query`, or the first page when it is empty. */
export async function searchPatients(query: string): Promise<EmrPatient[]> {
  const term = query.trim()
  const search = term ? `Patient?name=${encodeURIComponent(term)}&_count=20` : 'Patient?_count=20'
  return entries(await get(search)).map(toEmrPatient)
}

/**
 * One patient and the records hanging off them.
 *
 * Four requests rather than one: FHIR keeps conditions, medications and
 * appointments as separate resources that reference the patient, so there is no
 * single call that returns a whole chart. They run together because none
 * depends on another, and a failing side query yields an empty list rather than
 * losing the patient — a record with no medications on file is a normal answer.
 */
export async function loadRecord(id: string): Promise<EmrRecord> {
  const side = async (path: string) => {
    try {
      return entries(await get(path))
    } catch {
      return []
    }
  }

  const [patient, conditions, medications, appointments] = await Promise.all([
    get(`Patient/${encodeURIComponent(id)}`),
    side(`Condition?patient=${encodeURIComponent(id)}&_count=10`),
    side(`MedicationRequest?patient=${encodeURIComponent(id)}&_count=10`),
    side(`Appointment?patient=${encodeURIComponent(id)}&_count=10`),
  ])

  return {
    patient: toEmrPatient(patient),
    conditions: conditions.map((c) => label(c.code)).filter(Boolean),
    medications: medications
      .map((m) => label(m.medicationCodeableConcept))
      .filter(Boolean),
    appointments: appointments.map((a) => ({
      date: String(a.start ?? '').slice(0, 10),
      description: String(a.description ?? '') || label(a.serviceType) || 'Appointment',
      status: String(a.status ?? ''),
    })),
  }
}
