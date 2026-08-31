import * as React from 'react'
import { Plus, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RecordList, type RecordListItem } from '@/components/patterns/record-list'

interface SectionShellProps {
  /** Singular noun for the record, e.g. "past trial". */
  noun: string
  title: string
  description: string
  icon: LucideIcon
  items: RecordListItem[]
  onRemove: (id: string) => void
  removingId?: string
  emptyTitle: string
  emptyDescription: string
  /**
   * The add / edit form. `close` collapses the panel; `editingId` is the id of
   * the record being edited, or null when adding a new one.
   */
  children: (close: () => void, editingId: string | null) => React.ReactNode
}

/**
 * Shared shell for the five repeatable onboarding sections.
 *
 * What you have entered leads; the form is summoned when you want to add to it,
 * opening automatically while the section is still empty. Clicking a record
 * opens the same panel pre-filled to edit it, so a mistake can be corrected
 * rather than deleted and re-entered.
 */
export function SectionShell({
  noun,
  title,
  description,
  icon,
  items,
  onRemove,
  removingId,
  emptyTitle,
  emptyDescription,
  children,
}: SectionShellProps) {
  const [open, setOpen] = React.useState(items.length === 0)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const panelRef = React.useRef<HTMLDivElement>(null)
  const addButtonRef = React.useRef<HTMLButtonElement>(null)

  // Open the form for a section that has nothing in it yet, so the first-run
  // path is one fewer click.
  const hadItems = React.useRef(items.length > 0)
  React.useEffect(() => {
    if (items.length === 0 && hadItems.current) {
      setOpen(true)
      setEditingId(null)
    }
    hadItems.current = items.length > 0
  }, [items.length])

  function focusPanel() {
    window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>('input, select, button, textarea')?.focus()
    })
  }

  function openForAdd() {
    setEditingId(null)
    setOpen(true)
    focusPanel()
  }

  function openForEdit(id: string) {
    setEditingId(id)
    setOpen(true)
    window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      panelRef.current?.querySelector<HTMLElement>('input, select, button, textarea')?.focus()
    })
  }

  function closePanel() {
    setOpen(false)
    setEditingId(null)
    addButtonRef.current?.focus()
  }

  const editing = editingId != null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {items.length === 0 ? `No ${noun}s added` : `${items.length} added`}
        </h3>
        {!open && (
          <Button ref={addButtonRef} variant="outline" size="sm" onClick={openForAdd}>
            <Plus aria-hidden="true" />
            Add {noun}
          </Button>
        )}
      </div>

      <RecordList
        label={`${title} added`}
        items={items}
        emptyIcon={icon}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        onSelect={openForEdit}
        selectLabel={(item) => `Edit ${item.title}`}
        onRemove={onRemove}
        busyId={removingId}
      />

      {open && (
        <div
          ref={panelRef}
          className="rounded-lg border border-border bg-card p-5 shadow-sm"
          aria-label={editing ? `Edit ${noun}` : `Add ${noun}`}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <h3 className="text-sm font-semibold text-foreground">
              {editing ? `Edit ${noun}` : `Add ${noun}`}
            </h3>
            {(items.length > 0 || editing) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={closePanel}
                aria-label={editing ? `Cancel editing ${noun}` : `Cancel adding ${noun}`}
              >
                <X aria-hidden="true" />
              </Button>
            )}
          </div>
          {children(closePanel, editingId)}
        </div>
      )}
    </div>
  )
}

/** Consistent footer for the add / edit forms inside a SectionShell. */
export function AddFormActions({
  noun,
  editing,
  submitting,
  onCancel,
  canCancel,
}: {
  noun: string
  editing?: boolean
  submitting: boolean
  onCancel: () => void
  canCancel: boolean
}) {
  return (
    <div className="mt-6 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
      {canCancel && (
        <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      )}
      <Button type="submit" variant="brand" loading={submitting}>
        {editing ? 'Save changes' : `Save ${noun}`}
      </Button>
    </div>
  )
}
