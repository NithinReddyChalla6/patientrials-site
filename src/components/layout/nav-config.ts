import {
  Bot,
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileSignature,
  FileText,
  FlaskConical,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  Landmark,
  ArrowRightLeft,
  Megaphone,
  MessageSquare,
  NotebookPen,
  ListChecks,
  History,
  Network,
  Pill,
  Settings,
  TestTube,
  UserSearch,
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
      { to: '/requests', label: 'New Study Request', icon: Inbox, permission: 'study.setup' },
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, inferred: true },
      {
        to: '/emr-preview',
        label: 'EMR Preview',
        icon: Database,
        permission: 'study.view',
        inferred: true,
      },
    ],
  },
  {
    // Gated on `form.create`, not `form.view`. The library is where forms and
    // question groups are built; an investigator assigns them inside a study
    // and never authors one, so a link to the workshop is noise on their nav.
    id: 'library',
    label: 'Library',
    items: [
      { to: '/forms', label: 'Forms', icon: FileText, permission: 'form.create' },
      {
        to: '/question-groups',
        label: 'Question Groups',
        icon: ListChecks,
        permission: 'form.create',
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


/**
 * Tabs inside the study workspace, in the order a study is set up.
 *
 * Each tab is gated on the permission that names the work it does, not on a
 * blanket `study.view`. That is what separates the two consoles: a Principal
 * Investigator holds `appointment.manage`, `consent.manage`, `medication.manage`,
 * `asset.manage` and `query.manage` but not `study.setup`, so this one list
 * yields their narrow clinical view and everyone else's full workspace without
 * a second list to keep in step.
 */
export interface StudyTab {
  segment: string
  label: string
  icon: LucideIcon
  permission?: Permission
}

export const STUDY_TABS: StudyTab[] = [
  { segment: 'participants', label: 'Subjects', icon: Users, permission: 'study.view' },
  { segment: 'assistant', label: 'Assistant', icon: Bot, permission: 'study.view' },
  { segment: 'prospects', label: 'Study Prospects', icon: UserSearch, permission: 'study.setup' },
  { segment: 'overview', label: 'Overview', icon: LayoutDashboard, permission: 'study.setup' },
  { segment: 'prescreening', label: 'Pre-screening', icon: ListChecks, permission: 'study.setup' },
  { segment: 'forms', label: 'Forms', icon: FileText, permission: 'study.setup' },
  { segment: 'surveys', label: 'Surveys', icon: ClipboardList, permission: 'study.setup' },
  { segment: 'assets', label: 'Study Assets', icon: FolderOpen, permission: 'asset.manage' },
  { segment: 'medications', label: 'Medications', icon: Pill, permission: 'medication.manage' },
  {
    segment: 'econsents',
    label: 'Consent Documents',
    icon: FileSignature,
    permission: 'consent.manage',
  },
  {
    segment: 'appointments',
    label: 'Appointment Templates',
    icon: CalendarClock,
    permission: 'appointment.manage',
  },
  {
    segment: 'group-sessions',
    label: 'Group Appointments',
    icon: CalendarDays,
    permission: 'session.manage',
  },
  {
    segment: 'visit-compliance',
    label: 'Visit Compliance',
    icon: CalendarCheck,
    permission: 'appointment.manage',
  },
  {
    segment: 'queries',
    label: 'Query with Sponsor',
    icon: MessageSquare,
    permission: 'query.manage',
  },
  { segment: 'broadcast', label: 'Broadcast Message', icon: Megaphone, permission: 'broadcast.send' },
  { segment: 'notes', label: 'Patient Notes', icon: NotebookPen, permission: 'note.manage' },
  {
    segment: 'transfers',
    label: 'Transfer Initiated',
    icon: ArrowRightLeft,
    permission: 'transfer.manage',
  },
  {
    segment: 'transfers-resolved',
    label: 'Transfer Resolved',
    icon: ArrowRightLeft,
    permission: 'transfer.manage',
  },
  { segment: 'notifications', label: 'Notifications', icon: Inbox, permission: 'study.setup' },
  {
    segment: 'pending-tasks',
    label: 'Pending Tasks',
    icon: ClipboardCheck,
    permission: 'study.setup',
  },
  {
    segment: 'locations',
    label: 'Approved Locations',
    icon: Building2,
    permission: 'location.manage',
  },
  { segment: 'team', label: 'Team', icon: Users, permission: 'study.setup' },
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
