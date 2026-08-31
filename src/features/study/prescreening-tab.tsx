import * as React from 'react'
import { ListChecks, Plus, Trash2 } from 'lucide-react'
import { prescreeningApi } from '@/data/api'
import type {
  PrescreeningGroup,
  PrescreeningQuestion,
  PrescreeningResponseType,
} from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { useForm } from '@/lib/use-form'
import { all, inRange, required } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { ListInput } from '@/components/ui/list-input'
import { CheckboxField } from '@/components/ui/checkbox'
import { SkeletonRows } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { EmptyState } from '@/components/patterns/empty-state'
import { FormField } from '@/components/patterns/form-field'
import { ConfirmDialog } from '@/components/patterns/confirm-dialog'
import { useAuth } from '@/features/auth/auth-context'
import { useStudy } from './study-layout'

const RESPONSE_TYPES: PrescreeningResponseType[] = ['Yes/No', 'Single Choice', 'Free Text']

const GROUP_COPY: Record<PrescreeningGroup, { label: string; description: string }> = {
  primary: {
    label: 'Primary',
    description:
      'Asked first, before the sign-up form. Answers that do not match what the study needs stop the participant from continuing.',
  },
  secondary: {
    label: 'Secondary',
    description:
      'Asked after the primary questions pass. Used to gather detail for your team, not to decide eligibility.',
  },
}

/**
 * Pre-screening questions.
 *
 * The legacy screen reached these through a related list of NCT links labelled
 * "Primary" and "Secondary", opening a platform form where choices were typed as
 * a pipe-delimited string — `Yes|No` — and the desired answer was free text that
 * had to match one of them exactly. Choices are a real list here, and the desired
 * answer is chosen from the choices, so the two cannot fall out of step.
 */
export function PrescreeningTab() {
  const [group, setGroup] = React.useState<PrescreeningGroup>('primary')

  return (
    <Tabs value={group} onValueChange={(v) => setGroup(v as PrescreeningGroup)}>
      <TabsList>
        <TabsTrigger value="primary">Primary</TabsTrigger>
        <TabsTrigger value="secondary">Secondary</TabsTrigger>
      </TabsList>

      {(['primary', 'secondary'] as PrescreeningGroup[]).map((value) => (
        <TabsContent key={value} value={value}>
          <QuestionGroup group={value} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function QuestionGroup({ group }: { group: PrescreeningGroup }) {
  const { study } = useStudy()
  const { can } = useAuth()
  const toast = useToast()
  const canManage = can('prescreening.manage')

  const state = useAsync(() => prescreeningApi.list(study.id, group), [study.id, group])
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [removeTarget, setRemoveTarget] = React.useState<PrescreeningQuestion | null>(null)
  const [busy, setBusy] = React.useState(false)

  async function remove() {
    if (!removeTarget) return
    setBusy(true)
    try {
      await prescreeningApi.remove(removeTarget.id)
      toast.success('Question removed')
      setRemoveTarget(null)
      state.reload()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="max-w-2xl text-sm text-muted-foreground">{GROUP_COPY[group].description}</p>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus aria-hidden="true" />
            Add question
          </Button>
        )}
      </div>

      <AsyncBoundary
        state={state}
        loading={
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <SkeletonRows rows={3} cols={2} />
          </div>
        }
        isEmpty={(items) => items.length === 0}
        empty={
          <div className="rounded-lg border border-dashed border-border bg-card">
            <EmptyState
              icon={ListChecks}
              title={`No ${GROUP_COPY[group].label.toLowerCase()} questions yet`}
              description={
                group === 'primary'
                  ? 'Without primary questions everyone who finds this study can sign up. Add the questions that decide who is eligible.'
                  : 'Add questions that gather useful detail once a participant has passed the primary questions.'
              }
              action={
                canManage && (
                  <Button variant="brand" onClick={() => setDialogOpen(true)}>
                    <Plus aria-hidden="true" />
                    Add question
                  </Button>
                )
              }
            />
          </div>
        }
        errorTitle="We could not load these questions"
      >
        {(questions) => (
          <ol className="space-y-3">
            {questions.map((question) => (
              <li
                key={question.id}
                className="rounded-lg border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground"
                    aria-hidden="true"
                  >
                    {question.order}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{question.question}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge tone="outline">{question.responseType}</Badge>
                      {question.correctAnswer && group === 'primary' && (
                        <Badge tone="warning">Decides eligibility</Badge>
                      )}
                    </div>

                    {question.choices.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {question.choices.map((choice) => (
                          <li
                            key={choice}
                            className={
                              choice === question.desiredAnswer
                                ? 'rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success'
                                : 'rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground'
                            }
                          >
                            {choice}
                            {choice === question.desiredAnswer && (
                              <span className="sr-only"> (the answer the study wants)</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setRemoveTarget(question)}
                      aria-label={`Remove question: ${question.question}`}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </AsyncBoundary>

      <QuestionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        group={group}
        studyId={study.id}
        nextOrder={(state.data?.length ?? 0) + 1}
        onSaved={() => {
          setDialogOpen(false)
          state.reload()
        }}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove this question?"
        description={
          removeTarget
            ? `"${removeTarget.question}" will no longer be asked. Answers already given by participants are kept on their records.`
            : ''
        }
        confirmLabel="Remove question"
        destructive
        loading={busy}
        onConfirm={remove}
      />
    </div>
  )
}

function QuestionDialog({
  open,
  onOpenChange,
  group,
  studyId,
  nextOrder,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: PrescreeningGroup
  studyId: string
  nextOrder: number
  onSaved: () => void
}) {
  const toast = useToast()
  const [choices, setChoices] = React.useState<string[]>([])
  const [desiredAnswer, setDesiredAnswer] = React.useState('')
  const [decidesEligibility, setDecidesEligibility] = React.useState(group === 'primary')

  const form = useForm({
    initialValues: {
      question: '',
      order: String(nextOrder),
      responseType: 'Yes/No' as PrescreeningResponseType,
    },
    rules: {
      question: required('Question'),
      order: all(required('Order'), inRange(1, 99, 'Order')),
      responseType: required('Response type'),
    },
  })

  const isSingleChoice = form.values.responseType === 'Single Choice'
  const isYesNo = form.values.responseType === 'Yes/No'
  const effectiveChoices = isYesNo ? ['Yes', 'No'] : isSingleChoice ? choices : []

  const choicesError =
    form.submitAttempted && isSingleChoice && choices.length < 2
      ? 'Add at least two choices'
      : undefined
  const desiredError =
    form.submitAttempted && decidesEligibility && effectiveChoices.length > 0 && !desiredAnswer
      ? 'Choose the answer that keeps a participant eligible'
      : undefined

  React.useEffect(() => {
    if (!open) return
    form.reset({ question: '', order: String(nextOrder), responseType: 'Yes/No' })
    setChoices([])
    setDesiredAnswer('')
    setDecidesEligibility(group === 'primary')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nextOrder, group])

  // Keep the desired answer valid when the choice list changes underneath it.
  React.useEffect(() => {
    if (desiredAnswer && !effectiveChoices.includes(desiredAnswer)) setDesiredAnswer('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveChoices.join('|')])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const result = await form.submit()
    if (!result.ok) return
    if (isSingleChoice && choices.length < 2) return
    if (decidesEligibility && effectiveChoices.length > 0 && !desiredAnswer) return

    await prescreeningApi.create({
      studyId,
      group,
      question: form.values.question,
      order: Number(form.values.order),
      responseType: form.values.responseType,
      choices: effectiveChoices,
      desiredAnswer: decidesEligibility ? desiredAnswer : undefined,
      correctAnswer: decidesEligibility,
    })
    toast.success('Question added')
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Add a {GROUP_COPY[group].label.toLowerCase()} question</DialogTitle>
            <DialogDescription>{GROUP_COPY[group].description}</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5">
            <FormField
              id="question"
              label="Question"
              hint="Write it as the participant will read it."
              error={form.errors.question}
              required
            >
              {(aria) => <Textarea {...aria} {...form.field('question')} rows={2} />}
            </FormField>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="responseType"
                label="Response type"
                error={form.errors.responseType}
                required
              >
                {(aria) => (
                  <Select {...aria} {...form.field('responseType')} options={RESPONSE_TYPES} />
                )}
              </FormField>

              <FormField
                id="order"
                label="Order"
                hint="Where it appears in the list."
                error={form.errors.order}
                required
              >
                {(aria) => <Input {...aria} {...form.field('order')} inputMode="numeric" />}
              </FormField>
            </div>

            {isSingleChoice && (
              <FormField
                id="choices"
                label="Choices"
                hint="The options the participant picks from."
                error={choicesError}
                required
              >
                {(aria) => (
                  <ListInput
                    {...aria}
                    label="Choices"
                    placeholder="Yes"
                    items={choices}
                    onChange={setChoices}
                    emptyMessage="No choices added yet."
                  />
                )}
              </FormField>
            )}

            {isYesNo && (
              <Alert tone="info">Participants will answer Yes or No.</Alert>
            )}

            {group === 'primary' && form.values.responseType !== 'Free Text' && (
              <div className="space-y-4 rounded-lg border border-border bg-sunken p-4">
                <CheckboxField
                  id="decides-eligibility"
                  checked={decidesEligibility}
                  onCheckedChange={setDecidesEligibility}
                  label="Use this answer to decide eligibility"
                  description="Participants who answer differently will not be able to continue."
                />

                {decidesEligibility && effectiveChoices.length > 0 && (
                  <FormField
                    id="desiredAnswer"
                    label="Answer the study wants"
                    error={desiredError}
                    required
                  >
                    {(aria) => (
                      <Select
                        {...aria}
                        value={desiredAnswer}
                        onChange={(e) => setDesiredAnswer(e.target.value)}
                        options={effectiveChoices}
                        placeholder="Select an answer"
                      />
                    )}
                  </FormField>
                )}
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" loading={form.submitting}>
              Add question
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
