import * as React from 'react'
import { FileText, Image as ImageIcon, Upload, X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface FileDropProps {
  id: string
  label: string
  hint?: string
  accept?: string
  value: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
  'aria-invalid'?: true | undefined
  'aria-describedby'?: string
}

const MAX_MB = 10

/**
 * File picker with a drop target.
 *
 * Keeps a real `<input type="file">` as the control — the label activates it, so
 * keyboard and screen-reader users get the native picker — and layers
 * drag-and-drop on top for pointer users rather than replacing it.
 */
export function FileDrop({
  id,
  label,
  hint = `PDF, PNG or JPG up to ${MAX_MB}MB`,
  accept = '.pdf,.png,.jpg,.jpeg',
  value,
  onChange,
  disabled,
  'aria-invalid': ariaInvalid,
  'aria-describedby': describedBy,
}: FileDropProps) {
  const [dragging, setDragging] = React.useState(false)
  const [sizeError, setSizeError] = React.useState<string>()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const errorId = `${id}-size-error`

  function acceptFile(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_MB * 1024 * 1024) {
      setSizeError(`${file.name} is larger than ${MAX_MB}MB. Choose a smaller file.`)
      return
    }
    setSizeError(undefined)
    onChange(file)
  }

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
        <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{value.name}</p>
          <p className="text-xs text-muted-foreground">
            {(value.size / 1024).toFixed(0)} KB
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null)
            if (inputRef.current) inputRef.current.value = ''
          }}
          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label={`Remove ${value.name}`}
        >
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault()
          if (!disabled) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) acceptFile(e.dataTransfer.files[0])
        }}
        className={cn(
          'flex min-h-11 cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-input bg-card px-4 py-6 text-center transition-colors',
          'hover:border-brand/50 hover:bg-accent/30',
          dragging && 'border-brand bg-accent/40',
          disabled && 'cursor-not-allowed opacity-60',
          ariaInvalid && 'border-destructive',
        )}
      >
        <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          Drag a file here, or click to browse. {hint}
        </span>
      </label>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        aria-invalid={ariaInvalid}
        aria-describedby={[describedBy, sizeError ? errorId : undefined]
          .filter(Boolean)
          .join(' ') || undefined}
        onChange={(e) => acceptFile(e.target.files?.[0])}
      />
      {sizeError && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-destructive">
          {sizeError}
        </p>
      )}
    </div>
  )
}

/**
 * Single-image picker for the site branding fields, with a live thumbnail.
 *
 * The data model persists only the file name (there is no upload target in this
 * build), so a freshly chosen image is previewed from an object URL held here,
 * while an existing name shows a placeholder tile. The name is what flows up.
 */
export function ImagePicker({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string
  label: string
  hint?: string
  value: string | undefined
  onChange: (name: string | undefined) => void
}) {
  const [preview, setPreview] = React.useState<string>()
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  function pick(file: File | undefined) {
    if (!file) return
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    onChange(file.name)
  }

  function clear() {
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return undefined
    })
    onChange(undefined)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-sunken">
        {preview ? (
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-6 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0">
        <label
          htmlFor={id}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/60"
        >
          <Upload className="size-4" aria-hidden="true" />
          {value ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        </label>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        {value ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="max-w-[14rem] truncate">{value}</span>
            <button
              type="button"
              onClick={clear}
              className="rounded p-0.5 transition-colors hover:bg-secondary hover:text-foreground"
              aria-label={`Remove ${label.toLowerCase()}`}
            >
              <X className="size-3.5" />
            </button>
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {hint ?? 'PNG or JPG. No file chosen.'}
          </p>
        )}
      </div>
    </div>
  )
}
