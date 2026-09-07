import type { Role } from '@/data/types'

/**
 * Permissions.
 *
 * The legacy portal shipped one console for every collaborator role and relied
 * on the ServiceNow ACLs behind it, so a coordinator saw buttons that would fail
 * when pressed. Here each capability is named once and every gated control asks
 * the same question, which means adding a role is a change to this table only.
 */
export type Permission =
  | 'site.view'
  | 'site.edit'
  | 'site.collaborators.manage'
  | 'study.view'
  | 'study.create'
  | 'study.promote'
  | 'study.assignInvestigator'
  | 'study.archive'
  | 'study.request.respond'
  | 'subject.triage'
  | 'prescreening.manage'
  | 'form.view'
  | 'form.create'
  | 'form.publish'
  | 'form.assign'
  | 'appointment.manage'
  | 'notification.manage'
  | 'location.manage'
  | 'asset.manage'
  | 'medication.manage'
  | 'query.manage'
  | 'consent.manage'

const READ_ONLY: Permission[] = ['site.view', 'study.view', 'form.view']

const PERMISSIONS: Record<Role, Permission[]> = {
  site_administrator: [
    ...READ_ONLY,
    'site.edit',
    'site.collaborators.manage',
    'study.create',
    'study.promote',
    'study.assignInvestigator',
    'study.archive',
    'study.request.respond',
    'subject.triage',
    'prescreening.manage',
    'form.create',
    'form.publish',
    'form.assign',
    'appointment.manage',
    'notification.manage',
    'location.manage',
    'asset.manage',
    'consent.manage',
  ],
  study_administrator: [
    ...READ_ONLY,
    'study.create',
    'study.promote',
    'study.assignInvestigator',
    'study.archive',
    'study.request.respond',
    'subject.triage',
    'prescreening.manage',
    'form.create',
    'form.publish',
    'form.assign',
    'appointment.manage',
    'notification.manage',
    'location.manage',
    'asset.manage',
    'medication.manage',
    'query.manage',
    'consent.manage',
  ],
  // A Principal Investigator works inside studies, not on the site record. The
  // legacy portal gave them no site-setup navigation at all, so `site.view` is
  // deliberately absent here rather than inherited from READ_ONLY.
  principal_investigator: [
    'study.view',
    'form.view',
    'subject.triage',
    'prescreening.manage',
    'form.assign',
    'appointment.manage',
    'notification.manage',
    'study.request.respond',
    'asset.manage',
    'medication.manage',
    'query.manage',
    'consent.manage',
  ],
  study_coordinator: [
    ...READ_ONLY,
    'subject.triage',
    'form.assign',
    'appointment.manage',
    'notification.manage',
    'location.manage',
  ],
  clinical_staff: READ_ONLY,
}

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false
  return PERMISSIONS[role].includes(permission)
}

/** Short sentence shown wherever an action is hidden or disabled by role. */
export function permissionHint(role: Role | undefined): string {
  if (role === 'clinical_staff') {
    return 'Clinical Staff have read-only access. Ask a Site or Study Administrator to make this change.'
  }
  return 'Your role does not include this action. Ask a Site Administrator if you need access.'
}
