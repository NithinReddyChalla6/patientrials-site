import * as React from 'react'
import { FileText, Plus, Upload, X } from 'lucide-react'
import { studyAssetsApi, ApiError } from '@/data/api'
import type { StudyAsset } from '@/data/types'
import { ASSET_AUDIENCES, ASSET_TYPES, PRIMARY_LANGUAGES } from '@/data/reference'
import { useAsync } from '@/lib/use-async'
import { useForm } from '@/lib/use-form'
import { required } from '@/lib/validators'
import { formatRelative } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { FileDrop } from '@/components/ui/file-drop'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { FormSection, FullWidth } from '@/components/patterns/form-section'
import { EmptyState } from '@/components/patterns/empty-state'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { useAuth } from '@/features/auth/auth-context'
import { useStudy } from './study-layout'

/**
 * Material attached to a study.
 *
 * The legacy screen created the record on its first step and uploaded the file
 * against it on the second, so abandoning half way left an empty asset behind.
 * The two steps remain, because that is how the work divides, but nothing is
 * written until the second one finishes.
 *
 * Publishing stays a separate, deliberate act rather than a side effect of
 * saving, and it needs an audience: an asset published to nobody in particular
 * is the mistake worth preventing.
 */
export function StudyAssetsTab() {
  const { study } = useStudy()
  const { can } = useAuth()
  const toast = useToast()
  const canManage = can('asset.manage')

  const state = useAsync(() => studyAssetsApi.list(study.id), [study.id])
  const [panel, setPanel] = React.useState<'closed' | 'new' | string>('closed')
  const [busyId, setBusyId] = React.useState<string>()

  async function remove(asset: StudyAsset) {
    setBusyId(asset.id)
    try {
      await studyAssetsApi.remove(asset.id)
      toast.success('Asset removed')
      state.reload()
    } finally {
      setBusyId(undefined)
    }
  }

  return (
    <AsyncBoundary
      state={state}
      loading={
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-40" />
        </div>
      }
      errorTitle="We could not load the assets for this study"
    >
      {(assets) => {
        const editing = assets.find((a) => a.id === panel)

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Study assets</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Protocols, training material and participant guides for this study. Publishing an
                asset makes it visible to the audience you choose.
              </p>
            </div>

            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {assets.length === 0 ? 'No assets added' : `${assets.length} added`}
              </h3>
              {canManage && panel === 'closed' && (
                <Button variant="outline" size="sm" onClick={() => setPanel('new')}>
                  <Plus aria-hidden="true" />
                  Add asset
                </Button>
              )}
            </div>

            {assets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card">
                <EmptyState
                  compact
                  icon={FileText}
                  title="No assets yet"
                  description="Add the protocol, training material or participant guides for this study."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {assets.map((asset) => (
                  <li key={asset.id} className="flex flex-wrap items-start gap-4 p-4">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
                      aria-hidden="true"
                    >
                      <FileText className="size-4" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => setPanel(asset.id)}
                            className="rounded text-left underline-offset-4 hover:underline"
                          >
                            {asset.title}
                          </button>
                        ) : (
                          asset.title
                        )}
                        <Badge tone="neutral">{asset.type}</Badge>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{asset.description}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {asset.documentName && <span>{asset.documentName}</span>}
                        {asset.language && <span>{asset.language}</span>}
                        {asset.targetAudience && <span>For {asset.targetAudience}</span>}
                        <span>Added {formatRelative(asset.createdAt)}</span>
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <Badge tone={asset.status === 'published' ? 'success' : 'outline'}>
                        {asset.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(asset)}
                          disabled={busyId === asset.id}
                          aria-label={`Remove ${asset.title}`}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {canManage && panel !== 'closed' && (
              <AssetPanel
                key={panel}
                studyId={study.id}
                editing={editing}
                onDone={() => {
                  setPanel('closed')
                  state.reload()
                }}
                onCancel={() => setPanel('closed')}
              />
            )}
          </div>
        )
      }}
    </AsyncBoundary>
  )
}

/**
 * Add or edit one asset. Adding runs in two steps so attaching the document is
 * its own act; editing shows everything at once, because by then there is
 * nothing left to sequence.
 */
function AssetPanel({
  studyId,
  editing,
  onDone,
  onCancel,
}: {
  studyId: string
  editing?: StudyAsset
  onDone: () => void
  onCancel: () => void
}) {
  const toast = useToast()
  const [step, setStep] = React.useState<1 | 2>(1)
  const [file, setFile] = React.useState<File | null>(null)
  const [serverError, setServerError] = React.useState<string>()
  // Which button was pressed, read inside the single submit handler.
  const intent = React.useRef<'save' | 'publish'>('save')

  // The offered types, plus whatever this asset already has. Categories change;
  // records written under the old ones do not rewrite themselves.
  const typeOptions = React.useMemo(
    () =>
      editing?.type && !ASSET_TYPES.includes(editing.type)
        ? [...ASSET_TYPES, editing.type]
        : ASSET_TYPES,
    [editing?.type],
  )

  const form = useForm({
    initialValues: {
      type: editing?.type ?? '',
      language: editing?.language ?? 'English',
      title: editing?.title ?? '',
      link: editing?.link ?? '',
      description: editing?.description ?? '',
      targetAudience: editing?.targetAudience ?? '',
    },
    rules: {
      type: required('Asset type'),
      title: required('Asset title'),
      description: required('Description'),
    },
    onSubmit: async (values) => {
      // Step one only moves forward; nothing is written until step two.
      if (!editing && step === 1) {
        setStep(2)
        return
      }

      setServerError(undefined)
      const document = file ? { documentName: file.name } : {}
      try {
        if (!editing) {
          await studyAssetsApi.add({ studyId, ...values, ...document })
          toast.success('Asset added', 'It stays a draft until you publish it.')
          onDone()
          return
        }

        await studyAssetsApi.update(editing.id, { ...values, ...document })
        if (intent.current === 'publish') {
          await studyAssetsApi.publish(editing.id)
          toast.success('Asset published', `Visible to ${values.targetAudience}.`)
        } else {
          toast.success('Asset updated')
        }
        onDone()
      } catch (error) {
        setServerError(error instanceof ApiError ? error.message : 'We could not save this asset.')
      } finally {
        intent.current = 'save'
      }
    },
  })

  const heading = editing ? 'Edit asset' : 'Add asset'

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{heading}</h3>
          {!editing && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Step {step} of 2, {step === 1 ? 'details' : 'document'}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label={`Cancel ${heading}`}>
          <X aria-hidden="true" />
        </Button>
      </div>

      <form className="space-y-6" onSubmit={form.submit} noValidate>
        {serverError && (
          <Alert tone="error" title="We could not save this asset">
            {serverError}
          </Alert>
        )}

        {(editing || step === 1) && (
          <FormSection title="Details">
            <FormField id="assetType" label="Asset type" error={form.errors.type} required>
              {(aria) => (
                <Select
                  {...aria}
                  {...form.field('type')}
                  // An asset stored under a type this build no longer offers
                  // keeps it in the list, rather than opening with an empty
                  // picker that quietly discards it on the next save.
                  options={typeOptions}
                  placeholder="Select a type"
                />
              )}
            </FormField>

            {/* Beside the type, as it sits in the form this replaces. */}
            <FormField id="assetLanguage" label="Language">
              {(aria) => (
                <Select {...aria} {...form.field('language')} options={PRIMARY_LANGUAGES} />
              )}
            </FormField>

            <FormField id="assetTitle" label="Title" error={form.errors.title} required>
              {(aria) => <Input {...aria} {...form.field('title')} />}
            </FormField>

            <FullWidth>
              <FormField
                id="assetLink"
                label="Asset link"
                hint="Optional. Where the material is hosted, if it lives elsewhere."
              >
                {(aria) => (
                  <Input
                    {...aria}
                    {...form.field('link')}
                    type="url"
                    inputMode="url"
                    placeholder="https://"
                  />
                )}
              </FormField>
            </FullWidth>

            <FullWidth>
              <FormField
                id="assetDescription"
                label="Description"
                hint="What this is, and when someone would need it."
                error={form.errors.description}
                required
              >
                {(aria) => <Textarea {...aria} {...form.field('description')} rows={3} />}
              </FormField>
            </FullWidth>
          </FormSection>
        )}

        {(editing || step === 2) && (
          <FormSection title="Document" columns={1}>
            <FileDrop
              id="assetDocument"
              label="Attach a document"
              hint="PDF or Word, up to 10MB. Optional if you linked to it above."
              accept=".pdf,.doc,.docx"
              value={file}
              onChange={setFile}
            />
            {editing?.documentName && !file && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Upload className="size-3.5" aria-hidden="true" />
                Currently attached: {editing.documentName}
              </p>
            )}
          </FormSection>
        )}

        {editing && (
          <FormSection title="Audience" columns={1}>
            <FormField
              id="assetAudience"
              label="Target audience"
              hint="Needed before this asset can be published."
            >
              {(aria) => (
                <Select
                  {...aria}
                  {...form.field('targetAudience')}
                  options={ASSET_AUDIENCES}
                  placeholder="Select an audience"
                />
              )}
            </FormField>
          </FormSection>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          {!editing && step === 2 && (
            <Button type="button" variant="ghost" onClick={() => setStep(1)}>
              Back
            </Button>
          )}
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>

          {!editing && step === 1 && (
            <Button type="submit" variant="brand">
              Next
            </Button>
          )}

          {!editing && step === 2 && (
            <Button type="submit" variant="brand" loading={form.submitting}>
              Save asset
            </Button>
          )}

          {editing && (
            <>
              <Button
                type="submit"
                variant="outline"
                loading={form.submitting && intent.current === 'save'}
                onClick={() => {
                  intent.current = 'save'
                }}
              >
                Save changes
              </Button>
              <Button
                type="submit"
                variant="brand"
                loading={form.submitting && intent.current === 'publish'}
                loadingLabel="Publishing"
                onClick={() => {
                  intent.current = 'publish'
                }}
              >
                {editing.status === 'published' ? 'Save and republish' : 'Save and publish'}
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  )
}
