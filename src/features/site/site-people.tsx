import * as React from 'react'
import { Stethoscope, UserPlus, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { siteApi, ApiError } from '@/data/api'
import { ROLE_LABELS, type Role, type User } from '@/data/types'
import { useForm } from '@/lib/use-form'
import { all, email as emailRule, required } from '@/lib/validators'
import { initialsOf } from '@/lib/format'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { useToast } from '@/components/ui/toast'
import { FormField } from '@/components/patterns/form-field'
import { FormSection } from '@/components/patterns/form-section'
import { EmptyState } from '@/components/patterns/empty-state'
import { ActiveDot } from '@/components/patterns/status-badge'
import { useAuth } from '@/features/auth/auth-context'
import type { StepProps } from '@/features/onboarding/types'

interface SitePeopleProps {
  title: string
  description: string
  /** Singular noun for the group, e.g. "investigator". */
  noun: string
  icon: LucideIcon
  /** Roles that belong to this group. */
  roles: Role[]
  /** Role given to someone added here. */
  defaultRole: Role
  members: User[]
  reload: () => void
}

/**
 * The site's people for one role — its investigators or its nurses.
 *
 * The legacy Edit Site had "Select Investigators" and "Select Nurses" as separate
 * picker tabs. Because a person here is a real sign-in with a role, this shows who
 * currently holds the role and adds new ones through the same invitation flow as
 * the team screen, rather than a free-floating association the login never knows
 * about.
 */
function SitePeopleSection({
  title,
  description,
  noun,
  icon: Icon,
  roles,
  defaultRole,
  members,
  reload,
}: SitePeopleProps) {
  const toast = useToast()
  const { can } = useAuth()
  const canManage = can('site.collaborators.manage')
  const [serverError, setServerError] = React.useState<string>()

  const people = members.filter((m) => roles.includes(m.role))

  const form = useForm({
    initialValues: { firstName: '', lastName: '', email: '' },
    rules: {
      firstName: required('First name'),
      lastName: required('Last name'),
      email: all(required('Email address'), emailRule),
    },
    onSubmit: async (values) => {
      setServerError(undefined)
      try {
        await siteApi.addCollaborator({
          firstName: values.firstName,
          lastName: values.lastName,
          email: values.email,
          role: defaultRole,
        })
        toast.success(
          `${values.firstName} ${values.lastName} added`,
          'They will get an invitation to set their password.',
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {people.length === 0
            ? `No ${noun}s on this site`
            : `${people.length} ${people.length === 1 ? noun : `${noun}s`}`}
        </h3>

        {people.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-border bg-card">
            <EmptyState
              compact
              icon={Icon}
              title={`No ${noun}s yet`}
              description={`Add the ${noun}s who work with your site.`}
            />
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-card">
            {people.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-4 p-4">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand"
                  aria-hidden="true"
                >
                  {initialsOf(`${m.firstName} ${m.lastName}`)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {m.firstName} {m.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                <Badge tone="neutral" className="shrink-0">
                  {ROLE_LABELS[m.role]}
                </Badge>
                <ActiveDot active={m.active} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage && (
        <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <UserPlus className="size-4 text-brand" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-foreground">Add {noun}</h3>
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
              <FormField id={`${noun}-firstName`} label="First name" error={form.errors.firstName} required>
                {(aria) => <Input {...aria} {...form.field('firstName')} autoComplete="off" />}
              </FormField>

              <FormField id={`${noun}-lastName`} label="Last name" error={form.errors.lastName} required>
                {(aria) => <Input {...aria} {...form.field('lastName')} autoComplete="off" />}
              </FormField>

              <FormField
                id={`${noun}-email`}
                label="Email address"
                hint="Doubles as their username."
                error={form.errors.email}
                required
              >
                {(aria) => <Input {...aria} {...form.field('email')} type="email" autoComplete="off" />}
              </FormField>
            </FormSection>

            <div className="flex justify-end border-t border-border pt-5">
              <Button type="submit" variant="brand" loading={form.submitting}>
                Add {noun}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

/** Edit Site tab: the site's principal investigators. */
export function InvestigatorsSection({ data, reload }: StepProps) {
  return (
    <SitePeopleSection
      title="Investigators"
      description="The principal investigators who lead studies at your site."
      noun="investigator"
      icon={UserRound}
      roles={['principal_investigator']}
      defaultRole="principal_investigator"
      members={data.collaborators}
      reload={reload}
    />
  )
}

/** Edit Site tab: the nurses supporting participant visits. */
export function NursesSection({ data, reload }: StepProps) {
  return (
    <SitePeopleSection
      title="Nurses"
      description="The nurses who support participant visits at your site."
      noun="nurse"
      icon={Stethoscope}
      roles={['clinical_staff']}
      defaultRole="clinical_staff"
      members={data.collaborators}
      reload={reload}
    />
  )
}
