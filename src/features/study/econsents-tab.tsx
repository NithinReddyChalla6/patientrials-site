import * as React from 'react'
import { ChevronRight, FileSignature, Plus, ShieldCheck, Trash2, X } from 'lucide-react'
import { eConsentsApi, ApiError } from '@/data/api'
import type { ConsentInteraction, ConsentQuestion, EConsent } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { formatRelative } from '@/lib/format'
import { forgetDocument, saveDocument } from '@/lib/document-store'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckboxField } from '@/components/ui/checkbox'
import { FileDrop } from '@/components/ui/file-drop'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { EmptyState } from '@/components/patterns/empty-state'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { useAuth } from '@/features/auth/auth-context'
import { useStudy } from './study-layout'
import { ConsentRecord } from './consent-record'
import {
  InteractionFields,
  blankInteraction,
  cleanInteraction,
  interactionProblem,
} from './consent-interaction'

const ANSWERS = ['Yes', 'No']
const STEPS = ['Details', 'Document', 'Questions', 'Interactions'] as const

/**
 * Consent documents a participant signs electronically.
 *
 * The legacy wizard wrote the record on its first step, then asked you to
 * confirm the uploaded file in a modal that said only "YES", then took the
 * comprehension questions one at a time. Here the steps remain, the uploaded
 * file is simply shown so there is nothing to confirm blind, and the consent is
 * written once at the end, so abandoning it leaves nothing behind.
 *
 * Opening one shows the record, where it can be edited, laid out in the
 * designer, copied, and given interactions.
 */
export function EConsentsTab() {
  const { study } = useStudy()
  const { can } = useAuth()
  const toast = useToast()
  const canManage = can('consent.manage')

  const state = useAsync(() => eConsentsApi.list(study.id), [study.id])
  const [adding, setAdding] = React.useState(false)
  const [openId, setOpenId] = React.useState<string>()
  const [busyId, setBusyId] = React.useState<string>()

  async function remove(consent: EConsent) {
    setBusyId(consent.id)
    try {
      await eConsentsApi.remove(consent.id)
      // Otherwise the document outlives the record that explained what it was,
      // and sits in this browser's storage with nothing able to reach it.
      await forgetDocument(consent.id)
      toast.success('Consent removed')
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
      errorTitle="We could not load the consents for this study"
    >
      {(consents) => {
        // Falls back to the list when the open record has gone — a consent
        // removed in another tab should not leave this one on a blank screen.
        const open = openId ? consents.find((c) => c.id === openId) : undefined
        if (open) {
          return (
            <ConsentRecord
              consent={open}
              canManage={canManage}
              onBack={() => setOpenId(undefined)}
              onChanged={state.reload}
              onOpenCopy={setOpenId}
            />
          )
        }

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">eConsents</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                The consent documents participants sign for this study, and the questions that check
                they understood what they signed.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {consents.length === 0 ? 'None added' : `${consents.length} added`}
              </h3>
              {/* Removed once as clutter, which left the wizard with no way in:
                  nothing else on this screen creates a consent. */}
              {canManage && !adding && (
                <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                  <Plus aria-hidden="true" />
                  Add eConsent
                </Button>
              )}
            </div>

            {canManage && adding && (
              <ConsentWizard
                studyId={study.id}
                onDone={() => {
                  setAdding(false)
                  state.reload()
                }}
                onCancel={() => setAdding(false)}
              />
            )}

            {consents.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card">
                <EmptyState
                  compact
                  icon={FileSignature}
                  title="No consents yet"
                  description="Add the consent document participants sign before taking part."
                />
              </div>
            ) : (
              <ul className="space-y-3">
                {consents.map((consent) => (
                  <li
                    key={consent.id}
                    className="rounded-lg border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        {/* The card title is the way in to the record, the way
                            the legacy list opened one. */}
                        <button
                          type="button"
                          onClick={() => setOpenId(consent.id)}
                          className="flex flex-wrap items-center gap-2 text-left text-sm font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          {consent.description}
                          <ChevronRight
                            className="size-3.5 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="sr-only">Open this consent</span>
                        </button>
                        {consent.witnessRequired && (
                          <Badge tone="info" className="ml-0 mt-1.5">
                            <ShieldCheck className="size-3" aria-hidden="true" />
                            Witness required
                          </Badge>
                        )}
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                          <span className="id">{consent.id}</span>
                          {consent.documentName && <span>{consent.documentName}</span>}
                          <span>Added {formatRelative(consent.createdAt)}</span>
                        </p>
                      </div>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(consent)}
                          disabled={busyId === consent.id}
                          aria-label={`Remove ${consent.description}`}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      )}
                    </div>

                    <div className="mt-3 rounded-md border border-border bg-sunken p-3">
                      <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                        {consent.questions.length === 1
                          ? '1 comprehension question'
                          : `${consent.questions.length} comprehension questions`}
                      </p>
                      <ul className="mt-2 space-y-1.5">
                        {consent.questions.map((q) => (
                          <li key={q.question} className="text-sm text-foreground">
                            {q.question}
                            <span className="ml-2 text-xs text-muted-foreground">
                              Expected: {q.desiredAnswer}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {(consent.interactions?.length ?? 0) > 0 && (
                      <div className="mt-3 rounded-md border border-border bg-sunken p-3">
                        <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                          {consent.interactions?.length === 1
                            ? '1 interaction'
                            : `${consent.interactions?.length ?? 0} interactions`}
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {(consent.interactions ?? []).map((item, i) => (
                            <li key={`${item.link}-${i}`} className="text-sm text-foreground">
                              {item.type}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {item.question || item.link}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
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

/** The four-step build: what it covers, the document, the questions, the extras. */
function ConsentWizard({
  studyId,
  onDone,
  onCancel,
}: {
  studyId: string
  onDone: () => void
  onCancel: () => void
}) {
  const toast = useToast()
  const [step, setStep] = React.useState(0)
  const [description, setDescription] = React.useState('')
  const [witnessRequired, setWitnessRequired] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [questions, setQuestions] = React.useState<ConsentQuestion[]>([])
  const [interactions, setInteractions] = React.useState<ConsentInteraction[]>([])
  const [draft, setDraft] = React.useState<ConsentInteraction>(() => blankInteraction(1))
  const [question, setQuestion] = React.useState('')
  const [desiredAnswer, setDesiredAnswer] = React.useState('Yes')
  const [error, setError] = React.useState<string>()
  const [saving, setSaving] = React.useState(false)

  function next() {
    setError(undefined)
    if (step === 0 && !description.trim()) {
      setError('Describe what this consent covers.')
      return
    }
    if (step === 1 && !file) {
      setError('Attach the consent document before continuing.')
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  function addQuestion() {
    setError(undefined)
    if (!question.trim()) {
      setError('Write the question before adding it.')
      return
    }
    setQuestions((prev) => [...prev, { question: question.trim(), desiredAnswer }])
    setQuestion('')
    setDesiredAnswer('Yes')
  }

  function addInteraction() {
    setError(undefined)
    const problem = interactionProblem(draft)
    if (problem) {
      setError(problem)
      return
    }
    setInteractions((prev) => [...prev, cleanInteraction(draft)])
    setDraft(blankInteraction(interactions.length + 2))
  }

  async function finish() {
    setError(undefined)
    setSaving(true)
    try {
      const created = await eConsentsApi.add({
        studyId,
        description: description.trim(),
        witnessRequired,
        documentName: file?.name,
        questions,
        interactions,
      })
      // Kept against the new record's id so the designer opens on the document
      // straight away rather than asking for it again. See `document-store`
      // for why the file does not travel in the record itself.
      if (file) await saveDocument(created.id, file)
      toast.success('eConsent created', 'Participants can now be asked to sign it.')
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not create this consent.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Add an eConsent</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Step {step + 1} of {STEPS.length}, {STEPS[step].toLowerCase()}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label="Cancel this consent">
          <X aria-hidden="true" />
        </Button>
      </div>

      <ol className="mb-5 flex flex-wrap gap-2" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label}>
            <span
              className={
                i === step
                  ? 'rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand'
                  : 'rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground'
              }
            >
              {i + 1}. {label}
              {i === step && <span className="sr-only"> (current step)</span>}
            </span>
          </li>
        ))}
      </ol>

      <div className="space-y-4">
        {error && (
          <Alert tone="error" title="We could not continue">
            {error}
          </Alert>
        )}

        {step === 0 && (
          <>
            <FormField
              id="consentDescription"
              label="What this consent covers"
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

            <CheckboxField
              id="witnessRequired"
              label="A witness must countersign"
              description="Use this where the participant cannot read the document themselves."
              checked={witnessRequired}
              onCheckedChange={setWitnessRequired}
            />
          </>
        )}

        {step === 1 && (
          <FileDrop
            id="consentDocument"
            label="Consent document"
            hint="The PDF the participant reads and signs."
            accept=".pdf"
            value={file}
            onChange={setFile}
          />
        )}

        {step === 2 && (
          <>
            <div className="rounded-md border border-border bg-sunken p-3">
              <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                {questions.length === 0 ? 'No questions yet' : `${questions.length} added`}
              </p>
              {questions.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {questions.map((q, i) => (
                    <li
                      key={`${q.question}-${i}`}
                      className="flex items-start justify-between gap-3 text-sm text-foreground"
                    >
                      <span>
                        {q.question}
                        <span className="ml-2 text-xs text-muted-foreground">
                          Expected: {q.desiredAnswer}
                        </span>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuestions((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`Remove question ${i + 1}`}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <FormField
              id="inputQuestion"
              label="Question"
              hint="Something the participant can only answer correctly if they read the document."
            >
              {(aria) => (
                <Textarea
                  {...aria}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  rows={2}
                />
              )}
            </FormField>

            <div className="flex flex-wrap items-end gap-3">
              <FormField id="inputDesiredAnswer" label="Expected answer">
                {(aria) => (
                  <Select
                    {...aria}
                    value={desiredAnswer}
                    onChange={(e) => setDesiredAnswer(e.target.value)}
                    options={ANSWERS}
                    className="sm:max-w-[10rem]"
                  />
                )}
              </FormField>
              <Button type="button" variant="outline" onClick={addQuestion}>
                <Plus aria-hidden="true" />
                Add Question
              </Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="rounded-md border border-border bg-sunken p-3">
              <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
                {interactions.length === 0 ? 'None added' : `${interactions.length} added`}
              </p>
              {interactions.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {interactions.map((item, i) => (
                    <li
                      key={`${item.link}-${item.question}-${i}`}
                      className="flex items-start justify-between gap-3 text-sm text-foreground"
                    >
                      <span className="min-w-0 break-all">
                        {item.type}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {item.question || item.link}
                        </span>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInteractions((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`Remove interaction ${i + 1}`}
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <InteractionFields value={draft} onChange={setDraft} idPrefix="wizardInteraction" />

            <Button type="button" variant="outline" onClick={addInteraction}>
              <Plus aria-hidden="true" />
              Add interaction
            </Button>
          </>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          {step > 0 && (
            <Button type="button" variant="ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          {step < STEPS.length - 1 ? (
            <Button type="button" variant="brand" onClick={next}>
              Next
            </Button>
          ) : (
            <Button
              type="button"
              variant="brand"
              onClick={finish}
              loading={saving}
              disabled={questions.length === 0}
            >
              Finish
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
