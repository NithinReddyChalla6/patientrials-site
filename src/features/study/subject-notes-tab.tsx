import * as React from 'react'
import { NotebookPen, Plus, UserRound, X } from 'lucide-react'
import { subjectNotesApi, subjectsApi, ApiError } from '@/data/api'
import type { Subject } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { formatRelative } from '@/lib/format'
import { Combobox } from '@/components/ui/combobox'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { EmptyState } from '@/components/patterns/empty-state'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { InferredNotice } from '@/components/patterns/inferred-notice'
import { useAuth } from '@/features/auth/auth-context'
import { useStudy } from './study-layout'

/**
 * The running account of what staff observed about each participant.
 *
 * Grouped by person rather than listed by date. A note matters as part of one
 * participant's story — the previous three notes are the context that makes the
 * fourth mean anything — and a single reverse-chronological feed across the
 * whole study scatters exactly that.
 *
 * Notes cannot be edited or removed once written. That is the point of a note:
 * a record that can be revised afterwards answers nothing when a monitor asks
 * what was known, and when.
 */
export function SubjectNotesTab() {
  const { study } = useStudy()
  const { session, can } = useAuth()
  const toast = useToast()
  const canWrite = can('note.manage')

  const state = useAsync(() => subjectNotesApi.list(study.id), [study.id])
  const people = useAsync(
    () => subjectsApi.list({ studyId: study.id, status: 'all', page: 1, pageSize: 200 }),
    [study.id],
  )

  const [adding, setAdding] = React.useState(false)
  const [subjectId, setSubjectId] = React.useState('')
  const [body, setBody] = React.useState('')
  const [error, setError] = React.useState<string>()
  const [saving, setSaving] = React.useState(false)

  const subjects = people.data?.items ?? []
  const byId = React.useMemo(() => {
    const map = new Map<string, Subject>()
    subjects.forEach((s) => map.set(s.id, s))
    return map
  }, [subjects])

  async function save() {
    setError(undefined)
    setSaving(true)
    try {
      await subjectNotesApi.add({
        studyId: study.id,
        subjectId,
        body,
        author: session ? `${session.user.firstName} ${session.user.lastName}` : 'Study team',
      })
      toast.success('Note added')
      setBody('')
      setSubjectId('')
      setAdding(false)
      state.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not save this note.')
    } finally {
      setSaving(false)
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
      errorTitle="We could not load the notes for this study"
    >
      {(notes) => {
        const grouped = [...new Set(notes.map((n) => n.subjectId))].map((id) => ({
          subject: byId.get(id),
          subjectId: id,
          notes: notes.filter((n) => n.subjectId === id),
        }))

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Patient notes</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                What the study team has observed about each participant — tolerance, preferences,
                anything the next person seeing them should know.
              </p>
            </div>

            <InferredNotice>
              Notes are added and never changed. One that can be edited afterwards cannot answer
              what was known at the time, which is the question these get asked.
            </InferredNotice>

            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {notes.length === 0
                  ? 'No notes yet'
                  : `${notes.length} across ${grouped.length} participants`}
              </h3>
              {canWrite && !adding && (
                <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                  <Plus aria-hidden="true" />
                  Add note
                </Button>
              )}
            </div>

            {canWrite && adding && (
              <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <h3 className="text-sm font-semibold text-foreground">Add a note</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAdding(false)}
                    aria-label="Cancel this note"
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {error && (
                    <Alert tone="error" title="We could not save this note">
                      {error}
                    </Alert>
                  )}

                  <FormField id="noteSubject" label="Participant" required>
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

                  <FormField
                    id="noteBody"
                    label="Note"
                    hint="Written once and kept as it stands, so say what you saw rather than what you plan to revise."
                    required
                  >
                    {(aria) => (
                      <Textarea
                        {...aria}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={4}
                      />
                    )}
                  </FormField>

                  <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
                    <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
                      Cancel
                    </Button>
                    <Button type="button" variant="brand" onClick={save} loading={saving}>
                      Save note
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {notes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card">
                <EmptyState
                  compact
                  icon={NotebookPen}
                  title="No notes yet"
                  description="Notes staff write about a participant appear here, newest first."
                />
              </div>
            ) : (
              <ul className="space-y-4">
                {grouped.map(({ subject, subjectId: id, notes: mine }) => (
                  <li key={id} className="rounded-lg border border-border bg-card shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
                      <span
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"
                        aria-hidden="true"
                      >
                        <UserRound className="size-4" />
                      </span>
                      <p className="text-sm font-medium text-foreground">
                        {subject ? `${subject.firstName} ${subject.lastName}` : 'Former participant'}
                        <span className="id ml-2 text-xs font-normal text-muted-foreground">
                          {id}
                        </span>
                      </p>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {mine.length === 1 ? '1 note' : `${mine.length} notes`}
                      </span>
                    </div>

                    <ul className="divide-y divide-border">
                      {mine.map((note) => (
                        <li key={note.id} className="p-4">
                          <p className="whitespace-pre-wrap text-sm text-foreground">{note.body}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {note.author} · {formatRelative(note.createdAt)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      }}
    </AsyncBoundary>
  )
}
