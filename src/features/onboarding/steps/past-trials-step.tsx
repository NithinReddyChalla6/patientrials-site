import * as React from 'react'
import { History } from 'lucide-react'
import { siteApi } from '@/data/api'
import { useForm } from '@/lib/use-form'
import { required } from '@/lib/validators'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { FormSection, FullWidth } from '@/components/patterns/form-section'
import { RecruitmentBadge } from '@/components/patterns/status-badge'
import { THERAPY_AREAS } from '@/data/reference'
import {
  TRIAL_PHASES,
  TRIAL_STATUSES,
  type PastTrial,
  type TrialPhase,
  type TrialStatus,
} from '@/data/types'
import { AddFormActions, SectionShell } from '../section-shell'
import type { StepProps } from '../types'

/**
 * Step 2 — trials the site has run before.
 *
 * Therapy area was a "Lookup using list" popup in the legacy form; it is a
 * searchable combobox here, which matters because the list is long and its
 * entries are compound labels like "Cardiovascular Disorders/Diseases-Heart
 * Failure" that are far easier to find by typing than by scrolling.
 */
export function PastTrialsStep({ data, reload }: StepProps) {
  const toast = useToast()
  const [removingId, setRemovingId] = React.useState<string>()

  async function remove(id: string) {
    setRemovingId(id)
    try {
      await siteApi.removePastTrial(id)
      toast.success('Past trial removed')
      reload()
    } finally {
      setRemovingId(undefined)
    }
  }

  return (
    <SectionShell
      noun="past trial"
      title="Past trials"
      description="The trials your site has already run. Sponsors use this to judge whether your site fits a protocol, so include the therapy areas and phases you have real experience in."
      icon={History}
      items={data.pastTrials.map((trial) => ({
        id: trial.id,
        title: trial.therapyArea,
        lines: [`${trial.phase} · Funded by ${trial.fundedBy}`],
        meta: <RecruitmentBadge status={trial.status} />,
      }))}
      onRemove={remove}
      removingId={removingId}
      emptyTitle="No past trials recorded"
      emptyDescription="Add the trials your site has run so sponsors can see your experience."
    >
      {(close, editingId) => (
        <PastTrialForm
          key={editingId ?? 'new'}
          onSaved={close}
          reload={reload}
          hasItems={data.pastTrials.length > 0}
          editing={editingId ? data.pastTrials.find((t) => t.id === editingId) : undefined}
        />
      )}
    </SectionShell>
  )
}

function PastTrialForm({
  onSaved,
  reload,
  hasItems,
  editing,
}: {
  onSaved: () => void
  reload: () => void
  hasItems: boolean
  editing?: PastTrial
}) {
  const toast = useToast()

  const form = useForm({
    initialValues: {
      therapyArea: editing?.therapyArea ?? '',
      fundedBy: editing?.fundedBy ?? '',
      phase: (editing?.phase ?? '') as TrialPhase | '',
      status: (editing?.status ?? '') as TrialStatus | '',
    },
    rules: {
      therapyArea: required('Therapy area'),
      fundedBy: required('Funded by / sponsor'),
      phase: required('Trial phase'),
      status: required('Status'),
    },
    onSubmit: async (values) => {
      const payload = {
        therapyArea: values.therapyArea,
        fundedBy: values.fundedBy,
        phase: values.phase as TrialPhase,
        status: values.status as TrialStatus,
      }
      if (editing) {
        await siteApi.updatePastTrial(editing.id, payload)
        toast.success('Past trial updated')
      } else {
        await siteApi.addPastTrial(payload)
        toast.success('Past trial added')
      }
      form.reset()
      reload()
      onSaved()
    },
  })

  return (
    <form onSubmit={form.submit} noValidate>
      <FormSection title="Trial" description="">
        <FullWidth>
          <FormField
            id="therapyArea"
            label="Therapy area"
            error={form.errors.therapyArea}
            required
          >
            {(aria) => (
              <Combobox
                {...aria}
                options={THERAPY_AREAS.map((t) => ({ value: t, label: t }))}
                value={form.values.therapyArea || undefined}
                onChange={(value) => {
                  form.setValue('therapyArea', value ?? '')
                  form.blur('therapyArea')
                }}
                placeholder="Select a therapy area"
                searchPlaceholder="Search therapy areas"
              />
            )}
          </FormField>
        </FullWidth>

        <FormField
          id="fundedBy"
          label="Funded by / sponsor"
          error={form.errors.fundedBy}
          required
        >
          {(aria) => <Input {...aria} {...form.field('fundedBy')} />}
        </FormField>

        <FormField id="phase" label="Trial phase" error={form.errors.phase} required>
          {(aria) => (
            <Select
              {...aria}
              {...form.field('phase')}
              options={TRIAL_PHASES}
              placeholder="Select a phase"
            />
          )}
        </FormField>

        <FormField id="status" label="Status" error={form.errors.status} required>
          {(aria) => (
            <Select
              {...aria}
              {...form.field('status')}
              options={TRIAL_STATUSES}
              placeholder="Select a status"
            />
          )}
        </FormField>
      </FormSection>

      <AddFormActions
        noun="past trial"
        editing={!!editing}
        submitting={form.submitting}
        onCancel={onSaved}
        canCancel={hasItems || !!editing}
      />
    </form>
  )
}
