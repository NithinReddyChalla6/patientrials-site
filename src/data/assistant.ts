import { ApiError, authToken, AUTH_API } from './api'
import type { Study, Subject } from './types'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/** Somewhere the assistant is allowed to send you. */
export interface Destination {
  path: string
  label: string
}

/**
 * What the assistant is allowed to see.
 *
 * Deliberately a written summary rather than the raw records. Two reasons: a
 * language model reasons better over a paragraph than over a thousand rows of
 * JSON, and every field left out is a field that never leaves this building.
 * Names and contact details are not included — a question about "who is
 * overdue" is answerable from counts, and the screens already show the people.
 */
export function studySummary(
  study: Study,
  subjects: Subject[],
  investigatorName?: string,
): string {
  const count = (status: Subject['status']) => subjects.filter((s) => s.status === status).length

  return [
    `Study ${study.id} (${study.nctId}): ${study.title}`,
    `Condition: ${study.condition}. Phase: ${study.phase}. Sponsor: ${study.sponsor}.`,
    `Status: ${study.status}, recruitment ${study.recruitmentStatus}.`,
    `Principal investigator: ${investigatorName ?? 'none assigned'}.`,
    `Enrolled: ${study.enrolled} of a target of ${study.enrollmentTarget}.`,
    `Participant records on this study: ${subjects.length} in total — ` +
      `${count('pending')} new, ${count('validated')} validated, ` +
      `${count('prescreened')} pre-screened, ${count('recruited')} recruited, ` +
      `${count('rejected')} rejected, ${count('dropped')} dropped.`,
    study.briefSummary ? `About the study: ${study.briefSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * What the assistant can see when you are not inside a study.
 *
 * The site's studies and where each one stands. Enough to answer "which trials
 * are we recruiting for" or "which one is behind" without naming a single
 * participant.
 */
export function siteSummary(studies: Study[], investigators: Map<string, string>): string {
  if (studies.length === 0) return 'This site has no studies yet.'
  const lines = studies.map((s) => {
    // Staff names, not participants'. Who runs a study is among the first
    // things anyone asks, and without this the assistant could not answer it.
    const pi = s.principalInvestigatorId
      ? (investigators.get(s.principalInvestigatorId) ?? 'assigned, name unavailable')
      : 'none assigned'
    return (
      `- ${s.id} (${s.nctId}): ${s.title}. ${s.condition}, ${s.phase}, sponsor ${s.sponsor}. ` +
      `Status ${s.status}, recruitment ${s.recruitmentStatus}. ` +
      `Investigator: ${pi}. Enrolled ${s.enrolled} of target ${s.enrollmentTarget}.`
    )
  })
  return [`This site has ${studies.length} studies.`, ...lines].join('\n')
}

/**
 * Ask the assistant.
 *
 * Goes to our own server, never to the model provider: the API key lives there,
 * and a key shipped to the browser is a key anyone can read.
 */
/**
 * A booking the assistant heard, in the words it heard them.
 *
 * Names, not ids: the assistant is never shown the participant list, so it can
 * only repeat back what the person typed. Turning "Maya" into a record is done
 * here, against the real data, where a wrong guess can be caught.
 */
export interface BookingProposal {
  participant: string
  visit?: string
  /** ISO `yyyy-mm-dd`. */
  date: string
  time?: string
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Today where the reader is, as `yyyy-mm-dd`. */
function localDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export interface Answer {
  reply: string
  /** Where it offered to take you, if anywhere. */
  goTo?: Destination
  /** What it understood you wanted booked, before anyone agrees to it. */
  proposal?: BookingProposal
}

export async function ask(
  messages: ChatTurn[],
  context: string,
  destinations: Destination[],
): Promise<Answer> {
  const token = authToken()
  if (!token) throw new ApiError('Sign in to use the assistant.', 'invalid')

  let res: Response
  try {
    res = await fetch(`${AUTH_API}/api/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      // The reader's own date. The server runs on UTC, so late in its day its
      // "tomorrow" is not theirs, and a visit would be booked a day out.
      body: JSON.stringify({ messages, context, destinations, today: localDate() }),
    })
  } catch {
    throw new ApiError('We could not reach the assistant.', 'network')
  }

  const body = (await res.json().catch(() => ({}))) as {
    reply?: string
    navigateTo?: string
    proposal?: BookingProposal
    error?: string
  }
  if (!res.ok) throw new ApiError(body.error ?? 'The assistant could not answer.', 'network')
  if (!body.reply) throw new ApiError('The assistant returned nothing.', 'network')

  // Checked against the list we sent, not trusted from the reply. A model that
  // invents a route would otherwise offer a link to a page that does not exist,
  // or to one this person is not allowed to open.
  const goTo = destinations.find((d) => d.path === body.navigateTo)

  return { reply: body.reply, goTo, proposal: body.proposal }
}
