import * as React from 'react'
import { KeyRound, UserPlus, Users } from 'lucide-react'
import { siteApi, ApiError } from '@/data/api'
import { ROLE_LABELS, type Role, type User } from '@/data/types'
import { useForm } from '@/lib/use-form'
import { all, email as emailRule, required } from '@/lib/validators'
import { formatRelative, initialsOf } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert } from '@/components/ui/alert'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { FormSection } from '@/components/patterns/form-section'
import { EmptyState } from '@/components/patterns/empty-state'
import { ConfirmDialog } from '@/components/patterns/confirm-dialog'
import { ActiveDot } from '@/components/patterns/status-badge'
import { useAuth } from '@/features/auth/auth-context'

const ROLE_ENTRIES = Object.entries(ROLE_LABELS) as [Role, string][]

/**
 * The site's people.
 *
 * Shared by the last onboarding step and the standing Team screen, because they
 * are the same job at two moments — the legacy portal had "Collaborators" as
 * both a wizard tab and a sidebar entry with two separate implementations.
 *
 * Adding someone here creates their sign-in, so the form states that plainly
 * rather than presenting it as an anonymous record insert.
 */
export function TeamManager({
  members,
  reload,
  canManage,
}: {
  members: User[]
  reload: () => void
  canManage: boolean
}) {
  const toast = useToast()
  const { user: currentUser } = useAuth()
  const [serverError, setServerError] = React.useState<string>()
  const [resetTarget, setResetTarget] = React.useState<User | null>(null)
  const [busyId, setBusyId] = React.useState<string>()

  const form = useForm({
    initialValues: { firstName: '', lastName: '', email: '', role: '' as Role | '' },
    rules: {
      firstName: required('First name'),
      lastName: required('Last name'),
      email: all(required('Email address'), emailRule),
      role: required('Role'),
    },
    onSubmit: async (values) => {
      setServerError(undefined)
      try {
        await siteApi.addCollaborator({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          role: values.role as Role,
        })
        toast.success(
          `${values.firstName} ${values.lastName} added`,
          'They will receive an invitation to set their password.',
        )
        form.reset()
        reload()
      } catch (error) {
        setServerError(
          error instanceof ApiError ? error.message : 'We could not add this person.',
        )
      }
    },
  })

  async function toggleActive(member: User, active: boolean) {
    setBusyId(member.id)
    try {
      await siteApi.updateCollaborator(member.id, { active })
      toast.success(active ? `${member.firstName} re-enabled` : `${member.firstName} deactivated`)
      reload()
    } catch {
      toast.error('We could not update this person', 'Please try again.')
    } finally {
      setBusyId(undefined)
    }
  }

  async function confirmReset() {
    if (!resetTarget) return
    setBusyId(resetTarget.id)
    try {
      await siteApi.resetCollaboratorPassword(resetTarget.id)
      toast.success(
        'Password reset sent',
        `${resetTarget.firstName} will get an email at ${resetTarget.email}.`,
      )
      setResetTarget(null)
    } catch {
      toast.error('We could not send the reset', 'Please try again.')
    } finally {
      setBusyId(undefined)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {members.length === 0 ? 'No one added yet' : `${members.length} on this site`}
          </h3>
        </div>

        {members.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-border bg-card">
            <EmptyState
              compact
              icon={Users}
              title="No collaborators yet"
              description="Add the investigators, coordinators and staff who will work on your studies."
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
            {members.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-4 p-4">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand"
                  aria-hidden="true"
                >
                  {initialsOf(`${member.firstName} ${member.lastName}`)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                    {member.firstName} {member.lastName}
                    {member.id === currentUser?.id && <Badge tone="outline">You</Badge>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                </div>

                <Badge tone="neutral" className="shrink-0">
                  {ROLE_LABELS[member.role]}
                </Badge>

                <div className="flex shrink-0 items-center gap-3">
                  {canManage ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={member.active}
                          onCheckedChange={(next) => toggleActive(member, next)}
                          disabled={busyId === member.id || member.id === currentUser?.id}
                          label={`${member.active ? 'Deactivate' : 'Activate'} ${member.firstName} ${member.lastName}`}
                        />
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          {member.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResetTarget(member)}
                        disabled={busyId === member.id}
                      >
                        <KeyRound aria-hidden="true" />
                        <span className="hidden sm:inline">Reset password</span>
                        <span className="sr-only sm:hidden">
                          Reset password for {member.firstName} {member.lastName}
                        </span>
                      </Button>
                    </>
                  ) : (
                    <ActiveDot active={member.active} />
                  )}
                </div>

                {member.invitedAt && (
                  <p className="w-full text-xs text-muted-foreground sm:w-auto">
                    Added {formatRelative(member.invitedAt)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage && (
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <UserPlus className="size-4 text-brand" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">Add someone to this site</h3>
          </div>
          <p className="mb-5 text-sm text-muted-foreground">
            This creates their PatienTrials sign-in and emails them an invitation to set a password.
          </p>

          <form onSubmit={form.submit} noValidate className="space-y-6">
            {serverError && (
              <Alert tone="error" title="We could not add this person">
                {serverError}
              </Alert>
            )}

            <FormSection title="Person">
              <FormField
                id="collabFirstName"
                label="First name"
                error={form.errors.firstName}
                required
              >
                {(aria) => <Input {...aria} {...form.field('firstName')} autoComplete="off" />}
              </FormField>

              <FormField
                id="collabLastName"
                label="Last name"
                error={form.errors.lastName}
                required
              >
                {(aria) => <Input {...aria} {...form.field('lastName')} autoComplete="off" />}
              </FormField>

              <FormField
                id="collabEmail"
                label="Email address"
                hint="Doubles as their username."
                error={form.errors.email}
                required
              >
                {(aria) => <Input {...aria} {...form.field('email')} type="email" autoComplete="off" />}
              </FormField>

              <FormField
                id="collabRole"
                label="Role"
                hint="Decides what they can see and change."
                error={form.errors.role}
                required
              >
                {(aria) => (
                  <Select {...aria} {...form.field('role')} placeholder="Select a role">
                    {ROLE_ENTRIES.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                )}
              </FormField>
            </FormSection>

            <div className="flex justify-end border-t border-border pt-5">
              <Button type="submit" variant="brand" loading={form.submitting}>
                Add to site
              </Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(resetTarget)}
        onOpenChange={(open) => !open && setResetTarget(null)}
        title="Send a password reset?"
        description={
          resetTarget
            ? `${resetTarget.firstName} ${resetTarget.lastName} will receive an email at ${resetTarget.email} with a link to choose a new password. Their current password stops working straight away.`
            : ''
        }
        confirmLabel="Send reset email"
        loading={Boolean(busyId)}
        onConfirm={confirmReset}
      />
    </div>
  )
}
