import { ApiError, authToken, AUTH_API } from './api'
import type { Study, Subject } from './types'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
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
export function studySummary(study: Study, subjects: Subject[]): string {
  const count = (status: Subject['status']) => subjects.filter((s) => s.status === status).length

  return [
    `Study ${study.id} (${study.nctId}): ${study.title}`,
    `Condition: ${study.condition}. Phase: ${study.phase}. Sponsor: ${study.sponsor}.`,
    `Status: ${study.status}, recruitment ${study.recruitmentStatus}.`,
    `Enrolment target ${study.enrollmentTarget}, currently enrolled ${study.enrolled}.`,
    `Participants on this study: ${subjects.length} in total — ` +
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
export function siteSummary(studies: Study[]): string {
  if (studies.length === 0) return 'This site has no studies yet.'
  const lines = studies.map(
    (s) =>
      `- ${s.id} (${s.nctId}): ${s.title}. ${s.condition}, ${s.phase}, sponsor ${s.sponsor}. ` +
      `Status ${s.status}, recruitment ${s.recruitmentStatus}, ` +
      `enrolled ${s.enrolled} of ${s.enrollmentTarget}.` +
      (s.principalInvestigatorId ? '' : ' No investigator assigned.'),
  )
  return [`This site has ${studies.length} studies.`, ...lines].join('\n')
}

/**
 * Ask the assistant.
 *
 * Goes to our own server, never to the model provider: the API key lives there,
 * and a key shipped to the browser is a key anyone can read.
 */
export async function ask(messages: ChatTurn[], context: string): Promise<string> {
  const token = authToken()
  if (!token) throw new ApiError('Sign in to use the assistant.', 'invalid')

  let res: Response
  try {
    res = await fetch(`${AUTH_API}/api/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ messages, context }),
    })
  } catch {
    throw new ApiError('We could not reach the assistant.', 'network')
  }

  const body = (await res.json().catch(() => ({}))) as { reply?: string; error?: string }
  if (!res.ok) throw new ApiError(body.error ?? 'The assistant could not answer.', 'network')
  if (!body.reply) throw new ApiError('The assistant returned nothing.', 'network')
  return body.reply
}
