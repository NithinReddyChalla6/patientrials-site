import * as React from 'react'
import { Bot, Send, Sparkles, UserRound } from 'lucide-react'
import { subjectsApi, ApiError } from '@/data/api'
import { ask, studySummary, type ChatTurn } from '@/data/assistant'
import { useAsync } from '@/lib/use-async'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { InferredNotice } from '@/components/patterns/inferred-notice'
import { useAuth } from '@/features/auth/auth-context'
import { useStudy } from './study-layout'

/** Openers, so the first thing on screen is not an empty box. */
const STARTERS = [
  'How is recruitment going?',
  'How far are we from the enrolment target?',
  'Give me a quick summary of this study',
]

function Bubble({ turn }: { turn: ChatTurn }) {
  const mine = turn.role === 'user'
  return (
    <li className={mine ? 'flex justify-end' : 'flex gap-3'}>
      {!mine && (
        <span
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"
          aria-hidden="true"
        >
          <Bot className="size-4" />
        </span>
      )}
      <div
        className={
          mine
            ? 'max-w-[80%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm text-brand-foreground'
            : 'max-w-[80%] rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-2.5 text-sm text-foreground'
        }
      >
        <p className="whitespace-pre-wrap">{turn.content}</p>
      </div>
      {mine && (
        <span
          className="mt-0.5 ml-3 flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground"
          aria-hidden="true"
        >
          <UserRound className="size-4" />
        </span>
      )}
    </li>
  )
}

/**
 * A conversation about the study you are looking at.
 *
 * It answers from a written summary of this study, assembled in the browser and
 * sent with the question — counts, targets and status, never names or contact
 * details. A coordinator asking "how is recruitment going" needs the numbers,
 * and every field left out of that summary is one that never leaves here.
 *
 * The reply is talk, not action. It can read and explain; it cannot change a
 * record, and it is told to say so rather than imply otherwise.
 */
export function AssistantTab() {
  const { study } = useStudy()
  const { session } = useAuth()
  const [turns, setTurns] = React.useState<ChatTurn[]>([])
  const [draft, setDraft] = React.useState('')
  const [thinking, setThinking] = React.useState(false)
  const [error, setError] = React.useState<string>()
  const endRef = React.useRef<HTMLDivElement>(null)

  const people = useAsync(
    () => subjectsApi.list({ studyId: study.id, status: 'all', page: 1, pageSize: 200 }),
    [study.id],
  )

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns, thinking])

  async function send(text: string) {
    const message = text.trim()
    if (!message || thinking) return

    setError(undefined)
    setDraft('')
    const next: ChatTurn[] = [...turns, { role: 'user', content: message }]
    setTurns(next)
    setThinking(true)

    try {
      const context = studySummary(study, people.data?.items ?? [])
      const reply = await ask(next, context)
      setTurns([...next, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The assistant could not answer.')
    } finally {
      setThinking(false)
    }
  }

  const firstName = session?.user.firstName ?? 'there'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Assistant</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Ask about this study in plain English — how recruitment is going, how far off the target
          you are, what the numbers mean.
        </p>
      </div>

      <InferredNotice>
        It reads a summary of this study — counts, target, status — never participant names or
        contact details. It can explain what it sees; it cannot change anything, and it is told to
        say when it does not know rather than guess.
      </InferredNotice>

      <div className="flex min-h-[24rem] flex-col rounded-lg border border-border bg-sunken">
        <div className="flex-1 overflow-y-auto p-4">
          {turns.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
              <span
                className="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brand"
                aria-hidden="true"
              >
                <Sparkles className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Hello {firstName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ask me anything about {study.id}, or start with one of these.
                </p>
              </div>
              <ul className="flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => void send(s)}
                      className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-brand/40 hover:bg-accent/30"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="space-y-4">
              {turns.map((turn, i) => (
                <Bubble key={`${turn.role}-${i}`} turn={turn} />
              ))}
              {thinking && (
                <li className="flex gap-3">
                  <span
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"
                    aria-hidden="true"
                  >
                    <Bot className="size-4" />
                  </span>
                  <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3">
                    <span className="sr-only">Thinking</span>
                    <span className="flex gap-1" aria-hidden="true">
                      <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground" />
                      <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:150ms]" />
                      <span className="size-1.5 animate-pulse rounded-full bg-muted-foreground [animation-delay:300ms]" />
                    </span>
                  </div>
                </li>
              )}
            </ul>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-3">
          {error && (
            <div className="mb-3">
              <Alert tone="error" title="The assistant could not answer">
                {error}
              </Alert>
            </div>
          )}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void send(draft)
            }}
          >
            <label htmlFor="assistant-input" className="sr-only">
              Ask about this study
            </label>
            <Textarea
              id="assistant-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              // Enter sends, shift+enter breaks the line — what every chat does,
              // and what a coordinator's hands already expect.
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send(draft)
                }
              }}
              rows={1}
              placeholder="Ask about this study…"
              className="min-h-11 flex-1 resize-none"
            />
            <Button type="submit" variant="brand" disabled={!draft.trim() || thinking}>
              <Send aria-hidden="true" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
