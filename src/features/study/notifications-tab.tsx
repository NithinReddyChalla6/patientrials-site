import * as React from 'react'
import { Bell, Plus, Trash2 } from 'lucide-react'
import { notificationsApi } from '@/data/api'
import type {
  NotificationCadence,
  NotificationGroup,
  NotificationResponseType,
} from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { useForm } from '@/lib/use-form'
import { required } from '@/lib/validators'
import { pluralize } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import { Skeleton } from '@/components/ui/skeleton'
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
import { NOTIFICATION_TEMPLATES } from '@/data/reference'
import { useAuth } from '@/features/auth/auth-context'
import { useStudy } from './study-layout'

const CADENCES: NotificationCadence[] = ['Daily', 'Weekly', 'Monthly', 'Per visit']
const RESPONSE_TYPES: NotificationResponseType[] = ['Y/N', 'Rating', 'Number', 'Free Text']

/**
 * Patient notification question groups.
 *
 * These are the check-in questions participants answer on their phone between
 * visits. The legacy screen created the group and its questions through two
 * separate platform forms with a lookup popup in between; here a group and its
 * questions live on one screen, because a group with no questions does nothing.
 */
export function NotificationsTab() {
  const { study } = useStudy()
  const { can } = useAuth()
  const toast = useToast()
  const canManage = can('notification.manage')

  const state = useAsync(() => notificationsApi.list(study.id), [study.id])
  const [groupDialog, setGroupDialog] = React.useState(false)
  const [questionFor, setQuestionFor] = React.useState<NotificationGroup | null>(null)
  const [removeGroup, setRemoveGroup] = React.useState<NotificationGroup | null>(null)
  const [busy, setBusy] = React.useState(false)

  async function confirmRemoveGroup() {
    if (!removeGroup) return
    setBusy(true)
    try {
      await notificationsApi.removeGroup(removeGroup.id)
      toast.success('Question group removed')
      setRemoveGroup(null)
      state.reload()
    } finally {
      setBusy(false)
    }
  }

  async function removeQuestion(group: NotificationGroup, questionId: string) {
    await notificationsApi.removeQuestion(group.id, questionId)
    toast.success('Question removed')
    state.reload()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Participant check-ins</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Short questions participants answer between visits, grouped by the template they came
            from.
          </p>
        </div>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setGroupDialog(true)}>
            <Plus aria-hidden="true" />
            Add question group
          </Button>
        )}
      </div>

      <AsyncBoundary
        state={state}
        loading={<Skeleton className="h-64" />}
        isEmpty={(groups) => groups.length === 0}
        empty={
          <div className="rounded-lg border border-dashed border-border bg-card">
            <EmptyState
              icon={Bell}
              title="No check-in questions"
              description="Add a question group to start collecting short answers from participants between their visits."
              action={
                canManage && (
                  <Button variant="brand" onClick={() => setGroupDialog(true)}>
                    <Plus aria-hidden="true" />
                    Add question group
                  </Button>
                )
              }
            />
          </div>
        }
        errorTitle="We could not load check-in questions"
      >
        {(groups) => (
          <ul className="space-y-4">
            {groups.map((group) => (
              <li key={group.id} className="rounded-lg border border-border bg-card shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      From template “{group.templateName}” ·{' '}
                      {pluralize(group.questions.length, 'question')}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setQuestionFor(group)}>
                        <Plus aria-hidden="true" />
                        Add question
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setRemoveGroup(group)}
                        aria-label={`Remove group ${group.title}`}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </div>

                {group.questions.length === 0 ? (
                  <EmptyState
                    compact
                    title="No questions in this group"
                    description="Participants will not be asked anything until you add one."
                    action={
                      canManage && (
                        <Button variant="outline" size="sm" onClick={() => setQuestionFor(group)}>
                          <Plus aria-hidden="true" />
                          Add question
                        </Button>
                      )
                    }
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {group.questions.map((question) => (
                      <li key={question.id} className="flex items-start gap-3 p-4">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground">{question.text}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge tone="outline">{question.cadence}</Badge>
                            <Badge tone="neutral">{question.responseType}</Badge>
                          </div>
                        </div>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeQuestion(group, question.id)}
                            aria-label={`Remove question: ${question.text}`}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>

      <GroupDialog
        open={groupDialog}
        onOpenChange={setGroupDialog}
        studyId={study.id}
        onSaved={() => {
          setGroupDialog(false)
          state.reload()
        }}
      />

      <QuestionDialog
        group={questionFor}
        onOpenChange={(open) => !open && setQuestionFor(null)}
        onSaved={() => {
          setQuestionFor(null)
          state.reload()
        }}
      />

      <ConfirmDialog
        open={Boolean(removeGroup)}
        onOpenChange={(open) => !open && setRemoveGroup(null)}
        title="Remove this question group?"
        description={
          removeGroup
            ? `"${removeGroup.title}" and its ${pluralize(removeGroup.questions.length, 'question')} will stop being sent to participants. Answers already collected are kept.`
            : ''
        }
        confirmLabel="Remove group"
        destructive
        loading={busy}
        onConfirm={confirmRemoveGroup}
      />
    </div>
  )
}

function GroupDialog({
  open,
  onOpenChange,
  studyId,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyId: string
  onSaved: () => void
}) {
  const toast = useToast()
  const [templateName, setTemplateName] = React.useState<string>()

  const form = useForm({
    initialValues: { title: '' },
    rules: { title: required('Title') },
  })

  React.useEffect(() => {
    if (!open) return
    form.reset({ title: '' })
    setTemplateName(undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const templateError =
    form.submitAttempted && !templateName ? 'Choose a template to base the group on' : undefined

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const result = await form.submit()
    if (!result.ok || !templateName) return
    await notificationsApi.createGroup({ studyId, title: form.values.title, templateName })
    toast.success('Question group added')
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Add a question group</DialogTitle>
            <DialogDescription>
              Groups keep related check-in questions together so participants see them as one
              prompt.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5">
            <FormField id="group-title" label="Title" error={form.errors.title} required>
              {(aria) => <Input {...aria} {...form.field('title')} placeholder="Notifications" />}
            </FormField>

            <FormField
              id="group-template"
              label="Based on template"
              hint="Templates carry standard question wording."
              error={templateError}
              required
            >
              {(aria) => (
                <Combobox
                  {...aria}
                  options={NOTIFICATION_TEMPLATES.map((t) => ({ value: t, label: t }))}
                  value={templateName}
                  onChange={setTemplateName}
                  placeholder="Select a template"
                  searchPlaceholder="Search templates"
                />
              )}
            </FormField>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" loading={form.submitting}>
              Add group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function QuestionDialog({
  group,
  onOpenChange,
  onSaved,
}: {
  group: NotificationGroup | null
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const toast = useToast()

  const form = useForm({
    initialValues: {
      text: '',
      cadence: 'Daily' as NotificationCadence,
      responseType: 'Y/N' as NotificationResponseType,
    },
    rules: { text: required('Question') },
    onSubmit: async (values) => {
      if (!group) return
      await notificationsApi.addQuestion(group.id, {
        text: values.text,
        cadence: values.cadence,
        responseType: values.responseType,
      })
      toast.success('Question added')
      onSaved()
    },
  })

  React.useEffect(() => {
    if (group) form.reset({ text: '', cadence: 'Daily', responseType: 'Y/N' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group])

  return (
    <Dialog open={Boolean(group)} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={form.submit} noValidate>
          <DialogHeader>
            <DialogTitle>Add a check-in question</DialogTitle>
            <DialogDescription>
              {group ? `Added to “${group.title}”.` : ''} Keep it to one thing a participant can
              answer in a few seconds.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5">
            <FormField id="question-text" label="Question" error={form.errors.text} required>
              {(aria) => (
                <Textarea
                  {...aria}
                  {...form.field('text')}
                  rows={2}
                  placeholder="Did you take your study medication today?"
                />
              )}
            </FormField>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField id="question-cadence" label="How often">
                {(aria) => <Select {...aria} {...form.field('cadence')} options={CADENCES} />}
              </FormField>
              <FormField id="question-response" label="Answer type">
                {(aria) => (
                  <Select {...aria} {...form.field('responseType')} options={RESPONSE_TYPES} />
                )}
              </FormField>
            </div>
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
