import * as React from 'react'
import { Landmark } from 'lucide-react'
import { siteApi } from '@/data/api'
import { useForm } from '@/lib/use-form'
import { all, numeric, required } from '@/lib/validators'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { CheckboxField } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { FormSection, FullWidth } from '@/components/patterns/form-section'
import { AddressFields } from '@/components/patterns/address-fields'
import { Badge } from '@/components/ui/badge'
import { IRB_MEETING_FREQUENCIES } from '@/data/reference'
import { formatAddress } from '@/lib/format'
import type { IrbDetail, Site } from '@/data/types'
import { AddFormActions, SectionShell } from '../section-shell'
import type { StepProps } from '../types'

/**
 * Step 3 — the review board that approves this site's protocols.
 *
 * The legacy form had eleven required fields in two unlabelled columns and
 * reported all of them at once, after submit, as red chips. The same fields are
 * grouped here into the board, its process and its address, each validating on
 * blur.
 */
export function IrbStep({ data, reload }: StepProps) {
  const toast = useToast()
  const [removingId, setRemovingId] = React.useState<string>()

  async function remove(id: string) {
    setRemovingId(id)
    try {
      await siteApi.removeIrb(id)
      toast.success('IRB removed')
      reload()
    } finally {
      setRemovingId(undefined)
    }
  }

  return (
    <SectionShell
      noun="IRB"
      title="IRB details"
      description="The Institutional Review Board that reviews protocols for your site. Sponsors use the approval timelines here when they plan a study start."
      icon={Landmark}
      items={data.irbDetails.map((irb) => ({
        id: irb.id,
        title: irb.name,
        lines: [
          `Registration ${irb.registrationNumber} · ${irb.meetingFrequency} · about ${irb.averageDaysForApproval} days to approval`,
          formatAddress(irb.address),
        ],
        meta: <Badge tone={irb.centralIrb ? 'info' : 'outline'}>{irb.centralIrb ? 'Central IRB' : 'Local IRB'}</Badge>,
      }))}
      onRemove={remove}
      removingId={removingId}
      emptyTitle="No IRB recorded"
      emptyDescription="Add the review board that approves protocols at your site."
    >
      {(close, editingId) => (
        <IrbForm
          key={editingId ?? 'new'}
          onSaved={close}
          reload={reload}
          hasItems={data.irbDetails.length > 0}
          site={data.site}
          editing={editingId ? data.irbDetails.find((t) => t.id === editingId) : undefined}
        />
      )}
    </SectionShell>
  )
}

function IrbForm({
  onSaved,
  reload,
  hasItems,
  site,
  editing,
}: {
  onSaved: () => void
  reload: () => void
  hasItems: boolean
  site: Site
  editing?: IrbDetail
}) {
  const toast = useToast()
  const [centralIrb, setCentralIrb] = React.useState(editing?.centralIrb ?? false)

  const form = useForm({
    initialValues: {
      name: editing?.name ?? '',
      registrationNumber: editing?.registrationNumber ?? '',
      primaryContact: editing?.primaryContact ?? '',
      processDetails: editing?.processDetails ?? '',
      meetingFrequency: editing?.meetingFrequency ?? '',
      averageDaysForApproval: editing ? String(editing.averageDaysForApproval) : '',
      paymentToIrb: editing?.paymentToIrb ?? '',
      street: editing?.address.street ?? '',
      city: editing?.address.city ?? '',
      state: editing?.address.state ?? '',
      zip: editing?.address.zip ?? '',
      country: editing?.address.country ?? '',
    },
    rules: {
      name: required('IRB name'),
      registrationNumber: required('Registration number'),
      primaryContact: required('Primary contact'),
      processDetails: required('Process details'),
      meetingFrequency: required('Meeting frequency'),
      averageDaysForApproval: all(
        required('Average days for approval'),
        numeric('Average days for approval'),
      ),
      paymentToIrb: required('Payment to IRB'),
      city: required('City'),
      state: required('State or province'),
      country: required('Country'),
    },
    onSubmit: async (values) => {
      const payload = {
        name: values.name,
        registrationNumber: values.registrationNumber,
        centralIrb,
        primaryContact: values.primaryContact,
        processDetails: values.processDetails,
        meetingFrequency: values.meetingFrequency,
        averageDaysForApproval: values.averageDaysForApproval,
        paymentToIrb: values.paymentToIrb,
        address: {
          street: values.street,
          city: values.city,
          state: values.state,
          zip: values.zip,
          country: values.country,
        },
      }
      if (editing) {
        await siteApi.updateIrb(editing.id, payload)
        toast.success('IRB updated')
      } else {
        await siteApi.addIrb(payload)
        toast.success('IRB added')
      }
      form.reset()
      reload()
      onSaved()
    },
  })

  return (
    <form className="space-y-8" onSubmit={form.submit} noValidate>
      <FormSection title="The board">
        <FormField id="irbName" label="IRB name" error={form.errors.name} required>
          {(aria) => <Input {...aria} {...form.field('name')} />}
        </FormField>

        <FormField
          id="irbSite"
          label="Site"
          hint="Set automatically from your registration."
        >
          {(aria) => (
            <Input
              {...aria}
              value={site.name}
              readOnly
              className="bg-sunken text-muted-foreground"
            />
          )}
        </FormField>

        <FormField
          id="irbRegistration"
          label="IRB registration number"
          error={form.errors.registrationNumber}
          required
        >
          {(aria) => <Input {...aria} {...form.field('registrationNumber')} />}
        </FormField>

        <FormField
          id="irbContact"
          label="Primary IRB contact"
          hint="Name of your contact at the review board."
          error={form.errors.primaryContact}
          required
        >
          {(aria) => <Input {...aria} {...form.field('primaryContact')} autoComplete="name" />}
        </FormField>

        <div className="self-end pb-1">
          <CheckboxField
            id="irbCentral"
            checked={centralIrb}
            onCheckedChange={setCentralIrb}
            label="This is a central IRB"
            description="Leave unchecked for a local board."
          />
        </div>
      </FormSection>

      <FormSection title="Review process">
        <FullWidth>
          <FormField
            id="irbProcess"
            label="IRB process details"
            hint="For example: initial submission followed by full board review."
            error={form.errors.processDetails}
            required
          >
            {(aria) => <Textarea {...aria} {...form.field('processDetails')} rows={3} />}
          </FormField>
        </FullWidth>

        <FormField
          id="irbFrequency"
          label="Frequency of IRB meetings"
          error={form.errors.meetingFrequency}
          required
        >
          {(aria) => (
            <Select
              {...aria}
              {...form.field('meetingFrequency')}
              options={IRB_MEETING_FREQUENCIES}
              placeholder="Select a frequency"
            />
          )}
        </FormField>

        <FormField
          id="irbDays"
          label="Average days for approval"
          error={form.errors.averageDaysForApproval}
          required
        >
          {(aria) => (
            <Input
              {...aria}
              {...form.field('averageDaysForApproval')}
              inputMode="numeric"
              autoComplete="off"
            />
          )}
        </FormField>

        <FullWidth>
          <FormField
            id="irbPayment"
            label="Payment to IRBs"
            hint="Who covers the review fee, for example: paid by sponsor."
            error={form.errors.paymentToIrb}
            required
          >
            {(aria) => <Input {...aria} {...form.field('paymentToIrb')} />}
          </FormField>
        </FullWidth>
      </FormSection>

      <FormSection title="IRB address">
        <AddressFields
          idPrefix="irb"
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

      <AddFormActions
        noun="IRB"
        editing={!!editing}
        submitting={form.submitting}
        onCancel={onSaved}
        canCancel={hasItems || !!editing}
      />
    </form>
  )
}
