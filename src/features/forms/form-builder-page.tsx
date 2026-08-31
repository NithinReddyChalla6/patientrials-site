import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as Popover from '@radix-ui/react-popover'
import { ArrowLeft, ChevronDown, Eye, Plus, Save, Send, Trash2 } from 'lucide-react'
import { formsApi } from '@/data/api'
import {
  QUESTION_TYPES,
  type FormCategory,
  type FormSection,
  type QuestionType,
  type StudyForm,
} from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { required } from '@/lib/validators'
import { formatRelative, pluralize } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { RICH_TEXT_HINT, RichTextField } from '@/components/ui/rich-text'
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
import { PageHeader } from '@/components/patterns/page-header'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { FormField } from '@/components/patterns/form-field'
import { FormStatusBadge } from '@/components/patterns/status-badge'
import { ConfirmDialog } from '@/components/patterns/confirm-dialog'
import { useAuth } from '@/features/auth/auth-context'
import { QuestionEditor, newQuestion, questionError } from './question-editor'
import { FormPreview } from './form-preview'

let seq = 0
const uid = (prefix: string) => `${prefix}-${Date.now()}-${(seq += 1)}`

const emptyDraft = (category: FormCategory): StudyForm => ({
  id: '',
  title: '',
  description: '',
  category,
  type: 'Unassigned',
  status: 'draft',
  sections: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  assignedStudyIds: [],
})

/**
 * The form builder.
 *
 * The legacy builder opened in a popup window, put every prompt inside a
 * separate TinyMCE iframe, and kept the questions tab disabled — via a CSS class
 * called `disable-tabs` — until a title had been saved, with the reason given
 * only by an error that appeared on blur. The gate itself is sound (a form
 * without a name cannot be found again), so it is kept and explained, and the
 * result is previewed beside the editor as it is written.
 */
export function FormBuilderPage({ category }: { category: FormCategory }) {
  const { formId } = useParams()
  const isNew = !formId || formId === 'new'
  const state = useAsync(
    () => (isNew ? Promise.resolve(emptyDraft(category)) : formsApi.get(formId!)),
    [formId, category],
  )

  return (
    <AsyncBoundary
      state={state}
      loading={
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-96" />
        </div>
      }
      errorTitle="We could not load this form"
    >
      {(form) => <Builder initial={form} isNew={isNew} category={category} />}
    </AsyncBoundary>
  )
}

function Builder({
  initial,
  isNew,
  category,
}: {
  initial: StudyForm
  isNew: boolean
  category: FormCategory
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const { can } = useAuth()
  const canEdit = can('form.create')
  const canPublish = can('form.publish')
  const basePath = category === 'form' ? '/forms' : '/surveys'
  const noun = category === 'form' ? 'form' : 'survey'

  const [draft, setDraft] = React.useState<StudyForm>(initial)
  const [saved, setSaved] = React.useState<StudyForm>(initial)
  const [titleTouched, setTitleTouched] = React.useState(false)
  const [publishAttempted, setPublishAttempted] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [publishOpen, setPublishOpen] = React.useState(false)
  const [removeSection, setRemoveSection] = React.useState<FormSection | null>(null)
  const [serverError, setServerError] = React.useState<string>()

  const titleError =
    titleTouched || publishAttempted ? required('A title')(draft.title) : undefined
  const hasTitle = draft.title.trim().length > 0
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const questionCount = draft.sections.reduce((n, s) => n + s.questions.length, 0)
  const invalidQuestions = draft.sections.flatMap((s) =>
    s.questions.filter((q) => questionError(q)),
  )

  const patch = (next: Partial<StudyForm>) => setDraft((d) => ({ ...d, ...next }))

  function patchSection(sectionId: string, next: Partial<FormSection>) {
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) => (s.id === sectionId ? { ...s, ...next } : s)),
    }))
  }

  function addSection() {
    const section: FormSection = { id: uid('SEC'), title: '', description: '', questions: [] }
    setDraft((d) => ({ ...d, sections: [...d.sections, section] }))
  }

  function addQuestion(sectionId: string, type: QuestionType) {
    setDraft((d) => ({
      ...d,
      sections: d.sections.map((s) =>
        s.id === sectionId ? { ...s, questions: [...s.questions, newQuestion(type, uid('Q'))] } : s,
      ),
    }))
  }

  async function save(): Promise<StudyForm | undefined> {
    setTitleTouched(true)
    if (!hasTitle) return undefined
    setSaving(true)
    setServerError(undefined)
    try {
      if (isNew && !draft.id) {
        const created = await formsApi.create({
          title: draft.title,
          description: draft.description,
          category,
        })
        const withSections = await formsApi.update(created.id, { sections: draft.sections })
        setDraft(withSections)
        setSaved(withSections)
        toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} saved as draft`)
        navigate(`${basePath}/${created.id}`, { replace: true })
        return withSections
      }
      const updated = await formsApi.update(draft.id, {
        title: draft.title,
        description: draft.description,
        sections: draft.sections,
      })
      setDraft(updated)
      setSaved(updated)
      toast.success('Draft saved')
      return updated
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'We could not save this form.')
      return undefined
    } finally {
      setSaving(false)
    }
  }

  async function publish(startDate: string) {
    setPublishAttempted(true)
    const persisted = await save()
    if (!persisted) return
    if (questionCount === 0 || invalidQuestions.length > 0) {
      setPublishOpen(false)
      return
    }
    try {
      await formsApi.publish(persisted.id, startDate)
      toast.success(
        'Published',
        `This ${noun} can now be assigned to studies.`,
      )
      setPublishOpen(false)
      navigate(`${basePath}/${persisted.id}`)
      setDraft({ ...persisted, status: 'published', startDate })
      setSaved({ ...persisted, status: 'published', startDate })
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'We could not publish this form.')
      setPublishOpen(false)
    }
  }

  const readOnly = !canEdit || draft.status === 'published'

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={basePath}>
          <ArrowLeft aria-hidden="true" />
          Back to {noun}s
        </Link>
      </Button>

      <PageHeader
        eyebrow={draft.id ? <span className="id">{draft.id}</span> : 'New'}
        title={draft.title || `Untitled ${noun}`}
        description={
          draft.status === 'published'
            ? `Published ${formatRelative(draft.publishedAt)}. Published ${noun}s cannot be edited — duplicate it to make changes.`
            : `${pluralize(questionCount, 'question')} across ${pluralize(draft.sections.length, 'section')}`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <FormStatusBadge status={draft.status} />
            {draft.status === 'draft' && canEdit && (
              <>
                <Button variant="outline" onClick={save} loading={saving} disabled={!dirty && !isNew}>
                  <Save aria-hidden="true" />
                  Save as draft
                </Button>
                {canPublish && (
                  <Button variant="brand" onClick={() => setPublishOpen(true)}>
                    <Send aria-hidden="true" />
                    Publish
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      {serverError && (
        <Alert tone="error" title="Something went wrong">
          {serverError}
        </Alert>
      )}

      {draft.status === 'published' && (
        <Alert tone="info" title={`This ${noun} is live`}>
          Participants may already have answered it, so its questions are locked. Assign it to a
          study from the study's {category === 'form' ? 'Forms' : 'Surveys'} tab.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        {/* Editor */}
        <div className="min-w-0 space-y-6">
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Details
            </h2>
            <div className="mt-4 space-y-4">
              <FormField
                id="form-title"
                label={`${noun[0].toUpperCase()}${noun.slice(1)} title`}
                hint="How your team will find this later."
                error={titleError}
                required
              >
                {(aria) => (
                  <Input
                    {...aria}
                    value={draft.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    onBlur={() => setTitleTouched(true)}
                    placeholder="Enter form title"
                    disabled={readOnly}
                  />
                )}
              </FormField>

              <FormField
                id="form-description"
                label="Introduction"
                hint={`Shown above the first question. ${RICH_TEXT_HINT}`}
              >
                {(aria) => (
                  <RichTextField
                    {...aria}
                    value={draft.description}
                    onChange={(e) => patch({ description: e.target.value })}
                    disabled={readOnly}
                    placeholder="Explain what this form is for and how the answers will be used."
                  />
                )}
              </FormField>
            </div>
          </section>

          {!hasTitle ? (
            <Alert tone="info" title="Add a title to start building">
              Questions become available once this {noun} has a title, so it can always be found and
              assigned later.
            </Alert>
          ) : (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Questions
                </h2>
                {!readOnly && (
                  <Button variant="outline" size="sm" onClick={addSection}>
                    <Plus aria-hidden="true" />
                    Add section
                  </Button>
                )}
              </div>

              {publishAttempted && questionCount === 0 && (
                <Alert tone="error" title="Add at least one question before publishing" />
              )}

              {draft.sections.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center">
                  <p className="text-sm font-medium text-foreground">No sections yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Sections group related questions. Most forms need only one.
                  </p>
                  {!readOnly && (
                    <Button variant="brand" size="sm" className="mt-4" onClick={addSection}>
                      <Plus aria-hidden="true" />
                      Add a section
                    </Button>
                  )}
                </div>
              ) : (
                <ol className="space-y-6">
                  {draft.sections.map((section, sectionIndex) => (
                    <li
                      key={section.id}
                      className="rounded-lg border border-border bg-sunken p-4"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                          Section {sectionIndex + 1}
                        </span>
                        {!readOnly && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setRemoveSection(section)}
                            aria-label={`Remove section ${sectionIndex + 1}`}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <FormField id={`section-${section.id}-title`} label="Section title">
                          {(aria) => (
                            <Input
                              {...aria}
                              value={section.title}
                              onChange={(e) => patchSection(section.id, { title: e.target.value })}
                              placeholder="Enter section title"
                              disabled={readOnly}
                            />
                          )}
                        </FormField>

                        <FormField
                          id={`section-${section.id}-description`}
                          label="Section description"
                          hint={RICH_TEXT_HINT}
                        >
                          {(aria) => (
                            <RichTextField
                              {...aria}
                              rows={3}
                              value={section.description}
                              onChange={(e) =>
                                patchSection(section.id, { description: e.target.value })
                              }
                              disabled={readOnly}
                            />
                          )}
                        </FormField>
                      </div>

                      <ol className="mt-5 space-y-4">
                        {section.questions.map((question, index) => (
                          <QuestionEditor
                            key={question.id}
                            question={question}
                            index={index}
                            total={section.questions.length}
                            showErrors={publishAttempted}
                            onChange={(next) =>
                              patchSection(section.id, {
                                questions: section.questions.map((q) =>
                                  q.id === next.id ? next : q,
                                ),
                              })
                            }
                            onRemove={() =>
                              patchSection(section.id, {
                                questions: section.questions.filter((q) => q.id !== question.id),
                              })
                            }
                            onMove={(direction) => {
                              const next = [...section.questions]
                              const target = index + direction
                              if (target < 0 || target >= next.length) return
                              ;[next[index], next[target]] = [next[target], next[index]]
                              patchSection(section.id, { questions: next })
                            }}
                          />
                        ))}
                      </ol>

                      {!readOnly && (
                        <div className="mt-4">
                          <AddQuestionMenu onSelect={(type) => addQuestion(section.id, type)} />
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
        </div>

        {/* Preview */}
        <aside className="min-w-0">
          <div className="lg:sticky lg:top-24">
            <div className="mb-3 flex items-center gap-2">
              <Eye className="size-4 text-brand" aria-hidden="true" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Participant view
              </h2>
            </div>
            <FormPreview form={draft} />
          </div>
        </aside>
      </div>

      <PublishDialog
        open={publishOpen}
        onOpenChange={setPublishOpen}
        noun={noun}
        questionCount={questionCount}
        invalidCount={invalidQuestions.length}
        onPublish={publish}
      />

      <ConfirmDialog
        open={Boolean(removeSection)}
        onOpenChange={(open) => !open && setRemoveSection(null)}
        title="Remove this section?"
        description={
          removeSection
            ? `${removeSection.title ? `"${removeSection.title}"` : 'This section'} and its ${pluralize(removeSection.questions.length, 'question')} will be removed from the draft.`
            : ''
        }
        confirmLabel="Remove section"
        destructive
        onConfirm={() => {
          setDraft((d) => ({
            ...d,
            sections: d.sections.filter((s) => s.id !== removeSection?.id),
          }))
          setRemoveSection(null)
        }}
      />
    </div>
  )
}

function AddQuestionMenu({ onSelect }: { onSelect: (type: QuestionType) => void }) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button variant="outline" size="sm">
          <Plus aria-hidden="true" />
          Add question
          <ChevronDown aria-hidden="true" />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg data-[state=open]:animate-slide-up data-[state=closed]:animate-slide-down-out"
        >
          <ul>
            {QUESTION_TYPES.map((type) => (
              <li key={type}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(type)
                    setOpen(false)
                  }}
                  className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm text-foreground transition-colors hover:bg-secondary"
                >
                  {type}
                </button>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function PublishDialog({
  open,
  onOpenChange,
  noun,
  questionCount,
  invalidCount,
  onPublish,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  noun: string
  questionCount: number
  invalidCount: number
  onPublish: (startDate: string) => Promise<void>
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = React.useState(today)
  const [attempted, setAttempted] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setStartDate(today)
      setAttempted(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const dateError = attempted && !startDate ? 'Choose a start date' : undefined
  const blocked = questionCount === 0 || invalidCount > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setAttempted(true)
            if (!startDate) return
            setBusy(true)
            try {
              await onPublish(startDate)
            } finally {
              setBusy(false)
            }
          }}
          noValidate
        >
          <DialogHeader>
            <DialogTitle>Publish this {noun}?</DialogTitle>
            <DialogDescription>
              Once published it can be assigned to studies, and its questions are locked so
              participants' answers stay comparable.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4">
            {blocked ? (
              <Alert
                tone="error"
                title={
                  questionCount === 0
                    ? 'Add at least one question first'
                    : `${invalidCount} question${invalidCount === 1 ? '' : 's'} need${invalidCount === 1 ? 's' : ''} attention`
                }
              >
                {questionCount === 0
                  ? `A ${noun} with no questions cannot be published.`
                  : 'Close this dialog to see which questions are incomplete.'}
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">
                {pluralize(questionCount, 'question')} will go live.
              </p>
            )}

            <FormField
              id="field_start_date_time"
              label="Available from"
              hint="Participants will not see it before this date."
              error={dateError}
              required
            >
              {(aria) => (
                <Input
                  {...aria}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              )}
            </FormField>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" loading={busy} disabled={blocked}>
              Publish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
