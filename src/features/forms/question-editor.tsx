import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import type { FormQuestion, QuestionType } from '@/data/types'
import { RATING_PRESETS } from '@/data/reference'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ListInput } from '@/components/ui/list-input'
import { CheckboxField } from '@/components/ui/checkbox'
import { FormField } from '@/components/patterns/form-field'

const SCALES = ['3', '5', '7', '10']

interface QuestionEditorProps {
  question: FormQuestion
  index: number
  total: number
  /** Surfaced only after a publish attempt, so drafting stays quiet. */
  showErrors: boolean
  onChange: (question: FormQuestion) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}

/** A question is only publishable once it asks something. */
export function questionError(question: FormQuestion): string | undefined {
  if (!question.prompt.trim()) return 'Write the question participants will answer'
  if (question.type === 'Choice' && question.options.length < 2) {
    return 'Add at least two options'
  }
  if (
    question.type === 'Rating' &&
    question.rating?.preset === 'Custom' &&
    (!question.rating.lowLabel.trim() || !question.rating.highLabel.trim())
  ) {
    return 'Label both ends of the scale'
  }
  return undefined
}

/**
 * One question, edited in place.
 *
 * The legacy builder held each question in a tab panel whose prompt lived inside
 * a TinyMCE iframe and whose settings appeared only after the type was chosen
 * from a dropdown link. Type is chosen once here and the settings that type
 * needs — and only those — appear beneath the prompt.
 */
export function QuestionEditor({
  question,
  index,
  total,
  showErrors,
  onChange,
  onRemove,
  onMove,
}: QuestionEditorProps) {
  const error = showErrors ? questionError(question) : undefined
  const id = `question-${question.id}`
  const patch = (next: Partial<FormQuestion>) => onChange({ ...question, ...next })

  return (
    <li className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Question {index + 1}
          </span>
          <Badge tone="outline">{question.type}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label={`Move question ${index + 1} up`}
          >
            <ChevronUp aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label={`Move question ${index + 1} down`}
          >
            <ChevronDown aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label={`Remove question ${index + 1}`}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <FormField id={id} label="Question" error={error} required>
          {(aria) => (
            <Textarea
              {...aria}
              value={question.prompt}
              onChange={(e) => patch({ prompt: e.target.value })}
              rows={2}
              placeholder="What would you like to ask?"
            />
          )}
        </FormField>

        {question.type === 'Choice' && (
          <FormField
            id={`${id}-options`}
            label="Options"
            hint="What the participant chooses between."
            required
          >
            {(aria) => (
              <ListInput
                {...aria}
                label={`Options for question ${index + 1}`}
                placeholder="Never"
                items={question.options}
                onChange={(options) => patch({ options })}
                emptyMessage="No options added yet."
              />
            )}
          </FormField>
        )}

        {question.type === 'Rating' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id={`${id}-scale`} label="Scale">
              {(aria) => (
                <Select
                  {...aria}
                  value={String(question.rating?.scale ?? 5)}
                  onChange={(e) =>
                    patch({
                      rating: {
                        scale: Number(e.target.value),
                        preset: question.rating?.preset ?? RATING_PRESETS[0],
                        lowLabel: question.rating?.lowLabel ?? '',
                        highLabel: question.rating?.highLabel ?? '',
                      },
                    })
                  }
                >
                  {SCALES.map((scale) => (
                    <option key={scale} value={scale}>
                      1 to {scale}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>

            <FormField id={`${id}-preset`} label="Labels">
              {(aria) => (
                <Select
                  {...aria}
                  value={question.rating?.preset ?? RATING_PRESETS[0]}
                  onChange={(e) => {
                    const preset = e.target.value
                    const [low = '', high = ''] =
                      preset === 'Custom' ? ['', ''] : preset.split(' to ')
                    patch({
                      rating: {
                        scale: question.rating?.scale ?? 5,
                        preset,
                        lowLabel: preset === 'Custom' ? (question.rating?.lowLabel ?? '') : low,
                        highLabel: preset === 'Custom' ? (question.rating?.highLabel ?? '') : high,
                      },
                    })
                  }}
                  options={RATING_PRESETS}
                />
              )}
            </FormField>

            {question.rating?.preset === 'Custom' && (
              <>
                <FormField id={`${id}-low`} label="Lowest point" required>
                  {(aria) => (
                    <Input
                      {...aria}
                      name={`custom_low_${question.id}`}
                      value={question.rating?.lowLabel ?? ''}
                      onChange={(e) =>
                        patch({
                          rating: {
                            scale: question.rating?.scale ?? 5,
                            preset: 'Custom',
                            lowLabel: e.target.value,
                            highLabel: question.rating?.highLabel ?? '',
                          },
                        })
                      }
                      placeholder="Very poor"
                    />
                  )}
                </FormField>
                <FormField id={`${id}-high`} label="Highest point" required>
                  {(aria) => (
                    <Input
                      {...aria}
                      name={`custom_high_${question.id}`}
                      value={question.rating?.highLabel ?? ''}
                      onChange={(e) =>
                        patch({
                          rating: {
                            scale: question.rating?.scale ?? 5,
                            preset: 'Custom',
                            lowLabel: question.rating?.lowLabel ?? '',
                            highLabel: e.target.value,
                          },
                        })
                      }
                      placeholder="Excellent"
                    />
                  )}
                </FormField>
              </>
            )}
          </div>
        )}

        <CheckboxField
          id={`${id}-required`}
          checked={question.required}
          onCheckedChange={(required) => patch({ required })}
          label="Participants must answer this"
        />
      </div>
    </li>
  )
}

/** Defaults per type, so a new question is usable straight away. */
export function newQuestion(type: QuestionType, id: string): FormQuestion {
  return {
    id,
    type,
    prompt: '',
    required: type !== 'Attachment',
    options: type === 'Choice' ? [] : [],
    rating:
      type === 'Rating'
        ? { scale: 5, preset: RATING_PRESETS[0], lowLabel: 'Poor', highLabel: 'Excellent' }
        : undefined,
  }
}
