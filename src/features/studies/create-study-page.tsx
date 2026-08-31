import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Search, X } from 'lucide-react'
import { ApiError, REGISTRY_SAMPLE_IDS, studiesApi } from '@/data/api'
import type { Study, StudyPromotion, TrialPhase } from '@/data/types'
import { useForm } from '@/lib/use-form'
import { all, nctNumber, required } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert } from '@/components/ui/alert'
import { RadioGroup, RadioCard } from '@/components/ui/radio-group'
import { useToast } from '@/components/ui/toast'
import { FormField, FieldSet } from '@/components/patterns/form-field'
import { PageHeader } from '@/components/patterns/page-header'
import { WizardStepper } from '@/components/patterns/wizard-stepper'
import { EMPTY_PROMOTION, PromotionBuilder, isPromotionValid } from './promotion-builder'

type Registry = {
  nctId: string
  title: string
  condition: string
  phase: TrialPhase
  sponsor: string
  summary: string
}

const STEPS = [
  { id: 'find', label: 'Find the study' },
  { id: 'promote', label: 'Promotion' },
  { id: 'details', label: 'What participants see' },
]

/**
 * Create a study from its registry identifier.
 *
 * The legacy flow accepted an NCT number, then either failed with a generic
 * error banner or jumped straight to a promote question — the study was created
 * before anyone confirmed it was the right trial. Here the lookup result is
 * shown for confirmation first, the promote decision explains what each answer
 * does, and the promotion copy is previewed exactly as a participant will read
 * it, inline, rather than in a popup window the browser may block.
 */
export function CreateStudyPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const [step, setStep] = React.useState(0)
  const [found, setFound] = React.useState<Registry | null>(null)
  const [promote, setPromote] = React.useState<'yes' | 'no' | ''>('')
  const [created, setCreated] = React.useState<Study | null>(null)
  const [lookupError, setLookupError] = React.useState<{ message: string; code?: string }>()
  const [submitError, setSubmitError] = React.useState<string>()
  const headingRef = React.useRef<HTMLHeadingElement>(null)

  const [promotion, setPromotion] = React.useState<StudyPromotion>(EMPTY_PROMOTION)
  const [promotionAttempted, setPromotionAttempted] = React.useState(false)

  function goTo(next: number) {
    setStep(next)
    window.requestAnimationFrame(() => headingRef.current?.focus())
  }

  /* ------------------------------------------------------------ step one */

  const findForm = useForm({
    initialValues: { nctId: '' },
    rules: { nctId: all(required('NCT number'), nctNumber) },
    onSubmit: async (values) => {
      setLookupError(undefined)
      try {
        const result = await studiesApi.lookupNct(values.nctId)
        setFound(result)
      } catch (error) {
        setFound(null)
        setLookupError({
          message: error instanceof Error ? error.message : 'Lookup failed.',
          code: error instanceof ApiError ? error.code : undefined,
        })
      }
    },
  })

  async function createAndContinue() {
    if (!found) return
    setSubmitError(undefined)
    try {
      const study = await studiesApi.create(found)
      setCreated(study)
      goTo(1)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'We could not create this study.')
    }
  }

  /* ---------------------------------------------------------- step three */

  const [publishing, setPublishing] = React.useState(false)

  async function finish(withPromotion: boolean) {
    if (!created) return
    setSubmitError(undefined)
    if (withPromotion) {
      setPromotionAttempted(true)
      if (!isPromotionValid(promotion)) return
    }
    setPublishing(true)
    try {
      if (withPromotion) {
        await studiesApi.promote(created.id, promotion)
        toast.success(
          'Study promoted',
          'It is now visible to participants searching for trials.',
        )
      } else {
        toast.success('Study created', 'You can promote it later from the study overview.')
      }
      navigate(`/studies/${created.id}`)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'We could not save this study.')
    } finally {
      setPublishing(false)
    }
  }

  const completed = new Set<number>()
  if (created) completed.add(0)
  if (promote) completed.add(1)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/studies">
          <ArrowLeft aria-hidden="true" />
          Back to studies
        </Link>
      </Button>

      <PageHeader
        headingRef={headingRef}
        eyebrow="New study"
        title={STEPS[step].label}
        description={
          step === 0
            ? 'Studies are created from their ClinicalTrials.gov registry number so the details always match the registry.'
            : step === 1
              ? 'Decide whether participants should be able to find this study and sign up themselves.'
              : 'Write the plain-language summary participants will read before they sign up.'
        }
      />

      <WizardStepper
        className="border-b border-border pb-2"
        steps={promote === 'no' ? STEPS.slice(0, 2) : STEPS}
        currentIndex={step}
        completed={completed}
        onStepSelect={(index) => index < step && goTo(index)}
      />

      {submitError && (
        <Alert tone="error" title="Something went wrong">
          {submitError}
        </Alert>
      )}

      {step === 0 && (
        <section className="space-y-5">
          <form className="space-y-4" onSubmit={findForm.submit} noValidate>
            <FormField
              id="study-nct"
              label="NCT number"
              hint="Eight digits after NCT, as it appears on ClinicalTrials.gov."
              error={findForm.errors.nctId}
              required
            >
              {(aria) => (
                <div className="flex gap-2">
                  <Input
                    {...aria}
                    {...findForm.field('nctId')}
                    placeholder="NCT01234567"
                    className="font-mono"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Button type="submit" variant="primary" loading={findForm.submitting}>
                    <Search aria-hidden="true" />
                    Find
                  </Button>
                </div>
              )}
            </FormField>
          </form>

          {lookupError && (
            <Alert
              live
              tone={lookupError.code === 'duplicate' ? 'warning' : 'error'}
              title={
                lookupError.code === 'duplicate'
                  ? 'This study is already on your site'
                  : 'We could not find that study'
              }
            >
              <p>{lookupError.message}</p>
              {lookupError.code === 'duplicate' ? (
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link to={`/studies?q=${encodeURIComponent(findForm.values.nctId)}`}>
                    Open it in Studies
                  </Link>
                </Button>
              ) : (
                <p className="mt-2 text-xs">
                  Registry numbers available in this build:{' '}
                  <span className="id">{REGISTRY_SAMPLE_IDS.join(', ')}</span>
                </p>
              )}
            </Alert>
          )}

          {found && (
            <div className="rounded-lg border border-success/30 bg-success/[0.06] p-5">
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Found in the registry</p>
                  <h2 className="mt-2 text-base font-semibold text-foreground">{found.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{found.summary}</p>
                  <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                    <Detail label="NCT number" value={<span className="id">{found.nctId}</span>} />
                    <Detail label="Condition" value={found.condition} />
                    <Detail label="Phase" value={found.phase} />
                    <Detail label="Sponsor" value={found.sponsor} />
                  </dl>
                  <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFound(null)
                        findForm.reset()
                      }}
                    >
                      <X aria-hidden="true" />
                      Not this one
                    </Button>
                    <Button variant="brand" onClick={createAndContinue}>
                      Create this study
                      <ArrowRight aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {step === 1 && created && (
        <section className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-medium text-foreground">{created.title}</p>
            <p className="id mt-0.5 text-xs text-muted-foreground">
              {created.id} · {created.nctId}
            </p>
          </div>

          <FieldSet legend="Should participants be able to find this study?" required>
            <RadioGroup
              value={promote}
              onValueChange={(value) => setPromote(value as 'yes' | 'no')}
              aria-label="Promote this study"
            >
              <RadioCard
                id="btnYesPromote"
                value="yes"
                label="Yes, promote it"
                description="The study is listed publicly. Participants can search for it, answer your pre-screening questions and sign up themselves."
              />
              <RadioCard
                id="btnNoPromote"
                value="no"
                label="No, not for now"
                description="The study stays internal. You can still add participants yourself, and you can promote it later from the study overview."
              />
            </RadioGroup>
          </FieldSet>

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={() => goTo(0)} disabled>
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
            {promote === 'no' ? (
              <Button variant="brand" size="lg" onClick={() => finish(false)} loading={publishing}>
                <Check aria-hidden="true" />
                Finish
              </Button>
            ) : (
              <Button
                variant="brand"
                size="lg"
                onClick={() => goTo(2)}
                disabled={promote !== 'yes'}
              >
                Next
                <ArrowRight aria-hidden="true" />
              </Button>
            )}
          </div>
        </section>
      )}

      {step === 2 && created && (
        <section className="space-y-8">
          <PromotionBuilder
            study={created}
            promotion={promotion}
            onChange={setPromotion}
            showErrors={promotionAttempted}
          />

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={() => goTo(1)}>
              <ArrowLeft aria-hidden="true" />
              Back
            </Button>
            <Button variant="brand" size="lg" onClick={() => finish(true)} loading={publishing}>
              <Check aria-hidden="true" />
              Proceed with promote
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  )
}
