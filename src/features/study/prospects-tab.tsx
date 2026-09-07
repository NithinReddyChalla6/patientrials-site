import { ParticipantsTab } from './participants-tab'

/**
 * People who have signed up but whose place on the study is not settled.
 *
 * The same screen as Subjects, narrowed to the stages where a decision is still
 * outstanding, so the queue of work is not mixed in with those already recruited
 * or ruled out.
 */
export function ProspectsTab() {
  return <ParticipantsTab scope="prospects" />
}
