import * as React from 'react'
import {
  ArrowLeft,
  Copy,
  LayoutTemplate,
  Paperclip,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { eConsentsApi, ApiError } from '@/data/api'
import type { ConsentInteraction, EConsent } from '@/data/types'
import { loadDocument, saveDocument } from '@/lib/document-store'
import { formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { CheckboxField } from '@/components/ui/checkbox'
import { FileDrop } from '@/components/ui/file-drop'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { ConsentDesigner, PlaceholderSummary } from './consent-designer'
import { InteractionDialog } from './consent-interaction'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 break-words text-sm text-foreground">{children}</dd>
    </div>
  )
}

/** Blank cells read as missing data; an em dash reads as "nothing here". */
const orDash = (value: string | undefined) =>
  value && value.trim() ? value : <span className="text-muted-foreground">—</span>

/**
 * One consent, the way the legacy portal opened it: the record, then the
 * related lists underneath it.
 *
 * Edit changes the record in place, Designer lays the signing fields out on the
 * document, and Copy takes the whole thing — questions, interactions and placed
 * fields — into a new one.
 */
export function ConsentRecord({
  consent,
  canManage,
  onBack,
  onChanged,
  onOpenCopy,
}: {
  consent: EConsent
  canManage: boolean
  onBack: () => void
  onChanged: () => void
  onOpenCopy: (id: string) => void
}) {
  const toast = useToast()
  const [editing, setEditing] = React.useState(false)
  const [designing, setDesigning] = React.useState(false)
  const [addingInteraction, setAddingInteraction] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string>()

  const [description, setDescription] = React.useState(consent.description)
  const [witnessRequired, setWitnessRequired] = React.useState(consent.witnessRequired)
  const [replacement, setReplacement] = React.useState<File | null>(null)

  const interactions = React.useMemo(
    () => [...(consent.interactions ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [consent.interactions],
  )

  function startEditing() {
    setDescription(consent.description)
    setWitnessRequired(consent.witnessRequired)
    setReplacement(null)
    setError(undefined)
    setEditing(true)
  }

  async function saveEdits() {
    setBusy(true)
    setError(undefined)
    try {
      // The file goes to this device; only its name belongs in the record.
      if (replacement) await saveDocument(consent.id, replacement)
      await eConsentsApi.update(consent.id, {
        description: description.trim(),
        witnessRequired,
        ...(replacement ? { documentName: replacement.name } : {}),
      })
      toast.success('Consent updated')
      setEditing(false)
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not save this consent.')
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    setBusy(true)
    try {
      const made = await eConsentsApi.duplicate(consent.id)
      // The placed fields come across in the record, so the document has to as
      // well — otherwise the copy opens the designer with fields laid out over
      // nothing and asks for a file it was never given.
      const stored = await loadDocument(consent.id)
      if (stored) {
        await saveDocument(made.id, new File([stored.blob], stored.name, { type: stored.type }))
      }
      toast.success('Consent copied', 'The copy is open — rename it before it is used.')
      onChanged()
      onOpenCopy(made.id)
    } catch {
      toast.error('We could not copy this consent')
    } finally {
      setBusy(false)
    }
  }

  async function addInteraction(interaction: ConsentInteraction) {
    await eConsentsApi.update(consent.id, {
      interactions: [...(consent.interactions ?? []), interaction],
    })
    toast.success('Interaction added')
    onChanged()
  }

  async function removeInteraction(index: number) {
    const kept = (consent.interactions ?? []).filter((_, i) => i !== index)
    await eConsentsApi.update(consent.id, { interactions: kept })
    toast.success('Interaction removed')
    onChanged()
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ArrowLeft aria-hidden="true" />
        Back to eConsents
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">
            eConsent
          </p>
          <h2 className="mt-0.5 flex flex-wrap items-center gap-2 text-lg font-semibold text-foreground">
            {consent.description}
            {consent.witnessRequired && (
              <Badge tone="info">
                <ShieldCheck className="size-3" aria-hidden="true" />
                Witness required
              </Badge>
            )}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="id">{consent.id}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canManage && (
            <Button variant="outline" size="sm" onClick={startEditing} disabled={editing || busy}>
              <Pencil aria-hidden="true" />
              Edit
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setDesigning(true)}>
            <LayoutTemplate aria-hidden="true" />
            Designer
          </Button>
          {canManage && (
            <Button variant="outline" size="sm" onClick={copy} disabled={busy}>
              <Copy aria-hidden="true" />
              Copy
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert tone="error" title="We could not save this consent">
          {error}
        </Alert>
      )}

      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        {editing ? (
          <div className="space-y-5">
            <FormField
              id="editConsentDescription"
              label="Short description"
              hint="Participants see this, so name it the way they would recognise it."
              required
            >
              {(aria) => (
                <Textarea
                  {...aria}
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              )}
            </FormField>

            <CheckboxField
              id="editWitnessRequired"
              label="A witness must countersign"
              description="Use this where the participant cannot read the document themselves."
              checked={witnessRequired}
              onCheckedChange={setWitnessRequired}
            />

            <div>
              <p className="mb-1.5 text-sm font-medium text-foreground">
                Attachment
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  Currently {consent.documentName ?? 'none'}
                </span>
              </p>
              <FileDrop
                id="replaceConsentDocument"
                label="Replace the document"
                hint="Optional. PDF, PNG or JPG."
                accept=".pdf,.png,.jpg,.jpeg"
                value={replacement}
                onChange={setReplacement}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-5">
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="brand" onClick={saveEdits} loading={busy}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Number">
              <span className="id">{consent.id}</span>
            </Field>
            <Field label="Attachment">
              <span className="flex items-center gap-1.5">
                <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                {orDash(consent.documentName)}
              </span>
            </Field>
            <Field label="Witness required">{consent.witnessRequired ? 'Yes' : 'No'}</Field>
            <Field label="Placeholders">
              <PlaceholderSummary consent={consent} />
            </Field>
            <Field label="Created">{formatDateTime(consent.createdAt)}</Field>
            <Field label="Short description">{orDash(consent.description)}</Field>
          </dl>
        )}
      </div>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {consent.questions.length === 1
            ? '1 comprehension question'
            : `${consent.questions.length} comprehension questions`}
        </h3>
        <div className="mt-3 rounded-lg border border-border bg-card">
          {consent.questions.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No records to display.</p>
          ) : (
            <ul className="divide-y divide-border">
              {consent.questions.map((question, index) => (
                <li key={`${question.question}-${index}`} className="p-4 text-sm text-foreground">
                  {question.question}
                  <span className="ml-2 text-xs text-muted-foreground">
                    Expected: {question.desiredAnswer}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Interactions
            <span className="ml-2 font-normal normal-case tracking-normal">
              {interactions.length === 0 ? 'none' : interactions.length}
            </span>
          </h3>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setAddingInteraction(true)}>
              <Plus aria-hidden="true" />
              New
            </Button>
          )}
        </div>

        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card">
          {interactions.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No records to display.</p>
          ) : (
            <table className="w-full min-w-[46rem] text-sm">
              <caption className="sr-only">
                Interactions on eConsent {consent.id}
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.06em] text-muted-foreground">
                  <th scope="col" className="px-4 py-2 font-medium">
                    Type
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Question
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Video link
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Order
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Response type
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Desired answer
                  </th>
                  {canManage && <th scope="col" className="px-4 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {interactions.map((item, index) => (
                  <tr key={`${item.type}-${item.order ?? index}-${index}`}>
                    <td className="px-4 py-2.5 text-foreground">{item.type}</td>
                    <td className="px-4 py-2.5 text-foreground">{orDash(item.question)}</td>
                    <td className="max-w-[16rem] px-4 py-2.5">
                      {item.link ? (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-brand underline-offset-4 hover:underline"
                        >
                          {item.link}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{item.order ?? index + 1}</td>
                    <td className="px-4 py-2.5 text-foreground">{orDash(item.responseType)}</td>
                    <td className="px-4 py-2.5 text-foreground">{orDash(item.desiredAnswer)}</td>
                    {canManage && (
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void removeInteraction(index)}
                          aria-label={`Remove interaction ${index + 1}`}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <ConsentDesigner
        consent={consent}
        open={designing}
        onOpenChange={setDesigning}
        onSaved={onChanged}
        canManage={canManage}
      />

      <InteractionDialog
        open={addingInteraction}
        onOpenChange={setAddingInteraction}
        consentId={consent.id}
        nextOrder={interactions.length + 1}
        onSubmit={addInteraction}
      />
    </div>
  )
}
