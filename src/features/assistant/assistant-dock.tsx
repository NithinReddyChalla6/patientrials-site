import * as React from 'react'
import { useLocation } from 'react-router-dom'
import { Bot, Send, Sparkles, X } from 'lucide-react'
import { siteApi, studiesApi, subjectsApi, ApiError } from '@/data/api'
import { ask, siteSummary, studySummary, type ChatTurn } from '@/data/assistant'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useAuth } from '@/features/auth/auth-context'

/** Openers, so the first thing on screen is not an empty box. */
const STARTERS_SITE = ['Which studies are recruiting?', 'Which study is furthest behind?']
const STARTERS_STUDY = ['How is recruitment going?', 'How far off the target are we?']

/** The study the URL is inside, if any — the same rule the sidebar uses. */
function studyIdFrom(pathname: string): string | undefined {
  const [, section, id] = pathname.split('/')
  if (section !== 'studies' || !id || id === 'new') return undefined
  return id
}

function Bubble({ turn }: { turn: ChatTurn }) {
  const mine = turn.role === 'user'
  return (
    <li className={mine ? 'flex justify-end' : 'flex gap-2'}>
      {!mine && (
        <span
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"
          aria-hidden="true"
        >
          <Bot className="size-3.5" />
        </span>
      )}
      <div
        className={
          mine
            ? 'max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-3 py-2 text-sm text-brand-foreground'
            : 'max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2 text-sm text-foreground'
        }
      >
        <p className="whitespace-pre-wrap">{turn.content}</p>
      </div>
    </li>
  )
}

/**
 * The assistant, reachable from anywhere.
 *
 * A docked panel rather than a page, because the question a coordinator wants
 * to ask arrives while they are in the middle of something else. Making it a
 * destination means leaving whatever you were doing to get to it, which is
 * enough friction that the question goes unasked.
 *
 * What it can see follows where you are: inside a study it reads that study,
 * elsewhere it reads the site's list of studies. Counts and status only —
 * never a participant's name or contact details.
 */
export function AssistantDock() {
  const { pathname } = useLocation()
  const { session } = useAuth()
  const studyId = studyIdFrom(pathname)

  const [open, setOpen] = React.useState(false)
  const [turns, setTurns] = React.useState<ChatTurn[]>([])
  const [draft, setDraft] = React.useState('')
  const [thinking, setThinking] = React.useState(false)
  const [error, setError] = React.useState<string>()
  const endRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  React.useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns, thinking])

  // Escape closes it and hands focus back, the way every other overlay here does.
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  /**
   * Built at send time, not on open. The panel stays open while you navigate,
   * so what it should be looking at is whatever is on screen when you ask.
   */
  async function contextNow(): Promise<string> {
    try {
      // Staff, so an investigator can be named rather than left as an id.
      const staff = await siteApi.listCollaborators()
      const names = new Map(staff.map((m) => [m.id, `${m.firstName} ${m.lastName}`]))

      if (studyId) {
        const [study, page] = await Promise.all([
          studiesApi.get(studyId),
          subjectsApi.list({ studyId, status: 'all', page: 1, pageSize: 200 }),
        ])
        return studySummary(
          study,
          page.items,
          study.principalInvestigatorId ? names.get(study.principalInvestigatorId) : undefined,
        )
      }
      const studies = await studiesApi.list({ status: 'all', page: 1, pageSize: 50 })
      return siteSummary(studies.items, names)
    } catch {
      // A question is still worth answering without the numbers; the assistant
      // is told to say when it cannot see something.
      return 'No study data could be loaded right now.'
    }
  }

  async function send(text: string) {
    const message = text.trim()
    if (!message || thinking) return

    setError(undefined)
    setDraft('')
    const next: ChatTurn[] = [...turns, { role: 'user', content: message }]
    setTurns(next)
    setThinking(true)

    try {
      const reply = await ask(next, await contextNow())
      setTurns([...next, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The assistant could not answer.')
    } finally {
      setThinking(false)
    }
  }

  const firstName = session?.user.firstName ?? 'there'
  const starters = studyId ? STARTERS_STUDY : STARTERS_SITE

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close the assistant' : 'Open the assistant'}
        className="fixed bottom-5 right-5 z-40 flex size-12 items-center justify-center rounded-full bg-brand text-brand-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Sparkles className="size-5" aria-hidden="true" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Assistant"
          className="fixed bottom-20 right-5 z-40 flex h-[min(32rem,calc(100dvh-7rem))] w-[min(24rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border border-border bg-sunken shadow-2xl"
        >
          <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
            <span
              className="flex size-7 items-center justify-center rounded-full bg-brand/10 text-brand"
              aria-hidden="true"
            >
              <Bot className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Assistant</p>
              <p className="truncate text-xs text-muted-foreground">
                {studyId ? `Looking at ${studyId}` : 'Looking at your studies'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setOpen(false)
                triggerRef.current?.focus()
              }}
              aria-label="Close the assistant"
            >
              <X aria-hidden="true" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {turns.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-2 text-center">
                <p className="text-sm font-medium text-foreground">Hello {firstName}</p>
                <p className="text-xs text-muted-foreground">
                  Ask about {studyId ? `study ${studyId}` : 'your studies'}. I can read the numbers,
                  not change them.
                </p>
                <ul className="mt-1 flex flex-col gap-2">
                  {starters.map((s) => (
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
              <ul className="space-y-3">
                {turns.map((turn, i) => (
                  <Bubble key={`${turn.role}-${i}`} turn={turn} />
                ))}
                {thinking && (
                  <li className="flex gap-2">
                    <span
                      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand"
                      aria-hidden="true"
                    >
                      <Bot className="size-3.5" />
                    </span>
                    <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-3 py-2.5">
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

          <div className="border-t border-border bg-card p-2.5">
            {error && (
              <div className="mb-2">
                <Alert tone="error" title="Could not answer">
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
              <label htmlFor="assistant-dock-input" className="sr-only">
                Ask the assistant
              </label>
              <Textarea
                id="assistant-dock-input"
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                // Enter sends, shift+enter breaks the line — what every chat
                // does, and what a coordinator's hands already expect.
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send(draft)
                  }
                }}
                rows={1}
                placeholder="Ask a question…"
                className="min-h-10 flex-1 resize-none text-sm"
              />
              <Button type="submit" variant="brand" size="icon" disabled={!draft.trim() || thinking}>
                <Send aria-hidden="true" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
