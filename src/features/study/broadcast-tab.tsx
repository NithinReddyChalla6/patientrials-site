import * as React from 'react'
import { Megaphone, Send, Users } from 'lucide-react'
import { broadcastsApi, ApiError } from '@/data/api'
import type { BroadcastMessage, SubjectStatus } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { formatRelative } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
 * Who a message goes to.
 *
 * Chosen as a rule rather than by ticking names. A study's participants move
 * between statuses every day, so "everyone recruited" is both quicker to pick
 * and still true when someone reads the sent message months later.
 */
const AUDIENCES: { value: SubjectStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Everyone on this study' },
  { value: 'recruited', label: 'Recruited participants' },
  { value: 'prescreened', label: 'Pre-screened, awaiting a decision' },
  { value: 'validated', label: 'Validated, awaiting a decision' },
  { value: 'pending', label: 'New, awaiting screening' },
]

function audienceLabel(value: BroadcastMessage['audience']) {
  return AUDIENCES.find((a) => a.value === value)?.label ?? value
}

/**
 * Messages sent to several participants at once.
 *
 * The legacy portal offered a free-text send with no record of what had gone
 * out, so nobody could answer "what were they told, and when". Every send is
 * kept here with the audience rule and the number it reached, which is the pair
 * a monitor asks for.
 */
export function BroadcastTab() {
  const { study } = useStudy()
  const { session, can } = useAuth()
  const toast = useToast()
  const canSend = can('broadcast.send')

  const state = useAsync(() => broadcastsApi.list(study.id), [study.id])

  const [subject, setSubject] = React.useState('')
  const [body, setBody] = React.useState('')
  const [audience, setAudience] = React.useState<SubjectStatus | 'all'>('recruited')
  const [error, setError] = React.useState<string>()
  const [sending, setSending] = React.useState(false)

  // Shown before sending, because "this reaches 14 people" is the one fact that
  // changes whether the wording is right.
  const size = useAsync(() => broadcastsApi.audienceSize(study.id, audience), [study.id, audience])

  async function send() {
    setError(undefined)
    setSending(true)
    try {
      await broadcastsApi.send({
        studyId: study.id,
        subject,
        body,
        audience,
        sentBy: session ? `${session.user.firstName} ${session.user.lastName}` : 'Study team',
      })
      toast.success('Message sent')
      setSubject('')
      setBody('')
      state.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not send this message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <AsyncBoundary
      state={state}
      loading={
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-56" />
        </div>
      }
      errorTitle="We could not load the messages for this study"
    >
      {(messages) => (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Broadcast message</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              One message to a group of participants on this study — a visit reminder, a change of
              schedule, a thank you after a milestone.
            </p>
          </div>

          <InferredNotice>
            The legacy portal sent these but kept no record of them. Each send is stored here with
            the audience it went to and the number it reached, so what participants were told is
            answerable later.
          </InferredNotice>

          {canSend && (
            <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Write a message</h3>

              <div className="mt-4 space-y-4">
                {error && (
                  <Alert tone="error" title="We could not send this message">
                    {error}
                  </Alert>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Combobox, not Select: the stored value is a status code and
                      the reader needs a sentence, and Select cannot carry both. */}
                  <FormField id="broadcastAudience" label="Who it goes to" required>
                    {(aria) => (
                      <Combobox
                        {...aria}
                        options={AUDIENCES.map((a) => ({ value: a.value, label: a.label }))}
                        value={audience}
                        onChange={(value) => setAudience((value as SubjectStatus | 'all') ?? 'all')}
                        clearable={false}
                        placeholder="Choose an audience"
                        searchPlaceholder="Search audiences"
                      />
                    )}
                  </FormField>

                  <div className="flex items-end">
                    <p className="flex items-center gap-2 pb-2 text-sm text-muted-foreground">
                      <Users className="size-4" aria-hidden="true" />
                      {size.data === undefined
                        ? 'Counting recipients'
                        : size.data === 1
                          ? 'Reaches 1 participant'
                          : `Reaches ${size.data} participants`}
                    </p>
                  </div>
                </div>

                <FormField
                  id="broadcastSubject"
                  label="Subject line"
                  hint="What participants see before they open it."
                  required
                >
                  {(aria) => (
                    <Input
                      {...aria}
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Your next visit and what to bring"
                    />
                  )}
                </FormField>

                <FormField id="broadcastBody" label="Message" required>
                  {(aria) => (
                    <Textarea
                      {...aria}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={4}
                    />
                  )}
                </FormField>

                <div className="flex justify-end border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="brand"
                    onClick={send}
                    loading={sending}
                    disabled={size.data === 0}
                  >
                    <Send aria-hidden="true" />
                    Send message
                  </Button>
                </div>
              </div>
            </div>
          )}

          <section>
            <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {messages.length === 0 ? 'Nothing sent yet' : `${messages.length} sent`}
            </h3>

            {messages.length === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-border bg-card">
                <EmptyState
                  compact
                  icon={Megaphone}
                  title="No messages sent"
                  description="Messages you send to participants on this study are listed here."
                />
              </div>
            ) : (
              <ul className="mt-3 space-y-3">
                {messages.map((message) => (
                  <li
                    key={message.id}
                    className="rounded-lg border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{message.subject}</p>
                      <Badge tone="neutral">
                        {message.recipientCount === 1
                          ? '1 recipient'
                          : `${message.recipientCount} recipients`}
                      </Badge>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                      {message.body}
                    </p>
                    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{audienceLabel(message.audience)}</span>
                      <span>Sent by {message.sentBy}</span>
                      <span>{formatRelative(message.sentAt)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AsyncBoundary>
  )
}
