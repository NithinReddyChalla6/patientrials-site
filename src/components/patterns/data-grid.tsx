import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import {
  ArrowDownUp,
  ArrowDown,
  ArrowUp,
  Columns3,
  Download,
  Rows2,
  Rows3,
  Rows4,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Checkbox, CheckboxField } from '@/components/ui/checkbox'
import { formatCount } from '@/lib/format'

export interface GridColumn<T> {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  /** Plain value for sorting and CSV export. Falls back to no sort/export. */
  value?: (row: T) => string | number
  sortable?: boolean
  align?: 'left' | 'right'
  /** CSS grid track, e.g. "minmax(0,2fr)" or "9rem". */
  width?: string
  /** Leads the stacked card view below 768px. */
  primary?: boolean
  hideOnCard?: boolean
  /** Hidden until switched on in the column picker. */
  defaultHidden?: boolean
}

type Density = 'condensed' | 'regular' | 'relaxed'

const DENSITY: Record<Density, { label: string; row: string; icon: typeof Rows2 }> = {
  condensed: { label: 'Condensed', row: 'h-10', icon: Rows4 },
  regular: { label: 'Regular', row: 'h-12', icon: Rows3 },
  relaxed: { label: 'Relaxed', row: 'h-14', icon: Rows2 },
}

interface DataGridProps<T> {
  /** Accessible name for the table — required, never decorative. */
  caption: string
  columns: GridColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowActivate?: (row: T) => void
  /** Turns on the checkbox column and the bulk action bar. */
  selectable?: boolean
  /** Rendered in the bulk bar once rows are selected. */
  bulkActions?: (selected: T[], clearSelection: () => void) => React.ReactNode
  rowActions?: (row: T) => React.ReactNode
  /** Enables CSV export; also used as the download filename. */
  exportName?: string
  /** Search and filters supplied by the page, rendered in the toolbar strip. */
  toolbar?: React.ReactNode
  footer?: React.ReactNode
  storageKey?: string
  className?: string
  /** Row the keyboard is on, drawn with a focus ring. */
  activeRowKey?: string
  /** Lets a page drive selection from keyboard shortcuts. */
  onSelectionChange?: (keys: string[]) => void
}

/**
 * Enterprise data grid.
 *
 * The pattern the rest of this industry settled on, and which the previous
 * table did not implement: a toolbar strip bonded to the grid, sortable column
 * headers, row selection that reveals a bulk action bar, a density control
 * (40 / 48 / 56px rows), column visibility, CSV export, and a header that stays
 * put while the body scrolls.
 *
 * Below 768px the grid becomes stacked cards rather than scrolling sideways,
 * because the columns a coordinator needs are the ones that fall off the right
 * edge first.
 */
export function DataGrid<T>({
  caption,
  columns,
  rows,
  rowKey,
  onRowActivate,
  selectable,
  bulkActions,
  rowActions,
  exportName,
  toolbar,
  footer,
  storageKey,
  className,
  activeRowKey,
  onSelectionChange,
}: DataGridProps<T>) {
  const [density, setDensity] = usePersisted<Density>(`${storageKey}:density`, 'regular')
  const [hidden, setHidden] = usePersisted<string[]>(
    `${storageKey}:hidden`,
    columns.filter((c) => c.defaultHidden).map((c) => c.key),
  )
  const [sort, setSort] = React.useState<{ key: string; dir: 'asc' | 'desc' } | null>(null)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  const visible = columns.filter((c) => !hidden.includes(c.key))
  const primary = visible.find((c) => c.primary) ?? visible[0]

  // Selection is scoped to what is on screen; paging away drops it rather than
  // silently acting on rows the user can no longer see.
  const pageKeys = React.useMemo(() => rows.map(rowKey), [rows, rowKey])
  React.useEffect(() => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((k) => pageKeys.includes(k)))
      return next.size === prev.size ? prev : next
    })
  }, [pageKeys])

  const sorted = React.useMemo(() => {
    if (!sort) return rows
    const column = columns.find((c) => c.key === sort.key)
    if (!column?.value) return rows
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = column.value!(a)
      const bv = column.value!(b)
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * factor
    })
  }, [rows, sort, columns])

  const changeSelection = React.useCallback(
    (next: Set<string>) => {
      setSelected(next)
      onSelectionChange?.([...next])
    },
    [onSelectionChange],
  )

  const selectedRows = sorted.filter((r) => selected.has(rowKey(r)))
  const allSelected = sorted.length > 0 && selected.size === sorted.length
  const someSelected = selected.size > 0 && !allSelected

  function toggleSort(column: GridColumn<T>) {
    if (!column.sortable || !column.value) return
    setSort((prev) =>
      prev?.key !== column.key
        ? { key: column.key, dir: 'asc' }
        : prev.dir === 'asc'
          ? { key: column.key, dir: 'desc' }
          : null,
    )
  }

  function toggleRow(key: string, checked: boolean) {
    const next = new Set(selected)
    if (checked) next.add(key)
    else next.delete(key)
    changeSelection(next)
  }

  const gridTemplate = [
    selectable ? '2.5rem' : null,
    ...visible.map((c) => c.width ?? 'minmax(8rem,1fr)'),
    rowActions ? 'auto' : null,
  ]
    .filter(Boolean)
    .join(' ')

  // Enough width that every visible column keeps a usable measure; past this the
  // grid scrolls rather than crushing columns to unreadable slivers.
  const minWidth = `${visible.length * 8 + (selectable ? 2.5 : 0)}rem`

  return (
    <div className={cn('rounded-lg border border-border bg-card', className)}>
      {/* Toolbar strip, bonded to the grid it controls */}
      <div className="flex flex-col gap-2 border-b border-border p-2 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">{toolbar}</div>
        <div className="flex shrink-0 items-center gap-1">
          <DensityMenu value={density} onChange={setDensity} />
          <ColumnMenu columns={columns} hidden={hidden} onChange={setHidden} />
          {exportName && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadCsv(exportName, visible, sorted)}
              disabled={sorted.length === 0}
            >
              <Download aria-hidden="true" />
              <span className="hidden lg:inline">Export</span>
            </Button>
          )}
        </div>
      </div>

      {/* Bulk action bar — only once a selection exists */}
      {selectable && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-brand/20 bg-accent px-3 py-2">
          <p className="text-sm font-medium text-accent-foreground" aria-live="polite">
            {formatCount(selected.size)} selected
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {bulkActions?.(selectedRows, () => changeSelection(new Set()))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => changeSelection(new Set())}
          >
            <X aria-hidden="true" />
            Clear
          </Button>
        </div>
      )}

      {/* Grid — desktop. Scrolls within itself so the page never does. */}
      <div className="hidden overflow-x-auto md:block">
        <div
          role="table"
          aria-label={caption}
          aria-rowcount={sorted.length + 1}
          className="min-w-full"
          style={{ minWidth: minWidth }}
        >
          <div
            role="row"
            className="sticky top-0 z-10 grid items-center gap-3 border-b border-border bg-sunken px-3"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {selectable && (
              <span role="columnheader" className="flex items-center">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={(checked) =>
                    changeSelection(checked === true ? new Set(pageKeys) : new Set())
                  }
                  aria-label={allSelected ? 'Clear selection' : `Select all ${sorted.length} rows`}
                />
              </span>
            )}

            {visible.map((column) => {
              const active = sort?.key === column.key
              const canSort = Boolean(column.sortable && column.value)
              const Icon = !active ? ArrowDownUp : sort.dir === 'asc' ? ArrowUp : ArrowDown
              return (
                <span
                  key={column.key}
                  role="columnheader"
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                  className={cn('min-w-0 overflow-hidden py-2', column.align === 'right' && 'text-right')}
                >
                  {canSort ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className={cn(
                        'inline-flex min-h-8 w-full max-w-full items-center gap-1 rounded px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] transition-colors',
                        column.align === 'right' ? 'justify-end' : 'justify-start',
                        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span className="truncate">{column.header}</span>
                      <Icon
                        className={cn('size-3 shrink-0', !active && 'opacity-40')}
                        aria-hidden="true"
                      />
                    </button>
                  ) : (
                    <span className="block truncate px-1 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                      {column.header}
                    </span>
                  )}
                </span>
              )
            })}

            {rowActions && (
              <span role="columnheader" className="py-2">
                <span className="sr-only">Actions</span>
              </span>
            )}
          </div>

          <div role="rowgroup" className="divide-y divide-border">
            {sorted.map((row) => {
              const key = rowKey(row)
              const isSelected = selected.has(key)
              return (
                <div
                  key={key}
                  role="row"
                  aria-selected={selectable ? isSelected : undefined}
                  onClick={onRowActivate ? () => onRowActivate(row) : undefined}
                  className={cn(
                    'group relative grid items-center gap-3 px-3 text-sm transition-colors',
                    DENSITY[density].row,
                    isSelected ? 'bg-accent/60' : 'hover:bg-sunken/70',
                    onRowActivate && 'cursor-pointer',
                    key === activeRowKey &&
                      'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-brand after:pointer-events-none after:absolute after:inset-0 after:ring-2 after:ring-inset after:ring-ring/40',
                  )}
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  {selectable && (
                    <span
                      role="cell"
                      className="flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleRow(key, checked === true)}
                        aria-label={`Select row ${key}`}
                        className={cn(
                          'transition-opacity',
                          !isSelected && 'opacity-0 group-hover:opacity-100 focus:opacity-100',
                        )}
                      />
                    </span>
                  )}

                  {visible.map((column) => (
                    <span
                      key={column.key}
                      role="cell"
                      className={cn(
                        'min-w-0 truncate text-foreground',
                        column.align === 'right' && 'text-right tabular-nums',
                      )}
                    >
                      {column.cell(row)}
                    </span>
                  ))}

                  {rowActions && (
                    <span role="cell" onClick={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Stacked cards — below 768px */}
      <ul className="divide-y divide-border md:hidden" aria-label={caption}>
        {sorted.map((row) => {
          const key = rowKey(row)
          return (
            <li key={key} className="p-3">
              <div
                onClick={onRowActivate ? () => onRowActivate(row) : undefined}
                className={onRowActivate ? 'cursor-pointer' : undefined}
              >
                <div className="text-sm font-medium text-foreground">{primary.cell(row)}</div>
                <dl className="mt-2 grid grid-cols-[minmax(0,7rem)_1fr] gap-x-3 gap-y-1 text-sm">
                  {visible
                    .filter((c) => c !== primary && !c.hideOnCard)
                    .map((column) => (
                      <div key={column.key} className="contents">
                        <dt className="text-xs uppercase tracking-[0.06em] text-muted-foreground">
                          {column.header}
                        </dt>
                        <dd className="min-w-0 text-foreground">{column.cell(row)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
              {rowActions && (
                <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-2">
                  {rowActions(row)}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {footer}
    </div>
  )
}

/* ------------------------------------------------------------- toolbar bits */

function DensityMenu({
  value,
  onChange,
}: {
  value: Density
  onChange: (density: Density) => void
}) {
  const Current = DENSITY[value].icon
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Row density: ${DENSITY[value].label}`}>
          <Current aria-hidden="true" />
          <span className="hidden lg:inline">{DENSITY[value].label}</span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-44 rounded-lg border border-border bg-popover p-1 shadow-lg data-[state=open]:animate-slide-up data-[state=closed]:animate-slide-down-out"
        >
          <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Row height
          </p>
          {(Object.keys(DENSITY) as Density[]).map((key) => {
            const Icon = DENSITY[key].icon
            return (
              <button
                key={key}
                type="button"
                onClick={() => onChange(key)}
                aria-pressed={value === key}
                className={cn(
                  'flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-sm transition-colors',
                  value === key
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'hover:bg-secondary',
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {DENSITY[key].label}
              </button>
            )
          })}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function ColumnMenu<T>({
  columns,
  hidden,
  onChange,
}: {
  columns: GridColumn<T>[]
  hidden: string[]
  onChange: (hidden: string[]) => void
}) {
  const shownCount = columns.length - hidden.length
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="ghost" size="sm" aria-label={`Columns: ${shownCount} of ${columns.length} shown`}>
          <Columns3 aria-hidden="true" />
          <span className="hidden lg:inline">Columns</span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={6}
          className="z-50 w-56 rounded-lg border border-border bg-popover p-1 shadow-lg data-[state=open]:animate-slide-up data-[state=closed]:animate-slide-down-out"
        >
          <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Show columns
          </p>
          <div className="max-h-72 overflow-y-auto px-1">
            {columns.map((column) => {
              const isVisible = !hidden.includes(column.key)
              const isLastVisible = isVisible && columns.length - hidden.length === 1
              return (
                <CheckboxField
                  key={column.key}
                  id={`col-${column.key}`}
                  label={column.header}
                  checked={isVisible}
                  disabled={isLastVisible}
                  onCheckedChange={(checked) =>
                    onChange(
                      checked ? hidden.filter((k) => k !== column.key) : [...hidden, column.key],
                    )
                  }
                />
              )
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/* ------------------------------------------------------------------ helpers */

/** Grid preferences persist per screen, so a chosen layout survives a reload. */
function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = React.useState<T>(() => {
    if (!key.startsWith('undefined')) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) return JSON.parse(raw) as T
      } catch {
        /* ignore malformed preferences */
      }
    }
    return initial
  })

  const set = React.useCallback(
    (next: T) => {
      setValue(next)
      if (!key.startsWith('undefined')) {
        try {
          localStorage.setItem(key, JSON.stringify(next))
        } catch {
          /* storage full or blocked — preference simply does not persist */
        }
      }
    },
    [key],
  )

  return [value, set] as const
}

/** RFC 4180 quoting, so a comma in a study title cannot shift a column. */
function escapeCsv(value: string | number) {
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadCsv<T>(name: string, columns: GridColumn<T>[], rows: T[]) {
  const exportable = columns.filter((c) => c.value)
  const csv = [
    exportable.map((c) => escapeCsv(c.header)).join(','),
    ...rows.map((row) => exportable.map((c) => escapeCsv(c.value!(row))).join(',')),
  ].join('\n')

  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
