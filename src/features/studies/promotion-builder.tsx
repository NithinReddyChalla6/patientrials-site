import { Megaphone } from 'lucide-react'
import type { Study, StudyPromotion } from '@/data/types'
import { all, inRange, required } from '@/lib/validators'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ListInput } from '@/components/ui/list-input'
import { FormField } from '@/components/patterns/form-field'
import { TrialPreview } from './trial-preview'

export const EMPTY_PROMOTION: StudyPromotion = {
  conditions: [],
  locations: [],
  upcomingResearch: [],
  minimumAge: '',
}

export type PromotionErrors = Partial<Record<keyof StudyPromotion, string>>

/** Validation lives beside the form so both entry points enforce the same rules. */
export function validatePromotion(promotion: StudyPromotion): PromotionErrors {
  return {
    upcomingResearch:
      promotion.upcomingResearch.length === 0 ? 'Describe the study in one line' : undefined,
    conditions: promotion.conditions.length === 0 ? 'Add at least one eligibility line' : undefined,
    locations: promotion.locations.length === 0 ? 'Add at least one location' : undefined,
    minimumAge: all(required('Minimum age'), inRange(0, 120, 'Minimum age'))(promotion.minimumAge),
  }
}

export const isPromotionValid = (promotion: StudyPromotion) =>
  Object.values(validatePromotion(promotion)).every((e) => !e)

/**
 * The promotion copy a participant reads, with a live preview.
 *
 * Shared by the create-study flow and the standalone promote screen so a study
 * promoted later is described to exactly the same standard as one promoted at
 * creation.
 */
export function PromotionBuilder({
  study,
  promotion,
  onChange,
  showErrors,
}: {
  study: Study
  promotion: StudyPromotion
  onChange: (promotion: StudyPromotion) => void
  showErrors: boolean
}) {
  const errors = validatePromotion(promotion)
  const shown = (key: keyof StudyPromotion) => (showErrors ? errors[key] : undefined)
  const patch = (next: Partial<StudyPromotion>) => onChange({ ...promotion, ...next })

  return (
    <div className="space-y-8">
      <Alert tone="info" title="Write for the person, not the protocol">
        Everything here appears on the public trial page. Short, plain sentences work best —
        "Adults aged 18 and over" rather than "Subjects ≥18 years of age".
      </Alert>

      <FormField
        id="research"
        label="What is this study about?"
        hint="One or two lines describing what taking part involves."
        error={shown('upcomingResearch')}
        required
      >
        {(aria) => (
          <ListInput
            {...aria}
            addButtonId="addUpcomingResearch"
            label="Study description lines"
            placeholder="A 52-week study of a once-weekly injectable treatment"
            items={promotion.upcomingResearch}
            onChange={(items) => patch({ upcomingResearch: items })}
            emptyMessage="No description added yet."
          />
        )}
      </FormField>

      <FormField
        id="symptoms"
        label="Who can take part?"
        hint="Add one line per eligibility point."
        error={shown('conditions')}
        required
      >
        {(aria) => (
          <ListInput
            {...aria}
            addButtonId="addWhoHave"
            label="Eligibility lines"
            placeholder="Adults aged 18 and over"
            items={promotion.conditions}
            onChange={(items) => patch({ conditions: items })}
            emptyMessage="No eligibility points added yet."
          />
        )}
      </FormField>

      <FormField
        id="location"
        label="Where does it run?"
        hint="Add each location participants can attend."
        error={shown('locations')}
        required
      >
        {(aria) => (
          <ListInput
            {...aria}
            addButtonId="addlocation"
            label="Locations"
            placeholder="Plano, Texas"
            items={promotion.locations}
            onChange={(items) => patch({ locations: items })}
            emptyMessage="No locations added yet."
          />
        )}
      </FormField>

      <FormField
        id="age"
        label="Minimum age"
        hint="Participants below this age will not be offered the study."
        error={shown('minimumAge')}
        required
      >
        {(aria) => (
          <Input
            {...aria}
            value={promotion.minimumAge}
            onChange={(e) => patch({ minimumAge: e.target.value })}
            inputMode="numeric"
            className="sm:max-w-[8rem]"
          />
        )}
      </FormField>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Megaphone className="size-4 text-brand" aria-hidden="true" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Preview
          </h2>
          <Badge tone="outline">What participants will see</Badge>
        </div>
        <TrialPreview study={study} promotion={promotion} />
      </div>
    </div>
  )
}
