import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { COUNTRIES } from '@/data/reference'
import { FormField } from './form-field'
import { FullWidth } from './form-section'

export type AddressKey = 'street' | 'city' | 'state' | 'zip' | 'country'

export const ADDRESS_LABELS: Record<AddressKey, string> = {
  street: 'Street',
  city: 'City',
  state: 'State or province',
  zip: 'Postal code',
  country: 'Country',
}

interface AddressFieldsProps {
  /** Namespaces the field ids so several addresses can coexist on a page. */
  idPrefix: string
  values: Record<AddressKey, string>
  errors: Partial<Record<AddressKey, string>>
  bind: (key: AddressKey) => {
    value: string
    onChange: (e: { target: { value: string } }) => void
    onBlur: () => void
  }
  onCountryChange: (value: string) => void
  requiredKeys?: AddressKey[]
}

/**
 * The address block, shared by site details, IRB, labs and facilities.
 *
 * Country is a searchable combobox rather than the legacy "Lookup using list"
 * link, which opened a separate window listing every country as a record.
 */
export function AddressFields({
  idPrefix,
  values,
  errors,
  bind,
  onCountryChange,
  requiredKeys = ['city', 'state', 'country'],
}: AddressFieldsProps) {
  const isRequired = (key: AddressKey) => requiredKeys.includes(key)
  const id = (key: AddressKey) => `${idPrefix}-${key}`

  return (
    <>
      <FullWidth>
        <FormField
          id={id('street')}
          label={ADDRESS_LABELS.street}
          error={errors.street}
          required={isRequired('street')}
        >
          {(aria) => <Input {...aria} {...bind('street')} autoComplete="address-line1" />}
        </FormField>
      </FullWidth>

      <FormField
        id={id('city')}
        label={ADDRESS_LABELS.city}
        error={errors.city}
        required={isRequired('city')}
      >
        {(aria) => <Input {...aria} {...bind('city')} autoComplete="address-level2" />}
      </FormField>

      <FormField
        id={id('state')}
        label={ADDRESS_LABELS.state}
        error={errors.state}
        required={isRequired('state')}
      >
        {(aria) => <Input {...aria} {...bind('state')} autoComplete="address-level1" />}
      </FormField>

      <FormField
        id={id('country')}
        label={ADDRESS_LABELS.country}
        error={errors.country}
        required={isRequired('country')}
      >
        {(aria) => (
          <Combobox
            {...aria}
            options={COUNTRIES.map((c) => ({ value: c, label: c }))}
            value={values.country || undefined}
            onChange={(value) => onCountryChange(value ?? '')}
            placeholder="Select a country"
            searchPlaceholder="Search countries"
          />
        )}
      </FormField>

      <FormField
        id={id('zip')}
        label={ADDRESS_LABELS.zip}
        error={errors.zip}
        required={isRequired('zip')}
      >
        {(aria) => <Input {...aria} {...bind('zip')} autoComplete="postal-code" inputMode="text" />}
      </FormField>
    </>
  )
}
