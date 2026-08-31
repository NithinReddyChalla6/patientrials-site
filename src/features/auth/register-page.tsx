import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Brand } from '@/components/layout/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { Combobox } from '@/components/ui/combobox'
import { FormField } from '@/components/patterns/form-field'
import { FormSection, FullWidth } from '@/components/patterns/form-section'
import { ErrorSummary } from '@/components/patterns/error-summary'
import { useForm } from '@/lib/use-form'
import { all, email as emailRule, matches, password as passwordRule, required } from '@/lib/validators'
import { COUNTRIES, TIME_ZONES } from '@/data/reference'
import { auth } from '@/data/api'
import type { Persona, Role } from '@/data/types'
import { LegalAgreementDialog } from './legal-agreement'

/** Which console role each registration persona becomes. */
const PERSONA_ROLE: Record<Persona, Role> = {
  site_admin: 'site_administrator',
  site_network_admin: 'site_administrator',
  independent_nurse: 'clinical_staff',
  participant: 'clinical_staff',
}

const PERSONA_COPY: Record<Persona, { title: string; description: string; orgLabel: string }> = {
  site_admin: {
    title: 'Register a site',
    description:
      'Create your site on PatienTrials. After you sign in you will complete a short setup covering your trial history, IRB, labs, facilities and team.',
    orgLabel: 'Site name',
  },
  site_network_admin: {
    title: 'Register a site network',
    description:
      'Create a network account so you can oversee several site locations from one place.',
    orgLabel: 'Network name',
  },
  independent_nurse: {
    title: 'Register as an independent nurse',
    description: 'Create a nurse profile so sites can assign you to participant visits.',
    orgLabel: 'Practice name',
  },
  participant: {
    title: 'Register',
    description: 'Create an account.',
    orgLabel: 'Organisation',
  },
}

const LABELS = {
  country: 'Country',
  timeZone: 'Time zone',
  orgName: 'Site name',
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email address',
  password: 'Password',
  confirmPassword: 'Confirm password',
}

/**
 * Account registration.
 *
 * The legacy form was a single unlabelled column of eight fields floated over a
 * stock photograph, with placeholders standing in for labels and no feedback
 * until submit. Here the same eight fields are grouped into "About you" and
 * "About your site", every control is labelled, validation runs on blur, and
 * the legal agreement is an explicit, readable step rather than a modal that
 * appears after the fact.
 */
export function RegisterPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const persona = (params.get('as') as Persona | null) ?? 'site_admin'
  const copy = PERSONA_COPY[persona] ?? PERSONA_COPY.site_admin

  const [agreementOpen, setAgreementOpen] = React.useState(false)
  const [serverError, setServerError] = React.useState<string>()

  const form = useForm({
    initialValues: {
      country: 'United States of America',
      timeZone: '',
      orgName: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    rules: {
      country: required(LABELS.country),
      timeZone: required(LABELS.timeZone),
      orgName: required(copy.orgLabel),
      firstName: required(LABELS.firstName),
      lastName: required(LABELS.lastName),
      email: all(required(LABELS.email), emailRule),
      password: all(required(LABELS.password), passwordRule),
      confirmPassword: required(LABELS.confirmPassword),
    },
  })

  // Confirm-password has to see the current password, so it is checked here.
  const confirmError =
    form.errors.confirmPassword ??
    (form.touched.confirmPassword || form.submitAttempted
      ? matches(form.values.password, 'Passwords')(form.values.confirmPassword)
      : undefined)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = await form.submit()
    if (!result.ok || confirmError) return
    setAgreementOpen(true)
  }

  async function onAccept() {
    setServerError(undefined)
    try {
      await auth.register({
        email: form.values.email,
        firstName: form.values.firstName,
        lastName: form.values.lastName,
        password: form.values.password,
        role: PERSONA_ROLE[persona] ?? 'site_administrator',
      })
      setAgreementOpen(false)
      navigate('/register/submitted', {
        state: { email: form.values.email, orgName: form.values.orgName },
        replace: true,
      })
    } catch (error) {
      setAgreementOpen(false)
      setServerError(error instanceof Error ? error.message : 'Registration failed.')
    }
  }

  const visibleErrors = { ...form.errors, ...(confirmError ? { confirmPassword: confirmError } : {}) }

  return (
    <div className="min-h-dvh bg-background">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">
              <ArrowLeft aria-hidden="true" />
              Back to sign in
            </Link>
          </Button>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{copy.description}</p>

        <form className="mt-8 space-y-8" onSubmit={onSubmit} noValidate>
          {serverError && (
            <Alert tone="error" title="We could not create your account">
              {serverError}
            </Alert>
          )}

          {form.submitAttempted && (
            <ErrorSummary
              errors={visibleErrors}
              labels={{ ...LABELS, orgName: copy.orgLabel }}
            />
          )}

          <FormSection
            title="About you"
            description="This becomes your sign-in and the administrator account for the site."
          >
            <FormField id="firstName" label={LABELS.firstName} error={form.errors.firstName} required>
              {(aria) => (
                <Input {...aria} {...form.field('firstName')} autoComplete="given-name" />
              )}
            </FormField>

            <FormField id="lastName" label={LABELS.lastName} error={form.errors.lastName} required>
              {(aria) => <Input {...aria} {...form.field('lastName')} autoComplete="family-name" />}
            </FormField>

            <FullWidth>
              <FormField
                id="email"
                label={LABELS.email}
                hint="You will use this to sign in."
                error={form.errors.email}
                required
              >
                {(aria) => (
                  <Input {...aria} {...form.field('email')} type="email" autoComplete="email" />
                )}
              </FormField>
            </FullWidth>

            <FormField
              id="password"
              label={LABELS.password}
              hint="At least 8 characters, including a letter and a number."
              error={form.errors.password}
              required
            >
              {(aria) => (
                <Input
                  {...aria}
                  {...form.field('password')}
                  type="password"
                  autoComplete="new-password"
                />
              )}
            </FormField>

            <FormField
              id="confirmPassword"
              label={LABELS.confirmPassword}
              error={confirmError}
              required
            >
              {(aria) => (
                <Input
                  {...aria}
                  {...form.field('confirmPassword')}
                  type="password"
                  autoComplete="new-password"
                />
              )}
            </FormField>
          </FormSection>

          <FormSection
            title={persona === 'independent_nurse' ? 'About your practice' : 'About your site'}
            description="We use this to set your local time zone and to label records created at your location."
          >
            <FullWidth>
              <FormField id="orgName" label={copy.orgLabel} error={form.errors.orgName} required>
                {(aria) => <Input {...aria} {...form.field('orgName')} />}
              </FormField>
            </FullWidth>

            <FormField id="country" label={LABELS.country} error={form.errors.country} required>
              {(aria) => (
                <Combobox
                  {...aria}
                  options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                  value={form.values.country}
                  onChange={(value) => {
                    form.setValue('country', value ?? '')
                    form.blur('country')
                  }}
                  placeholder="Select a country"
                  searchPlaceholder="Search countries"
                />
              )}
            </FormField>

            <FormField id="timeZone" label={LABELS.timeZone} error={form.errors.timeZone} required>
              {(aria) => (
                <Select
                  {...aria}
                  {...form.field('timeZone')}
                  options={TIME_ZONES}
                  placeholder="Select a time zone"
                />
              )}
            </FormField>
          </FormSection>

          <div className="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              You will be asked to accept the SaaS Services Agreement before your account is created.
            </p>
            <Button type="submit" variant="brand" size="lg" loading={form.submitting}>
              Continue
            </Button>
          </div>
        </form>
      </main>

      <LegalAgreementDialog
        open={agreementOpen}
        onOpenChange={setAgreementOpen}
        companyName={form.values.orgName}
        country={form.values.country}
        onAccept={onAccept}
      />
    </div>
  )
}
