import * as React from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CheckCircle2, HeartHandshake } from 'lucide-react'
import { ApiError, publicApi } from '@/data/api'
import type { PrescreeningQuestion, PublicTrial } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { useForm } from '@/lib/use-form'
import { all, email as emailRule, phone as phoneRule, required, zip as zipRule } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { DateField } from '@/components/ui/date-field'
import { CheckboxField } from '@/components/ui/checkbox'
import { RadioCard, RadioGroup } from '@/components/ui/radio-group'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { FieldSet, FormField } from '@/components/patterns/form-field'
import { FormSection, FullWidth } from '@/components/patterns/form-section'
import { ErrorSummary } from '@/components/patterns/error-summary'
import { WizardStepper } from '@/components/patterns/wizard-stepper'
import { ETHNICITIES, GENDERS, PRIMARY_LANGUAGES, SMOKING_STATUSES } from '@/data/reference'
import { EnrollmentSuccess } from './enrollment-success'
import { NotAMatch } from './not-a-match'

const LABELS: Record<string, string> = {
  firstname: 'First name',
  lastname: 'Last name',
  email: 'Email address',
  phone: 'Phone number',
  city: 'City',
  zipcode: 'Postal code',
  gender: 'Sex assigned at birth',
  currentgender: 'Gender you identify with',
  dateofbirth: 'Date of birth',
  smokingstatus: 'Smoking status',
  primarylanguage: 'Primary language',
  healthcondition: 'About your health',
  terms: 'Terms and privacy notice',
}

/**
 * Participant sign-up.
 *
 * The legacy version put pre-screening radios, fourteen personal fields, two
 * consent checkboxes and the submit button on one unbroken page, then reported
 * failure through a native browser `alert()`. Splitting it into check, details
 * and consent means a participant knows how much is left, an ineligible answer
 * is handled kindly instead of silently, and errors appear next to the field
 * that caused them.
 */
export function EnrollmentPage() {
  const { nctId = '' } = useParams()
  const trial = useAsync(() => publicApi.get(nctId), [nctId])
  const questions = useAsync(() => publicApi.prescreening(nctId), [nctId])

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={`/trials/${nctId}`}>
          <ArrowLeft aria-hidden="true" />
          Back to the study
        </Link>
      </Button>

      <AsyncBoundary
        state={trial}
        loading={
          <div className="mt-6 space-y-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-96" />
          </div>
        }
        errorTitle="We could not load this study"
      >
        {(loadedTrial) => (
          <AsyncBoundary
            state={questions}
            loading={<Skeleton className="mt-6 h-96" />}
            errorTitle="We could not load the sign-up questions"
          >
            {(loadedQuestions) => <Flow trial={loadedTrial} questions={loadedQuestions} />}
          </AsyncBoundary>
        )}
      </AsyncBoundary>
    </div>
  )
}

function Flow({ trial, questions }: { trial: PublicTrial; questions: PrescreeningQuestion[] }) {
  const hasScreening = questions.length > 0
  const steps = [
    ...(hasScreening ? [{ id: 'check', label: 'A few questions' }] : []),
    { id: 'about', label: 'About you' },
    { id: 'consent', label: 'Consent' },
  ]

  const [step, setStep] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, string>>({})
  const [screeningAttempted, setScreeningAttempted] = React.useState(false)
  const [outcome, setOutcome] = React.useState<
    { kind: 'success'; participantId: string } | { kind: 'ineligible' } | null
  >(null)
  const headingRef = React.useRef<HTMLHeadingElement>(null)

  function goTo(next: number) {
    setStep(next)
    window.requestAnimationFrame(() => headingRef.current?.focus())
  }

  if (outcome?.kind === 'success') {
    return <EnrollmentSuccess trial={trial} participantId={outcome.participantId} />
  }
  if (outcome?.kind === 'ineligible') {
    return <NotAMatch trial={trial} />
  }

  const unanswered = questions.filter((q) => !answers[q.id])
  const screeningIndex = hasScreening ? 0 : -1
  const aboutIndex = hasScreening ? 1 : 0
  const consentIndex = aboutIndex + 1

  function submitScreening() {
    setScreeningAttempted(true)
    if (unanswered.length > 0) return
    const failed = questions.some(
      (q) => q.correctAnswer && q.desiredAnswer && answers[q.id] !== q.desiredAnswer,
    )
    if (failed) {
      setOutcome({ kind: 'ineligible' })
      return
    }
    goTo(aboutIndex)
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-muted-foreground">Signing up for</p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-1 text-2xl font-semibold leading-snug text-foreground outline-none"
      >
        {trial.title}
      </h1>

      <WizardStepper
        className="mt-6 border-b border-border pb-2"
        steps={steps}
        currentIndex={step}
        completed={new Set(Array.from({ length: step }, (_, i) => i))}
        onStepSelect={(index) => index < step && goTo(index)}
      />

      <div className="mt-8">
        {step === screeningIndex && (
          <section className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                First, a few questions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                These check whether this study is right for you. Answering them does not sign you
                up.
              </p>
            </div>

            {screeningAttempted && unanswered.length > 0 && (
              <Alert
                tone="error"
                title={`Please answer ${unanswered.length === 1 ? 'the remaining question' : `all ${questions.length} questions`}`}
              />
            )}

            <ol className="space-y-6">
              {questions.map((question, index) => (
                <li key={question.id}>
                  <FieldSet
                    legend={question.question}
                    required
                    error={
                      screeningAttempted && !answers[question.id]
                        ? 'Choose an answer'
                        : undefined
                    }
                  >
                    <RadioGroup
                      value={answers[question.id] ?? ''}
                      onValueChange={(value) =>
                        setAnswers((prev) => ({ ...prev, [question.id]: value }))
                      }
                      aria-label={question.question}
                    >
                      {(question.choices.length > 0 ? question.choices : ['Yes', 'No']).map(
                        (choice, choiceIndex) => (
                          <RadioCard
                            key={choice}
                            id={`q${index}-${choiceIndex}`}
                            value={choice}
                            label={choice}
                          />
                        ),
                      )}
                    </RadioGroup>
                  </FieldSet>
                </li>
              ))}
            </ol>

            <div className="flex justify-end border-t border-border pt-6">
              <Button variant="brand" size="lg" onClick={submitScreening}>
                Next
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </section>
        )}

        {step >= aboutIndex && (
          <DetailsAndConsent
            trial={trial}
            questions={questions}
            answers={answers}
            step={step}
            aboutIndex={aboutIndex}
            consentIndex={consentIndex}
            onBack={() => goTo(step - 1)}
            onContinue={() => goTo(consentIndex)}
            onSuccess={(participantId) => setOutcome({ kind: 'success', participantId })}
          />
        )}
      </div>
    </div>
  )
}

function DetailsAndConsent({
  trial,
  questions,
  answers,
  step,
  aboutIndex,
  consentIndex,
  onBack,
  onContinue,
  onSuccess,
}: {
  trial: PublicTrial
  questions: PrescreeningQuestion[]
  answers: Record<string, string>
  step: number
  aboutIndex: number
  consentIndex: number
  onBack: () => void
  onContinue: () => void
  onSuccess: (participantId: string) => void
}) {
  const [notificationConsent, setNotificationConsent] = React.useState(false)
  const [termsConsent, setTermsConsent] = React.useState(false)
  const [consentAttempted, setConsentAttempted] = React.useState(false)
  const [serverError, setServerError] = React.useState<string>()

  const form = useForm({
    initialValues: {
      firstname: '',
      lastname: '',
      email: '',
      phone: '',
      city: '',
      zipcode: '',
      gender: '',
      currentgender: '',
      dateofbirth: '',
      smokingstatus: '',
      primarylanguage: '',
      healthcondition: '',
      ethnicity: [] as string[],
    },
    rules: {
      firstname: required(LABELS.firstname),
      lastname: required(LABELS.lastname),
      email: all(required(LABELS.email), emailRule),
      phone: all(required(LABELS.phone), phoneRule),
      city: required(LABELS.city),
      zipcode: all(required(LABELS.zipcode), zipRule),
      gender: required(LABELS.gender),
      dateofbirth: required(LABELS.dateofbirth),
      smokingstatus: required(LABELS.smokingstatus),
      primarylanguage: required(LABELS.primarylanguage),
      healthcondition: required(LABELS.healthcondition),
    },
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setConsentAttempted(true)
    const result = await form.submit()
    if (!result.ok || !termsConsent) return

    setServerError(undefined)
    try {
      const { participantId } = await publicApi.enroll({
        nctId: trial.nctId,
        firstName: form.values.firstname,
        lastName: form.values.lastname,
        email: form.values.email,
        phone: form.values.phone,
        city: form.values.city,
        zipcode: form.values.zipcode,
        gender: form.values.gender,
        dateOfBirth: form.values.dateofbirth,
        smokingStatus: form.values.smokingstatus,
        primaryLanguage: form.values.primarylanguage,
        ethnicity: form.values.ethnicity,
        healthCondition: form.values.healthcondition,
        prescreeningAnswers: questions.map((q) => ({
          question: q.question,
          answer: answers[q.id] ?? '',
        })),
      })
      onSuccess(participantId)
    } catch (error) {
      setServerError(
        error instanceof ApiError
          ? error.message
          : 'We could not complete your sign-up. Please try again.',
      )
    }
  }

  const termsError = consentAttempted && !termsConsent ? 'You need to accept these to sign up' : undefined

  async function continueToConsent() {
    const result = await form.submit()
    if (result.ok) onContinue()
  }

  return (
    <form onSubmit={submit} noValidate>
      {/* Step: about you */}
      <div hidden={step !== aboutIndex}>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">About you</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The study team needs this to check you are eligible and to get in touch.
          </p>
        </div>

        {form.submitAttempted && step === aboutIndex && (
          <div className="mb-6">
            <ErrorSummary errors={form.errors} labels={LABELS} />
          </div>
        )}

        <div className="space-y-8">
          <FormSection title="Your name and contact details">
            <FormField id="firstname" label={LABELS.firstname} error={form.errors.firstname} required>
              {(aria) => (
                <Input {...aria} {...form.field('firstname')} name="firstname" autoComplete="given-name" />
              )}
            </FormField>

            <FormField id="lastname" label={LABELS.lastname} error={form.errors.lastname} required>
              {(aria) => (
                <Input {...aria} {...form.field('lastname')} name="lastname" autoComplete="family-name" />
              )}
            </FormField>

            <FormField id="email" label={LABELS.email} error={form.errors.email} required>
              {(aria) => (
                <Input {...aria} {...form.field('email')} name="email" type="email" autoComplete="email" />
              )}
            </FormField>

            <FormField id="phone" label={LABELS.phone} error={form.errors.phone} required>
              {(aria) => (
                <Input {...aria} {...form.field('phone')} name="phone" type="tel" autoComplete="tel" />
              )}
            </FormField>

            <FormField id="city" label={LABELS.city} error={form.errors.city} required>
              {(aria) => (
                <Input {...aria} {...form.field('city')} name="city" autoComplete="address-level2" />
              )}
            </FormField>

            <FormField id="zipcode" label={LABELS.zipcode} error={form.errors.zipcode} required>
              {(aria) => (
                <Input {...aria} {...form.field('zipcode')} name="zipcode" autoComplete="postal-code" />
              )}
            </FormField>
          </FormSection>

          <FormSection
            title="About you"
            description="Studies need this to make sure results apply fairly to everyone."
          >
            <FormField
              id="dateofbirth"
              label={LABELS.dateofbirth}
              error={form.errors.dateofbirth}
              required
            >
              {(aria) => (
                <DateField {...aria} {...form.field('dateofbirth')} name="dateofbirth" autoComplete="bday" />
              )}
            </FormField>

            <FormField id="gender" label={LABELS.gender} error={form.errors.gender} required>
              {(aria) => (
                <Select
                  {...aria}
                  {...form.field('gender')}
                  name="gender"
                  options={GENDERS}
                  placeholder="Select an answer"
                />
              )}
            </FormField>

            <FormField
              id="currentgender"
              label={LABELS.currentgender}
              hint="Optional. Leave blank if it is the same."
            >
              {(aria) => <Input {...aria} {...form.field('currentgender')} name="currentgender" />}
            </FormField>

            <FormField
              id="primarylanguage"
              label={LABELS.primarylanguage}
              error={form.errors.primarylanguage}
              required
            >
              {(aria) => (
                <Select
                  {...aria}
                  {...form.field('primarylanguage')}
                  name="primarylanguage"
                  options={PRIMARY_LANGUAGES}
                  placeholder="Select a language"
                />
              )}
            </FormField>

            <FormField
              id="smokingstatus"
              label={LABELS.smokingstatus}
              error={form.errors.smokingstatus}
              required
            >
              {(aria) => (
                <Select
                  {...aria}
                  {...form.field('smokingstatus')}
                  name="smokingstatus"
                  options={SMOKING_STATUSES}
                  placeholder="Select an answer"
                />
              )}
            </FormField>

            <FullWidth>
              <FieldSet
                legend="Race or ethnicity"
                hint="Optional. Select all that apply."
              >
                <div className="grid gap-1 sm:grid-cols-2">
                  {ETHNICITIES.map((option) => (
                    <CheckboxField
                      key={option}
                      id={`ethnicity-${option}`}
                      label={option}
                      checked={form.values.ethnicity.includes(option)}
                      onCheckedChange={(checked) =>
                        form.setValue(
                          'ethnicity',
                          checked
                            ? [...form.values.ethnicity, option]
                            : form.values.ethnicity.filter((e) => e !== option),
                        )
                      }
                    />
                  ))}
                </div>
              </FieldSet>
            </FullWidth>

            <FullWidth>
              <FormField
                id="healthcondition"
                label={LABELS.healthcondition}
                hint="In your own words: when you were diagnosed, and how it is managed now."
                error={form.errors.healthcondition}
                required
              >
                {(aria) => (
                  <Textarea {...aria} {...form.field('healthcondition')} name="healthcondition" rows={4} />
                )}
              </FormField>
            </FullWidth>
          </FormSection>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={onBack} disabled={aboutIndex === 0}>
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>
          <Button type="button" variant="brand" size="lg" onClick={continueToConsent}>
            Next
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Step: consent */}
      <div hidden={step !== consentIndex}>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground">Before you sign up</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Signing up is not the same as joining the study. The study team will contact you, explain
            everything and answer your questions first.
          </p>
        </div>

        {serverError && (
          <Alert tone="error" title="We could not complete your sign-up" className="mb-6">
            {serverError}
          </Alert>
        )}

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex gap-3">
            <HeartHandshake className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
            <div className="space-y-2 text-sm leading-6 text-muted-foreground">
              <p className="font-medium text-foreground">What happens next</p>
              <ul className="space-y-1.5">
                <li>The study team at {trial.locations[0]} reviews your answers.</li>
                <li>They contact you to talk it through — usually within a few days.</li>
                <li>Nothing begins until you have given informed consent in person.</li>
                <li>You can withdraw at any point without giving a reason.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-1">
          <CheckboxField
            id="notification-consent"
            checked={notificationConsent}
            onCheckedChange={setNotificationConsent}
            label="I consent to receive periodic notifications via SMS, WhatsApp, and the mobile app."
            description="Optional. Reminders about visits and check-ins."
          />

          <div>
            <CheckboxField
              id="terms-consent"
              checked={termsConsent}
              onCheckedChange={(checked) => {
                setTermsConsent(checked)
                if (checked) setConsentAttempted(false)
              }}
              label={
                <>
                  I have read and accept the{' '}
                  <Link
                    to="/about"
                    className="font-medium text-brand underline underline-offset-4"
                  >
                    terms and privacy notice
                  </Link>
                  .
                </>
              }
            />
            {termsError && (
              <p role="alert" className="ml-8 text-xs font-medium text-destructive">
                {termsError}
              </p>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft aria-hidden="true" />
            Back
          </Button>
          <Button type="submit" variant="brand" size="lg" loading={form.submitting}>
            <CheckCircle2 aria-hidden="true" />
            Complete Sign Up
          </Button>
        </div>
      </div>
    </form>
  )
}
