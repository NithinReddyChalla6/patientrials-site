import * as React from 'react'
import { Building2, MapPin, Plus, Trash2 } from 'lucide-react'
import { ApiError, locationsApi, siteApi } from '@/data/api'
import type { ApprovedLocation } from '@/data/types'
import { useAsync } from '@/lib/use-async'
import { formatAddress } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Combobox } from '@/components/ui/combobox'
import { SkeletonRows } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AsyncBoundary } from '@/components/patterns/async-boundary'
import { EmptyState } from '@/components/patterns/empty-state'
import { FormField } from '@/components/patterns/form-field'
import { ConfirmDialog } from '@/components/patterns/confirm-dialog'
import { useAuth } from '@/features/auth/auth-context'
import { useStudy } from './study-layout'

/**
 * Approved locations for a study.
 *
 * The legacy screen made you press "Enable" before the form appeared, pick a
 * facility type, then choose the facility itself from a popup record list —
 * without ever showing which of your site's facilities were already approved.
 * Here the approved list is the screen, and adding one draws from the facilities
 * already recorded on your site profile.
 */
export function LocationsTab() {
  const { study } = useStudy()
  const { can } = useAuth()
  const toast = useToast()
  const canManage = can('location.manage')

  const state = useAsync(() => locationsApi.list(study.id), [study.id])
  const facilities = useAsync(() => siteApi.listFacilities(), [])
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [removeTarget, setRemoveTarget] = React.useState<ApprovedLocation | null>(null)
  const [busyId, setBusyId] = React.useState<string>()

  async function toggle(location: ApprovedLocation, enabled: boolean) {
    setBusyId(location.id)
    try {
      await locationsApi.setEnabled(location.id, enabled)
      toast.success(
        enabled ? `${location.facilityName} enabled` : `${location.facilityName} disabled`,
        enabled
          ? 'Participants can be scheduled here.'
          : 'No new visits will be scheduled at this location.',
      )
      state.reload()
    } finally {
      setBusyId(undefined)
    }
  }

  async function remove() {
    if (!removeTarget) return
    setBusyId(removeTarget.id)
    try {
      await locationsApi.remove(removeTarget.id)
      toast.success('Location removed')
      setRemoveTarget(null)
      state.reload()
    } finally {
      setBusyId(undefined)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Approved locations</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Where in-person visits for this study may take place. Only enabled locations can be
            booked.
          </p>
        </div>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus aria-hidden="true" />
            Approve a location
          </Button>
        )}
      </div>

      <AsyncBoundary
        state={state}
        loading={
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <SkeletonRows rows={3} cols={3} />
          </div>
        }
        isEmpty={(items) => items.length === 0}
        empty={
          <div className="rounded-lg border border-dashed border-border bg-card">
            <EmptyState
              icon={MapPin}
              title="No approved locations"
              description="Approve at least one of your site's facilities so in-person visits can be scheduled."
              action={
                canManage && (
                  <Button variant="brand" onClick={() => setDialogOpen(true)}>
                    <Plus aria-hidden="true" />
                    Approve a location
                  </Button>
                )
              }
            />
          </div>
        }
        errorTitle="We could not load approved locations"
      >
        {(locations) => (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {locations.map((location) => (
              <li key={location.id} className="flex flex-wrap items-center gap-4 p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{location.facilityName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {location.facilityType} · {location.address}
                  </p>
                </div>

                {canManage ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={location.enabled}
                        onCheckedChange={(next) => toggle(location, next)}
                        disabled={busyId === location.id}
                        label={`${location.enabled ? 'Disable' : 'Enable'} ${location.facilityName}`}
                      />
                      <span className="text-xs text-muted-foreground">
                        {location.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setRemoveTarget(location)}
                      aria-label={`Remove ${location.facilityName}`}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {location.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </AsyncBoundary>

      <ApproveDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        studyId={study.id}
        facilities={facilities.data ?? []}
        onSaved={() => {
          setDialogOpen(false)
          state.reload()
        }}
      />

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove this approved location?"
        description={
          removeTarget
            ? `${removeTarget.facilityName} will no longer be available for this study's visits. Visits already booked there are unaffected.`
            : ''
        }
        confirmLabel="Remove location"
        destructive
        loading={Boolean(busyId)}
        onConfirm={remove}
      />
    </div>
  )
}

function ApproveDialog({
  open,
  onOpenChange,
  studyId,
  facilities,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  studyId: string
  facilities: Awaited<ReturnType<typeof siteApi.listFacilities>>
  onSaved: () => void
}) {
  const toast = useToast()
  const [facilityId, setFacilityId] = React.useState<string>()
  const [attempted, setAttempted] = React.useState(false)
  const [serverError, setServerError] = React.useState<string>()
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    setFacilityId(undefined)
    setAttempted(false)
    setServerError(undefined)
  }, [open])

  const facility = facilities.find((f) => f.id === facilityId)
  const error = attempted && !facilityId ? 'Choose a facility to approve' : undefined

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setAttempted(true)
    if (!facility) return
    setSaving(true)
    setServerError(undefined)
    try {
      await locationsApi.create({
        studyId,
        facilityType: facility.type,
        facilityName: facility.name,
        address: formatAddress(facility.address),
        enabled: true,
      })
      toast.success(`${facility.name} approved`)
      onSaved()
    } catch (err) {
      setServerError(
        err instanceof ApiError ? err.message : 'We could not approve this location.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Approve a location</DialogTitle>
            <DialogDescription>
              Choose one of your site's facilities. Add new facilities from your site profile.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5">
            {serverError && (
              <Alert live tone="warning" title="Already approved">
                {serverError}
              </Alert>
            )}

            {facilities.length === 0 ? (
              <EmptyState
                compact
                icon={Building2}
                title="No facilities on your site"
                description="Add a facility to your site profile before approving it for a study."
              />
            ) : (
              <>
                <FormField id="approve-facility" label="Facility" error={error} required>
                  {(aria) => (
                    <Combobox
                      {...aria}
                      options={facilities.map((f) => ({
                        value: f.id,
                        label: f.name,
                        description: `${f.type} · ${formatAddress(f.address)}`,
                      }))}
                      value={facilityId}
                      onChange={setFacilityId}
                      placeholder="Select a facility"
                      searchPlaceholder="Search your facilities"
                    />
                  )}
                </FormField>

                {facility && (
                  <div className="rounded-lg border border-border bg-sunken p-4 text-sm">
                    <p className="font-medium text-foreground">{facility.name}</p>
                    <p className="mt-0.5 text-muted-foreground">{facility.type}</p>
                    <p className="mt-0.5 text-muted-foreground">
                      {formatAddress(facility.address)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Services: {facility.serviceEquipment}
                    </p>
                  </div>
                )}
              </>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="brand"
              loading={saving}
              disabled={facilities.length === 0}
            >
              Approve location
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
