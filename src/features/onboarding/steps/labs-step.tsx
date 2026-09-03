import * as React from 'react'
import { TestTube } from 'lucide-react'
import { siteApi } from '@/data/api'
import { useForm } from '@/lib/use-form'
import { required } from '@/lib/validators'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { FormSection, FullWidth } from '@/components/patterns/form-section'
import { AddressFields } from '@/components/patterns/address-fields'
import { formatAddress } from '@/lib/format'
import type { Lab, Site } from '@/data/types'
import { AddFormActions, SectionShell } from '../section-shell'
import type { StepProps } from '../types'

/**
 * Step 4 — laboratories the site sends samples to.
 */
export function LabsStep({ data, reload }: StepProps) {
  const toast = useToast()
  const [removingId, setRemovingId] = React.useState<string>()

  async function remove(id: string) {
    setRemovingId(id)
    try {
      await siteApi.removeLab(id)
      toast.success('Lab removed')
      reload()
    } finally {
      setRemovingId(undefined)
    }
  }

  return (
    <SectionShell
      noun="lab"
      title="Labs associated"
      description="The laboratories that process samples for your site. Accreditation details are what a sponsor checks first, so record them exactly as they appear on the certificate."
      icon={TestTube}
      items={data.labs.map((lab) => ({
        id: lab.id,
        title: lab.name,
        lines: [lab.accreditationDetails, `${lab.primaryContact} · ${formatAddress(lab.address)}`],
      }))}
      onRemove={remove}
      removingId={removingId}
      emptyTitle="No labs associated"
      emptyDescription="Add the laboratories that will run assays for your studies."
    >
      {(close, editingId) => (
        <LabForm
          key={editingId ?? 'new'}
          onSaved={close}
          reload={reload}
          hasItems={data.labs.length > 0}
          site={data.site}
          editing={editingId ? data.labs.find((t) => t.id === editingId) : undefined}
        />
      )}
    </SectionShell>
  )
}

function LabForm({
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
  editing?: Lab
}) {
  const toast = useToast()

  const form = useForm({
    initialValues: {
      name: editing?.name ?? '',
      accreditationDetails: editing?.accreditationDetails ?? '',
      primaryContact: editing?.primaryContact ?? '',
      street: editing?.address.street ?? '',
      city: editing?.address.city ?? '',
      state: editing?.address.state ?? '',
      zip: editing?.address.zip ?? '',
      country: editing?.address.country ?? '',
    },
    rules: {
      name: required('Lab name'),
      accreditationDetails: required('Accreditation details'),
      primaryContact: required('Primary contact'),
      city: required('City'),
      state: required('State or province'),
      country: required('Country'),
    },
    onSubmit: async (values) => {
      const payload = {
        name: values.name,
        accreditationDetails: values.accreditationDetails,
        primaryContact: values.primaryContact,
        address: {
          street: values.street,
          city: values.city,
          state: values.state,
          zip: values.zip,
          country: values.country,
        },
      }
      if (editing) {
        await siteApi.updateLab(editing.id, payload)
        toast.success('Lab updated')
      } else {
        await siteApi.addLab(payload)
        toast.success('Lab added')
      }
      form.reset()
      reload()
      onSaved()
    },
  })

  return (
    <form className="space-y-8" onSubmit={form.submit} noValidate>
      <FormSection title="Laboratory">
        <FormField id="labName" label="Lab name" error={form.errors.name} required>
          {(aria) => <Input {...aria} {...form.field('name')} />}
        </FormField>

        <FormField id="labSite" label="Site" hint="Set automatically from your registration.">
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
          id="labContact"
          label="Lab primary contact"
          hint="Name of your main contact at the lab."
          error={form.errors.primaryContact}
          required
        >
          {(aria) => <Input {...aria} {...form.field('primaryContact')} autoComplete="name" />}
        </FormField>

        <FullWidth>
          <FormField
            id="labAccreditation"
            label="Lab accreditation details"
            hint="For example: CLIA certified and CAP accredited."
            error={form.errors.accreditationDetails}
            required
          >
            {(aria) => <Textarea {...aria} {...form.field('accreditationDetails')} rows={3} />}
          </FormField>
        </FullWidth>
      </FormSection>

      <FormSection title="Lab address">
        <AddressFields
          idPrefix="lab"
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
        noun="lab"
        editing={!!editing}
        submitting={form.submitting}
        onCancel={onSaved}
        canCancel={hasItems || !!editing}
      />
    </form>
  )
}
