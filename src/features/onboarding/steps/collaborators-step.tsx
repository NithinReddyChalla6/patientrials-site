import { TeamManager } from '@/features/site/team-manager'
import type { StepProps } from '../types'

/**
 * Step 6 — the people who will work on this site's studies.
 *
 * Reuses the standing Team screen rather than duplicating it, so the invite
 * form, role list and reset-password behaviour cannot drift apart between
 * onboarding and day-to-day use.
 */
export function CollaboratorsStep({ data, reload }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Team</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Add the principal investigators, coordinators and staff who will run studies at this site.
          Each person gets their own sign-in, and their role decides what they can change.
        </p>
      </div>
      <TeamManager members={data.collaborators} reload={reload} canManage />
    </div>
  )
}
