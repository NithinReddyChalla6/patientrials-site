import * as React from 'react'
import { Building2 } from 'lucide-react'
import { siteApi } from '@/data/api'
import { useForm } from '@/lib/use-form'
import { required } from '@/lib/validators'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { FormSection, FullWidth } from '@/components/patterns/form-section'
import { AddressFields } from '@/components/patterns/address-fields'
import { ActiveDot } from '@/components/patterns/status-badge'
import { FACILITY_TYPES } from '@/data/reference'
import type { Facility, Site } from '@/data/types'
import { AddFormActions, SectionShell } from '../section-shell'
import type { StepProps } from '../types'

/**
 * Step 5 — the rooms and equipment available to run visits.
 */
export function FacilitiesStep({ data, reload }: StepProps) {
  const toast = useToast()
  const [removingId, setRemovingId] = React.useState<string>()

  async function remove(id: string) {
    setRemovingId(id)
    try {
      await siteApi.removeFacility(id)
      toast.success('Facility removed')
      reload()
    } finally {
      setRemovingId(undefined)
    }
  }

  return (
    <SectionShell
      noun="facility"
      title="Facility services"
      description="Where visits happen and what each location can do. These become the approved locations you can attach to a study later."
      icon={Building2}
      items={data.facilities.map((facility) => ({
        id: facility.id,
        title: facility.name,
        lines: [
          `${facility.type} · ${[facility.address.city, facility.address.state]
            .filter(Boolean)
            .join(', ')}`,
          facility.serviceEquipment,
        ],
        meta: <ActiveDot active={facility.active} />,
      }))}
      onRemove={remove}
      removingId={removingId}
      emptyTitle="No facilities listed"
      emptyDescription="Add the locations where participant visits will take place."
    >
      {(close, editingId) => (
        <FacilityForm
          key={editingId ?? 'new'}
          onSaved={close}
          reload={reload}
          hasItems={data.facilities.length > 0}
          site={data.site}
          editing={editingId ? data.facilities.find((t) => t.id === editingId) : undefined}
        />
      )}
    </SectionShell>
  )
}

function FacilityForm({
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
  editing?: Facility
}) {
  const toast = useToast()
  const [active, setActive] = React.useState(editing?.active ?? true)

  const form = useForm({
    initialValues: {
      name: editing?.name ?? '',
      type: editing?.type ?? '',
      serviceEquipment: editing?.serviceEquipment ?? '',
      servicesOffered: editing?.servicesOffered ?? '',
      street: editing?.address.street ?? '',
      city: editing?.address.city ?? '',
      state: editing?.address.state ?? '',
      zip: editing?.address.zip ?? '',
      country: editing?.address.country ?? '',
    },
    rules: {
      name: required('Facility name'),
      type: required('Facility type'),
      serviceEquipment: required('Service or equipment'),
      city: required('City'),
    },
    onSubmit: async (values) => {
      const payload = {
        name: values.name,
        type: values.type,
        active,
        serviceEquipment: values.serviceEquipment,
        servicesOffered: values.servicesOffered,
        address: {
          street: values.street,
          city: values.city,
          state: values.state,
          zip: values.zip,
          country: values.country,
        },
      }
      if (editing) {
        await siteApi.updateFacility(editing.id, payload)
        toast.success('Facility updated')
      } else {
        await siteApi.addFacility(payload)
        toast.success('Facility added')
      }
      form.reset()
      setActive(true)
      reload()
      onSaved()
    },
  })

  return (
    <form className="space-y-8" onSubmit={form.submit} noValidate>
      <FormSection title="Facility">
        <FormField id="facilityName" label="Facility name" error={form.errors.name} required>
          {(aria) => <Input {...aria} {...form.field('name')} />}
        </FormField>

        <FormField id="facilitySite" label="Site" hint="Set automatically from your registration.">
          {(aria) => (
            <Input
              {...aria}
              value={site.name}
              readOnly
              className="bg-sunken text-muted-foreground"
            />
          )}
        </FormField>

        <FormField id="facilityType" label="Facility type" error={form.errors.type} required>
          {(aria) => (
            <Select
              {...aria}
              {...form.field('type')}
              options={FACILITY_TYPES}
              placeholder="Select a type"
            />
          )}
        </FormField>

        <FullWidth>
          <FormField
            id="facilityEquipment"
            label="Service or equipment"
            hint="For example: ECG, phlebotomy, sample storage."
            error={form.errors.serviceEquipment}
            required
          >
            {(aria) => <Input {...aria} {...form.field('serviceEquipment')} />}
          </FormField>
        </FullWidth>

        <FullWidth>
          <FormField
            id="facilityServices"
            label="Services offered at this facility"
            hint="Optional. What a participant can have done here."
          >
            {(aria) => <Textarea {...aria} {...form.field('servicesOffered')} rows={3} />}
          </FormField>
        </FullWidth>

        <div className="flex items-center gap-3 self-end pb-2.5">
          <Switch id="facilityActive" checked={active} onCheckedChange={setActive} />
          <label htmlFor="facilityActive" className="cursor-pointer text-sm text-foreground">
            Currently in use
          </label>
        </div>
      </FormSection>

      <FormSection title="Where it is">
        <AddressFields
          idPrefix="facility"
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
          requiredKeys={['city']}
        />
      </FormSection>

      <AddFormActions
        noun="facility"
        editing={!!editing}
        submitting={form.submitting}
        onCancel={onSaved}
        canCancel={hasItems || !!editing}
      />
    </form>
  )
}
