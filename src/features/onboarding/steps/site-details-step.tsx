import * as React from 'react'
import { Check, Lock } from 'lucide-react'
import { siteApi } from '@/data/api'
import { cn } from '@/lib/cn'
import { useForm } from '@/lib/use-form'
import { required } from '@/lib/validators'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { ImagePicker } from '@/components/ui/file-drop'
import { ListInput } from '@/components/ui/list-input'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { FormSection, FullWidth } from '@/components/patterns/form-section'
import { ErrorSummary } from '@/components/patterns/error-summary'
import { AddressFields } from '@/components/patterns/address-fields'
import { THERAPY_AREAS, TIME_ZONES } from '@/data/reference'
import type { StepProps } from '../types'

const LABELS = {
  briefDescription: 'Brief description',
  timeZone: 'Time zone',
  'site-street': 'Street',
  'site-city': 'City',
  'site-state': 'State or province',
  'site-country': 'Country',
  'site-zip': 'Postal code',
}

/**
 * Step 1 — the site record itself.
 *
 * Site name, number and administrator arrive pre-filled from registration and
 * are read-only (shown as a locked panel, not greyed-out inputs that look
 * broken). Everything editable lives in one form so "unsaved changes" is tracked
 * across the toggle and branding too, and a single footer owns the save.
 */
export function SiteDetailsStep({ data, reload }: StepProps) {
  const toast = useToast()
  const summaryRef = React.useRef<HTMLDivElement>(null)

  const initialValues = React.useMemo(
    () => ({
      briefDescription: data.site.briefDescription,
      timeZone: data.site.timeZone,
      active: data.site.active,
      logoName: data.site.logoName,
      mobileImageName: data.site.mobileImageName,
      mobileImageUrl: data.site.mobileImageUrl ?? '',
      street: data.site.address.street,
      city: data.site.address.city,
      state: data.site.address.state,
      zip: data.site.address.zip,
      country: data.site.address.country,
      conditions: data.site.conditions ?? [],
      keywords: data.site.keywords ?? [],
      therapyArea: data.site.therapyArea ?? '',
      capacity: String(data.site.capacity ?? 0),
      expectedEnrollment: String(data.site.expectedEnrollment ?? 0),
      totalEnrollment: String(data.site.totalEnrollment ?? 0),
    }),
    [data],
  )

  const [savedSig, setSavedSig] = React.useState(() => JSON.stringify(initialValues))
  const [savedOnce, setSavedOnce] = React.useState(false)

  const form = useForm({
    initialValues,
    rules: {
      briefDescription: required(LABELS.briefDescription),
      timeZone: required(LABELS.timeZone),
      city: required('City'),
      state: required('State or province'),
      country: required('Country'),
    },
    onSubmit: async (values) => {
      await siteApi.update({
        briefDescription: values.briefDescription,
        timeZone: values.timeZone,
        active: values.active,
        logoName: values.logoName,
        mobileImageName: values.mobileImageName,
        mobileImageUrl: values.mobileImageUrl,
        address: {
          street: values.street,
          city: values.city,
          state: values.state,
          zip: values.zip,
          country: values.country,
        },
        conditions: values.conditions,
        keywords: values.keywords,
        therapyArea: values.therapyArea,
        capacity: Number(values.capacity) || 0,
        expectedEnrollment: Number(values.expectedEnrollment) || 0,
        totalEnrollment: Number(values.totalEnrollment) || 0,
      })
      setSavedSig(JSON.stringify(values))
      setSavedOnce(true)
      toast.success('Site details saved', 'Your changes are stored.')
      reload()
    },
  })

  const dirty = JSON.stringify(form.values) !== savedSig

  async function handleSubmit(event: React.FormEvent) {
    const result = await form.submit(event)
    if (!result.ok) {
      // Move focus to the summary so keyboard and screen-reader users land on
      // the list of what failed rather than staying on the submit button.
      window.requestAnimationFrame(() => summaryRef.current?.focus())
    }
  }

  const summaryErrors = {
    briefDescription: form.errors.briefDescription,
    timeZone: form.errors.timeZone,
    'site-city': form.errors.city,
    'site-state': form.errors.state,
    'site-country': form.errors.country,
  }

  return (
    <form className="space-y-10" onSubmit={handleSubmit} noValidate>
      <div ref={summaryRef} tabIndex={-1} className="outline-none">
        {form.submitAttempted && <ErrorSummary errors={summaryErrors} labels={LABELS} />}
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Your site
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-3.5 shrink-0" aria-hidden="true" />
            Set when your site was registered. Contact support to change these.
          </p>
        </div>

        <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          <IdentityCell label="Site name" value={data.site.name} />
          <IdentityCell label="Site number" value={data.site.number} mono />
          <IdentityCell label="Administrator" value={data.site.adminName} />
          <IdentityCell label="Vendor" value={data.site.vendor ?? 'PatienTrials'} />
          <IdentityCell label="Site hierarchy" value={data.site.siteHierarchy ?? 'Not set'} />
          <IdentityCell
            label="Pre-approved site hierarchy"
            value={data.site.preApprovedSiteHierarchy ?? 'Not set'}
          />
        </dl>

        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Site is active</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Only active sites can be assigned to new studies.
            </p>
          </div>
          <Switch
            id="site-active"
            checked={form.values.active}
            onCheckedChange={(v) => form.setValue('active', v)}
          />
        </div>
      </section>

      <FormSection
        title="About the site"
        description="Shown to sponsors reviewing your site and to participants on promoted studies."
        columns={1}
      >
        <FormField
          id="briefDescription"
          label={LABELS.briefDescription}
          hint="A couple of sentences on your specialisms, capacity and locations."
          error={form.errors.briefDescription}
          required
        >
          {(aria) => <Textarea {...aria} {...form.field('briefDescription')} rows={4} />}
        </FormField>

        <FormField id="timeZone" label={LABELS.timeZone} error={form.errors.timeZone} required>
          {(aria) => (
            <Select
              {...aria}
              {...form.field('timeZone')}
              options={TIME_ZONES}
              placeholder="Select a time zone"
              className="sm:max-w-md"
            />
          )}
        </FormField>
      </FormSection>

      <FormSection
        title="Facility information"
        description="The conditions you run trials in and your enrolment capacity. Sponsors weigh this when they consider your site."
      >
        <FullWidth>
          <FormField
            id="site-conditions"
            label="Conditions"
            hint="The conditions your site actively runs trials in."
          >
            {(aria) => (
              <ListInput
                {...aria}
                chips
                label="Conditions added"
                placeholder="Add a condition, e.g. Heart Failure"
                items={form.values.conditions}
                onChange={(items) => form.setValue('conditions', items)}
              />
            )}
          </FormField>
        </FullWidth>

        <FullWidth>
          <FormField
            id="site-keywords"
            label="Keywords"
            hint="Terms a sponsor might search your site by."
          >
            {(aria) => (
              <ListInput
                {...aria}
                chips
                label="Keywords added"
                placeholder="Add a keyword, e.g. cardiology"
                items={form.values.keywords}
                onChange={(items) => form.setValue('keywords', items)}
              />
            )}
          </FormField>
        </FullWidth>

        <FullWidth>
          <FormField id="site-therapyArea" label="Therapy area">
            {(aria) => (
              <Combobox
                {...aria}
                options={THERAPY_AREAS.map((t) => ({ value: t, label: t }))}
                value={form.values.therapyArea || undefined}
                onChange={(value) => form.setValue('therapyArea', value ?? '')}
                placeholder="Select a therapy area"
                searchPlaceholder="Search therapy areas"
              />
            )}
          </FormField>
        </FullWidth>

        <FullWidth>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              id="site-capacity"
              label="Capacity"
              hint="Participants you can support at once."
            >
              {(aria) => (
                <Input {...aria} {...form.field('capacity')} inputMode="numeric" autoComplete="off" />
              )}
            </FormField>

            <FormField id="site-expectedEnrollment" label="Expected total enrollment">
              {(aria) => (
                <Input
                  {...aria}
                  {...form.field('expectedEnrollment')}
                  inputMode="numeric"
                  autoComplete="off"
                />
              )}
            </FormField>

            <FormField id="site-totalEnrollment" label="Total enrollment">
              {(aria) => (
                <Input
                  {...aria}
                  {...form.field('totalEnrollment')}
                  inputMode="numeric"
                  autoComplete="off"
                />
              )}
            </FormField>
          </div>
        </FullWidth>
      </FormSection>

      <FormSection
        title="Branding"
        description="Optional. Appears on your participant-facing study pages."
        columns={1}
      >
        <ImagePicker
          id="site-logo"
          label="Logo"
          hint="PNG or JPG. A square image works best."
          value={form.values.logoName}
          onChange={(name) => form.setValue('logoName', name)}
        />
        <ImagePicker
          id="site-mobile-image"
          label="Mobile image"
          hint="PNG or JPG. Shown on smaller screens."
          value={form.values.mobileImageName}
          onChange={(name) => form.setValue('mobileImageName', name)}
        />

        <FormField
          id="site-mobileImageUrl"
          label="Mobile image URL"
          hint="Optional. Link a hosted image instead of uploading one."
        >
          {(aria) => (
            <Input
              {...aria}
              {...form.field('mobileImageUrl')}
              type="url"
              inputMode="url"
              autoComplete="off"
              placeholder="https://images.yoursite.com/mobile.png"
            />
          )}
        </FormField>
      </FormSection>

      <FormSection title="Location">
        <AddressFields
          idPrefix="site"
          values={{
            street: form.values.street,
            city: form.values.city,
            state: form.values.state,
            zip: form.values.zip,
            country: form.values.country,
          }}
          errors={{
            street: form.errors.street,
            city: form.errors.city,
            state: form.errors.state,
            zip: form.errors.zip,
            country: form.errors.country,
          }}
          bind={(key) => form.field(key)}
          onCountryChange={(value) => {
            form.setValue('country', value)
            form.blur('country')
          }}
        />
      </FormSection>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-end">
        <p aria-live="polite" className="text-sm sm:mr-auto">
          {dirty ? (
            <span className="text-muted-foreground">You have unsaved changes.</span>
          ) : savedOnce ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-success">
              <Check className="size-4" aria-hidden="true" />
              All changes saved
            </span>
          ) : null}
        </p>
        <Button
          type="submit"
          variant="brand"
          loading={form.submitting}
          loadingLabel="Saving"
          disabled={!dirty}
        >
          Save changes
        </Button>
      </div>
    </form>
  )
}

function IdentityCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-sunken px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('mt-0.5 text-sm font-medium text-foreground', mono && 'font-mono')}>
        {value}
      </dd>
    </div>
  )
}
