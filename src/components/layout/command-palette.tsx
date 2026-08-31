import * as React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useNavigate } from 'react-router-dom'
import {
  ClipboardList,
  CornerDownLeft,
  FileText,
  FlaskConical,
  Inbox,
  Plus,
  Search,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { searchApi, type SearchHit } from '@/data/api'
import { cn } from '@/lib/cn'
import { Spinner } from '@/components/ui/spinner'
import { useAuth } from '@/features/auth/auth-context'
import { NAV_ITEMS } from './nav-config'

interface Item {
  id: string
  label: string
  hint?: string
  icon: LucideIcon
  group: string
  run: () => void
}

const KIND_ICON: Record<SearchHit['kind'], LucideIcon> = {
  study: FlaskConical,
  participant: Users,
  form: FileText,
  request: Inbox,
}

const KIND_GROUP: Record<SearchHit['kind'], string> = {
  study: 'Studies',
  participant: 'Participants',
  form: 'Forms & surveys',
  request: 'Study requests',
}

/**
 * Command palette.
 *
 * A console with a dozen destinations and hundreds of records is faster to
 * drive from the keyboard than from the mouse, and this is how people expect to
 * do it. One query reaches every study, participant, form and request, plus the
 * actions worth having a shortcut to.
 *
 * Opens on Cmd/Ctrl+K anywhere, and from the search affordance in the header.
 */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const navigate = useNavigate()
  const { can } = useAuth()
  const [query, setQuery] = React.useState('')
  const [hits, setHits] = React.useState<SearchHit[]>([])
  const [searching, setSearching] = React.useState(false)
  const [active, setActive] = React.useState(0)
  const listRef = React.useRef<HTMLDivElement>(null)
  const listId = React.useId()

  React.useEffect(() => {
    if (!open) {
      setQuery('')
      setHits([])
      setActive(0)
    }
  }, [open])

  // Debounced record search; navigation and actions filter locally and instantly.
  React.useEffect(() => {
    const q = query.trim()
    if (!q) {
      setHits([])
      setSearching(false)
      return
    }
    setSearching(true)
    let cancelled = false
    const timer = window.setTimeout(() => {
      searchApi
        .global(q)
        .then((results) => !cancelled && setHits(results))
        .catch(() => !cancelled && setHits([]))
        .finally(() => !cancelled && setSearching(false))
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  const go = React.useCallback(
    (to: string) => {
      onOpenChange(false)
      navigate(to)
    },
    [navigate, onOpenChange],
  )

  const items = React.useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase()

    const actions: Item[] = [
      can('study.create') && {
        id: 'action-create-study',
        label: 'Create study',
        hint: 'From an NCT number',
        icon: Plus,
        group: 'Actions',
        run: () => go('/studies/new'),
      },
      can('form.create') && {
        id: 'action-create-form',
        label: 'Create form',
        icon: Plus,
        group: 'Actions',
        run: () => go('/forms/new'),
      },
      can('form.create') && {
        id: 'action-create-survey',
        label: 'Create survey',
        icon: ClipboardList,
        group: 'Actions',
        run: () => go('/surveys/new'),
      },
    ].filter(Boolean) as Item[]

    const destinations: Item[] = NAV_ITEMS.filter(
      (item) => !item.permission || can(item.permission),
    ).map((item) => ({
      id: `nav-${item.to}`,
      label: item.label,
      icon: item.icon,
      group: 'Go to',
      run: () => go(item.to),
    }))

    const records: Item[] = hits.map((hit) => ({
      id: `${hit.kind}-${hit.id}`,
      label: hit.title,
      hint: hit.subtitle,
      icon: KIND_ICON[hit.kind],
      group: KIND_GROUP[hit.kind],
      run: () => go(hit.to),
    }))

    const local = [...actions, ...destinations].filter(
      (item) => !q || item.label.toLowerCase().includes(q),
    )

    return q ? [...records, ...local] : [...destinations, ...actions]
  }, [query, hits, can, go])

  React.useEffect(() => setActive(0), [items.length])

  React.useEffect(() => {
    if (!open) return
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (items.length === 0 ? 0 : (i + 1) % items.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      items[active]?.run()
    }
  }

  // Group while preserving order, so the list reads in the order it is arrowed.
  const groups: { name: string; items: { item: Item; index: number }[] }[] = []
  items.forEach((item, index) => {
    const last = groups[groups.length - 1]
    if (last?.name === item.group) last.items.push({ item, index })
    else groups.push({ name: item.group, items: [{ item, index }] })
  })

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-foreground/30 data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
        <Dialog.Content
          className="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover shadow-lg data-[state=open]:animate-slide-up data-[state=closed]:animate-fade-out"
          aria-label="Command palette"
        >
          <Dialog.Title className="sr-only">Search and commands</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search studies, participants, forms and requests, or jump to a screen.
          </Dialog.Description>

          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search studies, participants, forms…"
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={items.length > 0 ? `${listId}-${active}` : undefined}
            />
            {searching && <Spinner label="Searching" />}
          </div>

          <div
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label="Results"
            className="max-h-[60vh] overflow-y-auto p-2"
          >
            {items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {query.trim()
                  ? `Nothing matches “${query.trim()}”.`
                  : 'Start typing to search.'}
              </p>
            ) : (
              groups.map((group) => (
                <div key={`${group.name}-${group.items[0].index}`} className="mb-1 last:mb-0">
                  <p className="px-2 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {group.name}
                  </p>
                  {group.items.map(({ item, index }) => (
                    <div
                      key={item.id}
                      id={`${listId}-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={index === active}
                      onClick={item.run}
                      onMouseEnter={() => setActive(index)}
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm',
                        index === active ? 'bg-accent text-accent-foreground' : 'text-foreground',
                      )}
                    >
                      <item.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.hint && (
                        <span className="hidden shrink-0 truncate text-xs text-muted-foreground sm:block">
                          {item.hint}
                        </span>
                      )}
                      {index === active && (
                        <CornerDownLeft
                          className="size-3.5 shrink-0 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-border bg-sunken px-3 py-2 text-xs text-muted-foreground">
            <Hint keys="↑ ↓" label="Navigate" />
            <Hint keys="↵" label="Open" />
            <Hint keys="Esc" label="Close" />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-sans text-[0.6875rem] text-foreground">
        {keys}
      </kbd>
      {label}
    </span>
  )
}

/** Registers the global Cmd/Ctrl+K shortcut. */
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return { open, setOpen }
}
