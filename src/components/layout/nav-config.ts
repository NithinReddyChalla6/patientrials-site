import {
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  Landmark,
  ListChecks,
  History,
  Network,
  Settings,
  TestTube,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Permission } from '@/features/auth/roles'

export interface NavItem {
  to: string
  /** Must match the legacy label — the Playwright suite navigates by these. */
  label: string
  icon: LucideIcon
  /** Hidden entirely when the signed-in role lacks this permission. */
  permission?: Permission
  /** Matches child routes as well as the exact path. */
  end?: boolean
  /** Marked in the UI as reconstructed rather than evidenced by the legacy app. */
  inferred?: boolean
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

/**
 * Site Solution navigation.
 *
 * Labels are the legacy ones — `getByRole('link', { name: 'Studies' })` and
 * `{ name: 'New Study Request' }` are load-bearing, and staff know these words.
 * The arrangement is not: thirteen peers in one column made every destination
 * look equally likely, when in practice a site lives in Studies and visits the
 * rest occasionally. Grouping by the job each serves puts the daily work first
 * and the setup screens where setup screens belong.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'work',
    label: 'Work',
    items: [
      { to: '/studies', label: 'Studies', icon: FlaskConical, permission: 'study.view' },
      { to: '/requests', label: 'New Study Request', icon: Inbox, permission: 'study.view' },
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, inferred: true },
    ],
  },
  {
    id: 'library',
    label: 'Library',
    items: [
      { to: '/forms', label: 'Forms', icon: FileText, permission: 'form.view' },
      {
        to: '/question-groups',
        label: 'Question Groups',
        icon: ListChecks,
        permission: 'form.view',
        inferred: true,
      },
    ],
  },
  {
    id: 'site',
    label: 'Site',
    items: [
      { to: '/site', label: 'Edit Site', icon: Settings, permission: 'site.view', end: true },
      { to: '/site/past-trials', label: 'Past Trials', icon: History, permission: 'site.view' },
      { to: '/site/irb', label: 'IRB details', icon: Landmark, permission: 'site.view' },
      { to: '/site/labs', label: 'Labs Associated', icon: TestTube, permission: 'site.view' },
      {
        to: '/site/facilities',
        label: 'Facility Services',
        icon: Building2,
        permission: 'site.view',
      },
      { to: '/site/team', label: 'Collaborators', icon: Users, permission: 'site.view' },
      {
        to: '/site/hierarchy',
        label: 'Site Hierarchy',
        icon: Network,
        permission: 'site.view',
        inferred: true,
      },
    ],
  },
]

/** Flat list, for the command palette and anything that needs every destination. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)


/** Tabs inside the study workspace, in the order a study is set up. */
export interface StudyTab {
  segment: string
  label: string
  icon: LucideIcon
  permission?: Permission
}

export const STUDY_TABS: StudyTab[] = [
  { segment: '', label: 'Overview', icon: LayoutDashboard },
  { segment: 'participants', label: 'Participants', icon: Users, permission: 'study.view' },
  { segment: 'prescreening', label: 'Pre-screening', icon: ListChecks, permission: 'study.view' },
  { segment: 'forms', label: 'Forms', icon: FileText, permission: 'form.view' },
  { segment: 'surveys', label: 'Surveys', icon: ClipboardList, permission: 'form.view' },
  { segment: 'appointments', label: 'Appointments', icon: CalendarClock, permission: 'study.view' },
  { segment: 'notifications', label: 'Notifications', icon: Inbox, permission: 'study.view' },
  { segment: 'locations', label: 'Locations', icon: Building2, permission: 'study.view' },
  { segment: 'team', label: 'Team', icon: Users, permission: 'study.view' },
]

/** Site profile tabs, addressable so the sidebar can deep-link into each one. */
export const SITE_TABS = [
  { segment: '', label: 'Site details' },
  { segment: 'past-trials', label: 'Past Trials' },
  { segment: 'irb', label: 'IRB details' },
  { segment: 'labs', label: 'Labs Associated' },
  { segment: 'facilities', label: 'Facility Services' },
] as const

export type SiteTabSegment = (typeof SITE_TABS)[number]['segment']
