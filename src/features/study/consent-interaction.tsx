import * as React from 'react'
import type { ConsentInteraction } from '@/data/types'
import { INTERACTION_RESPONSE_TYPES, INTERACTION_TYPES } from '@/data/reference'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { FormField } from '@/components/patterns/form-field'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** A blank interaction, in the order it will be worked through. */
export function blankInteraction(order: number): ConsentInteraction {
  return {
    type: INTERACTION_TYPES[0],
    link: '',
    order,
    question: '',
    responseType: INTERACTION_RESPONSE_TYPES[0],
    desiredAnswer: '',
    sponsorInteraction: '',
  }
}

/**
 * What the legacy form refuses to submit.
 *
 * A Question with nothing to answer, and a Video with nowhere to watch it, are
 * both records that look complete in a list and do nothing to a participant.
 */
export function interactionProblem(value: ConsentInteraction): string | undefined {
  if (value.type === 'Video' && !value.link.trim()) return 'Paste the video link.'
  if (value.type !== 'Video' && !value.question?.trim()) return 'Write the question.'
  return undefined
}

/**
 * The record as it should be stored, with the fields its type cannot use
 * dropped rather than carried along at their defaults.
 *
 * Without this a Video row shows a response type of Yes/No in the list — a
 * value nobody chose, for a question nobody asked.
 */
export function cleanInteraction(value: ConsentInteraction): ConsentInteraction {
  if (value.type === 'Video') {
    return {
      type: value.type,
      link: value.link.trim(),
      order: value.order,
      sponsorInteraction: value.sponsorInteraction?.trim() || undefined,
    }
  }
  return {
    type: value.type,
    link: '',
    order: value.order,
    question: value.question?.trim(),
    responseType: value.responseType,
    desiredAnswer: value.desiredAnswer?.trim() || undefined,
    sponsorInteraction: value.sponsorInteraction?.trim() || undefined,
  }
}

/**
 * The fields of one interaction.
 *
 * Shared by the wizard's last step and the New button on the record, because
 * they write the same record. The legacy portal showed every field for every
 * type; here the ones that cannot apply are left out, which is a change of
 * presentation only — nothing is stored that was not stored before.
 */
export function InteractionFields({
  value,
  onChange,
  idPrefix,
}: {
  value: ConsentInteraction
  onChange: (next: ConsentInteraction) => void
  idPrefix: string
}) {
  const set = <K extends keyof ConsentInteraction>(key: K, next: ConsentInteraction[K]) =>
    onChange({ ...value, [key]: next })

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id={`${idPrefix}Type`} label="Type">
          {(aria) => (
            <Select
              {...aria}
              value={value.type}
              onChange={(e) => set('type', e.target.value)}
              options={INTERACTION_TYPES}
            />
          )}
        </FormField>

        <FormField id={`${idPrefix}Order`} label="Order" hint="Where it falls in the sequence.">
          {(aria) => (
            <Input
              {...aria}
              type="number"
              min={1}
              value={value.order ?? 1}
              onChange={(e) => set('order', Number(e.target.value) || 1)}
            />
          )}
        </FormField>
      </div>

      {value.type === 'Video' ? (
        <FormField
          id={`${idPrefix}Link`}
          label="Video link"
          hint="Where the participant watches it."
        >
          {(aria) => (
            <Input
              {...aria}
              value={value.link}
              onChange={(e) => set('link', e.target.value)}
              type="url"
              inputMode="url"
              placeholder="https://"
            />
          )}
        </FormField>
      ) : (
        <>
          <FormField id={`${idPrefix}Question`} label="Question">
            {(aria) => (
              <Textarea
                {...aria}
                rows={2}
                value={value.question ?? ''}
                onChange={(e) => set('question', e.target.value)}
              />
            )}
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id={`${idPrefix}ResponseType`} label="Response type">
              {(aria) => (
                <Select
                  {...aria}
                  value={value.responseType ?? INTERACTION_RESPONSE_TYPES[0]}
                  onChange={(e) => set('responseType', e.target.value)}
                  options={INTERACTION_RESPONSE_TYPES}
                />
              )}
            </FormField>

            <FormField
              id={`${idPrefix}DesiredAnswer`}
              label="Desired answer"
              hint="Leave blank where any answer is acceptable."
            >
              {(aria) => (
                <Input
                  {...aria}
                  value={value.desiredAnswer ?? ''}
                  onChange={(e) => set('desiredAnswer', e.target.value)}
                />
              )}
            </FormField>
          </div>
        </>
      )}

      <FormField
        id={`${idPrefix}Sponsor`}
        label="Sponsor interaction"
        hint="Anything the sponsor requires alongside this. Optional."
      >
        {(aria) => (
          <Textarea
            {...aria}
            rows={2}
            value={value.sponsorInteraction ?? ''}
            onChange={(e) => set('sponsorInteraction', e.target.value)}
          />
        )}
      </FormField>
    </div>
  )
}

/** The New button's form, as its own record the way the legacy portal opens it. */
export function InteractionDialog({
  open,
  onOpenChange,
  consentId,
  nextOrder,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  consentId: string
  nextOrder: number
  onSubmit: (interaction: ConsentInteraction) => Promise<void> | void
}) {
  const [value, setValue] = React.useState(() => blankInteraction(nextOrder))
  const [error, setError] = React.useState<string>()
  const [saving, setSaving] = React.useState(false)

  // A reopened form is a new record, not the last one half-finished.
  React.useEffect(() => {
    if (open) {
      setValue(blankInteraction(nextOrder))
      setError(undefined)
    }
  }, [open, nextOrder])

  async function submit() {
    const problem = interactionProblem(value)
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    try {
      await onSubmit(cleanInteraction(value))
      onOpenChange(false)
    } catch {
      setError('We could not save this interaction.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New interaction</DialogTitle>
          <DialogDescription>
            On eConsent <span className="id">{consentId}</span>
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {error && (
            <Alert tone="error" title="We could not save this" className="mb-4">
              {error}
            </Alert>
          )}
          <InteractionFields value={value} onChange={setValue} idPrefix="newInteraction" />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="brand" onClick={submit} loading={saving}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
