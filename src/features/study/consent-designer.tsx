import * as React from 'react'
import { FileText, Info, Save, Trash2, X } from 'lucide-react'
import { eConsentsApi, ApiError } from '@/data/api'
import type { ConsentPlaceholder, EConsent } from '@/data/types'
import { CONSENT_PLACEHOLDER_TYPES } from '@/data/reference'
import { loadDocument, saveDocument, type StoredDocument } from '@/lib/document-store'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { FileDrop } from '@/components/ui/file-drop'
import { useToast } from '@/components/ui/toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** A page of the document, already drawn and ready to be positioned against. */
interface RenderedPage {
  url: string
  width: number
  height: number
}

/**
 * How wide a PDF page is drawn, in pixels.
 *
 * Drawn once at this width and then scaled by CSS rather than redrawn on every
 * resize: the placeholders are stored as fractions of the page, so they follow
 * the scaling for free and nothing has to be recalculated.
 */
const RENDER_WIDTH = 1100

/**
 * Starting sizes, as a fraction of the page width and height.
 *
 * A signature needs room to be written in; a checkbox is a checkbox. This
 * matters more than it looks — a field dropped at the wrong size has to be
 * resized before it can even be read against the text underneath it.
 */
const SIZES: Record<string, { width: number; height: number }> = {
  Signature: { width: 0.26, height: 0.055 },
  Initial: { width: 0.1, height: 0.045 },
  Checkbox: { width: 0.035, height: 0.022 },
  Date: { width: 0.16, height: 0.03 },
  'Date Time': { width: 0.22, height: 0.03 },
  Address: { width: 0.34, height: 0.06 },
}
const FALLBACK_SIZE = { width: 0.22, height: 0.03 }

let placeholderSeq = 0
const newPlaceholderId = () => `PH-${Date.now().toString(36)}-${(placeholderSeq += 1)}`

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

/**
 * pdf.js, fetched the first time a document is opened.
 *
 * Loaded on demand rather than imported at the top of the app: it and its
 * worker are the largest thing in the build by some way, and most people never
 * open the designer at all.
 */
let pdfjs: typeof import('pdfjs-dist') | undefined
async function loadPdfjs() {
  if (!pdfjs) {
    const [lib, worker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
    lib.GlobalWorkerOptions.workerSrc = worker.default
    pdfjs = lib
  }
  return pdfjs
}

async function renderPdf(blob: Blob): Promise<RenderedPage[]> {
  const lib = await loadPdfjs()
  // A copy, because pdf.js takes ownership of the buffer it is handed.
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const doc = await lib.getDocument({ data: bytes }).promise
  const pages: RenderedPage[] = []
  for (let number = 1; number <= doc.numPages; number += 1) {
    const page = await doc.getPage(number)
    const unscaled = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: RENDER_WIDTH / unscaled.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) continue
    await page.render({ canvasContext: context, viewport }).promise
    const url = await new Promise<string>((resolve) => {
      canvas.toBlob(
        (out) => resolve(out ? URL.createObjectURL(out) : canvas.toDataURL('image/png')),
        'image/png',
      )
    })
    pages.push({ url, width: viewport.width, height: viewport.height })
  }
  return pages
}

/** An image stands in for a one-page document, so a scanned form works too. */
function renderImage(blob: Blob): Promise<RenderedPage[]> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.addEventListener('load', () =>
      resolve([{ url, width: image.naturalWidth, height: image.naturalHeight }]),
    )
    image.addEventListener('error', () => {
      URL.revokeObjectURL(url)
      reject(new Error('That image could not be opened.'))
    })
    image.src = url
  })
}

/**
 * Place the fields a participant fills in, on the document itself.
 *
 * What is saved is where the fields sit, as fractions of the page. The document
 * is not saved with them — see `lib/document-store` for why — so opening this
 * on another machine asks for the file once and then puts every field back
 * exactly where it was left.
 */
export function ConsentDesigner({
  consent,
  open,
  onOpenChange,
  onSaved,
  canManage,
}: {
  consent: EConsent
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  canManage: boolean
}) {
  const toast = useToast()
  const [doc, setDoc] = React.useState<StoredDocument>()
  const [pages, setPages] = React.useState<RenderedPage[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string>()
  const [placeholders, setPlaceholders] = React.useState<ConsentPlaceholder[]>([])
  const [armed, setArmed] = React.useState<string>()
  const [selected, setSelected] = React.useState<string>()
  const [saving, setSaving] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)

  // Drawn pages are object URLs; without this, every open leaks a document.
  const revoke = React.useCallback((list: RenderedPage[]) => {
    for (const page of list) {
      if (page.url.startsWith('blob:')) URL.revokeObjectURL(page.url)
    }
  }, [])

  const show = React.useCallback(
    async (stored: StoredDocument) => {
      setLoading(true)
      setError(undefined)
      try {
        const drawn = stored.type.startsWith('image/')
          ? await renderImage(stored.blob)
          : await renderPdf(stored.blob)
        setPages(drawn)
        setDoc(stored)
      } catch {
        setError(`We could not open ${stored.name}. It may not be a readable PDF.`)
      } finally {
        setLoading(false)
      }
    },
    [revoke],
  )

  // Read when the designer opens, not on every render: a parent refresh while
  // it is open must not throw away fields that have been placed and not saved.
  const record = React.useRef(consent)
  record.current = consent

  React.useEffect(() => {
    if (!open) return
    setPlaceholders(record.current.placeholders ?? [])
    setDirty(false)
    setSelected(undefined)
    setArmed(undefined)
    let live = true
    void (async () => {
      const stored = await loadDocument(record.current.id)
      if (!live || !stored) return
      await show(stored)
    })()
    return () => {
      live = false
    }
  }, [open, consent.id, show])

  // Frees the previous set when the document is replaced, and the last set when
  // the screen goes away. Without it every open leaks a whole document.
  React.useEffect(() => () => revoke(pages), [pages, revoke])

  async function openFile(file: File | null) {
    if (!file) return
    await saveDocument(consent.id, file)
    await show({ name: file.name, type: file.type, blob: file })
  }

  function drop(event: React.MouseEvent<HTMLDivElement>, page: number) {
    if (!armed) return
    // A drag that finishes on a placed field still raises a click here. Without
    // this, moving a field while a type is armed would drop a second one.
    if (event.target instanceof Element && event.target.closest('[data-placeholder]')) return
    const rect = event.currentTarget.getBoundingClientRect()
    const size = SIZES[armed] ?? FALLBACK_SIZE
    const x = (event.clientX - rect.left) / rect.width - size.width / 2
    const y = (event.clientY - rect.top) / rect.height - size.height / 2
    const placed: ConsentPlaceholder = {
      id: newPlaceholderId(),
      type: armed,
      page,
      x: clamp(x, 0, 1 - size.width),
      y: clamp(y, 0, 1 - size.height),
      ...size,
    }
    setPlaceholders((previous) => [...previous, placed])
    setSelected(placed.id)
    setArmed(undefined)
    setDirty(true)
  }

  /**
   * Drag to move, or drag the corner to resize.
   *
   * The move and release are followed on the window rather than on the field,
   * because a drag that outruns the cursor leaves the field behind and its own
   * listeners would stop hearing anything. Pointer capture is asked for on top
   * of that, and is allowed to fail: some browsers refuse it, and a drag that
   * only mostly works is better than one that does not start.
   */
  function grab(event: React.PointerEvent, placeholder: ConsentPlaceholder, mode: 'move' | 'resize') {
    if (!canManage) return
    event.stopPropagation()
    event.preventDefault()
    setSelected(placeholder.id)
    const surface = event.currentTarget.closest('[data-page-surface]')
    if (!(surface instanceof HTMLElement)) return
    const rect = surface.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const origin = { ...placeholder }
    const target = event.currentTarget as HTMLElement
    try {
      target.setPointerCapture(event.pointerId)
    } catch {
      // Not available here; the window listeners below carry the drag anyway.
    }

    const onMove = (move: PointerEvent) => {
      const dx = (move.clientX - startX) / rect.width
      const dy = (move.clientY - startY) / rect.height
      setPlaceholders((previous) =>
        previous.map((item) => {
          if (item.id !== placeholder.id) return item
          if (mode === 'move') {
            return {
              ...item,
              x: clamp(origin.x + dx, 0, 1 - item.width),
              y: clamp(origin.y + dy, 0, 1 - item.height),
            }
          }
          return {
            ...item,
            width: clamp(origin.width + dx, 0.02, 1 - item.x),
            height: clamp(origin.height + dy, 0.012, 1 - item.y),
          }
        }),
      )
      setDirty(true)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  function removeSelected() {
    if (!selected) return
    setPlaceholders((previous) => previous.filter((item) => item.id !== selected))
    setSelected(undefined)
    setDirty(true)
  }

  async function save() {
    setSaving(true)
    try {
      await eConsentsApi.update(consent.id, { placeholders })
      toast.success(
        placeholders.length === 0
          ? 'All fields removed'
          : placeholders.length === 1
            ? '1 field saved'
            : `${placeholders.length} fields saved`,
      )
      setDirty(false)
      onSaved()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not save these fields.')
    } finally {
      setSaving(false)
    }
  }

  const onPage = (page: number) => placeholders.filter((item) => item.page === page)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        className="h-[calc(100vh-2rem)] max-w-[min(96rem,calc(100vw-2rem))] grid-rows-[auto_minmax(0,1fr)]"
      >
        <DialogHeader>
          <DialogTitle>Place fields on {consent.documentName ?? 'the document'}</DialogTitle>
          <DialogDescription>
            Pick a field, then click the page where it belongs. Drag to move it, or drag its corner
            to resize.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 grid-cols-1 md:grid-cols-[11rem_minmax(0,1fr)]">
          <div className="flex shrink-0 flex-row gap-1.5 overflow-x-auto border-b border-border p-3 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r">
            <p className="hidden text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground md:block">
              Fields
            </p>
            {CONSENT_PLACEHOLDER_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                disabled={!canManage || pages.length === 0}
                onClick={() => setArmed((current) => (current === type ? undefined : type))}
                aria-pressed={armed === type}
                className={cn(
                  'shrink-0 rounded-md border px-2.5 py-1.5 text-left text-[0.8125rem] transition-colors',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  armed === type
                    ? 'border-brand bg-brand/10 font-medium text-brand'
                    : 'border-input bg-card text-foreground hover:bg-secondary',
                )}
              >
                {type}
              </button>
            ))}

            <div className="hidden md:mt-auto md:block md:pt-3">
              <p className="text-xs text-muted-foreground">
                {placeholders.length === 0
                  ? 'No fields placed yet.'
                  : placeholders.length === 1
                    ? '1 field placed.'
                    : `${placeholders.length} fields placed.`}
              </p>
              {selected && canManage && (
                <Button variant="ghost" size="sm" className="mt-1.5" onClick={removeSelected}>
                  <Trash2 aria-hidden="true" />
                  Remove selected
                </Button>
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto bg-sunken p-4">
              {error && (
                <Alert tone="error" title="We could not open this document" className="mb-4">
                  {error}
                </Alert>
              )}

              {loading && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  Opening the document…
                </p>
              )}

              {!loading && pages.length === 0 && (
                <div className="mx-auto max-w-lg space-y-4">
                  <Alert tone="info" title="Open the document to place fields">
                    The document is kept on this computer rather than inside the study record, so it
                    is asked for once here. The fields you place are saved with the consent and come
                    back on any machine.
                  </Alert>
                  <FileDrop
                    id="designerDocument"
                    label={consent.documentName ?? 'Consent document'}
                    hint="PDF, PNG or JPG"
                    accept=".pdf,.png,.jpg,.jpeg"
                    value={null}
                    onChange={(file) => void openFile(file)}
                  />
                </div>
              )}

              {pages.length > 0 && (
                <div className="mx-auto max-w-4xl space-y-6">
                  {pages.map((page, index) => (
                    <div key={page.url}>
                      <p className="mb-1.5 text-xs text-muted-foreground">
                        Page {index + 1} of {pages.length}
                      </p>
                      <div
                        data-page-surface
                        onPointerDown={(event) => {
                          if (event.target === event.currentTarget) setSelected(undefined)
                        }}
                        onClick={(event) => drop(event, index + 1)}
                        style={{ aspectRatio: `${page.width} / ${page.height}` }}
                        className={cn(
                          'relative w-full overflow-hidden rounded border border-border bg-white shadow-sm',
                          armed && 'cursor-crosshair',
                        )}
                      >
                        <img
                          src={page.url}
                          alt={`Page ${index + 1}`}
                          draggable={false}
                          className="pointer-events-none absolute inset-0 size-full select-none"
                        />
                        {onPage(index + 1).map((item) => (
                          <div
                            key={item.id}
                            data-placeholder
                            onPointerDown={(event) => grab(event, item, 'move')}
                            style={{
                              left: `${item.x * 100}%`,
                              top: `${item.y * 100}%`,
                              width: `${item.width * 100}%`,
                              height: `${item.height * 100}%`,
                            }}
                            className={cn(
                              'absolute flex items-center justify-center overflow-visible rounded-sm border text-[0.6875rem] font-medium',
                              canManage ? 'cursor-move' : 'cursor-default',
                              item.id === selected
                                ? 'border-brand bg-brand/25 text-brand ring-1 ring-brand'
                                : 'border-brand/60 bg-brand/10 text-brand',
                            )}
                          >
                            <span className="truncate px-1">{item.type}</span>
                            {item.id === selected && canManage && (
                              <>
                                <button
                                  type="button"
                                  onPointerDown={(event) => event.stopPropagation()}
                                  onClick={removeSelected}
                                  aria-label={`Remove this ${item.type} field`}
                                  className="absolute -right-2 -top-2 rounded-full border border-border bg-card p-0.5 text-muted-foreground shadow-sm hover:text-destructive"
                                >
                                  <X className="size-3" />
                                </button>
                                <span
                                  onPointerDown={(event) => grab(event, item, 'resize')}
                                  role="presentation"
                                  className="absolute -bottom-1 -right-1 size-2.5 cursor-se-resize rounded-sm border border-brand bg-card"
                                />
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Info className="size-3.5 shrink-0" aria-hidden="true" />
                {armed
                  ? `Click the page to place the ${armed} field.`
                  : (doc?.name ?? 'No document open.')}
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                {canManage && (
                  <Button
                    variant="brand"
                    onClick={save}
                    loading={saving}
                    disabled={pages.length === 0 || !dirty}
                  >
                    <Save aria-hidden="true" />
                    Save placeholders
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The line the record page shows about what has been laid out. */
export function PlaceholderSummary({ consent }: { consent: EConsent }) {
  const count = consent.placeholders?.length ?? 0
  return (
    <span className="flex items-center gap-1.5">
      <FileText className="size-3.5" aria-hidden="true" />
      {count === 0 ? 'No fields placed' : count === 1 ? '1 field placed' : `${count} fields placed`}
    </span>
  )
}
