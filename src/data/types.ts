/**
 * Domain model — one source of truth for the whole app.
 *
 * Field names and enum values mirror the legacy PatienTrials entities so that a
 * real API can be dropped in behind `data/api.ts` without reshaping the UI.
 * Where the legacy stored free text that was really an enum (trial phase, trial
 * status, response type), it is typed as a union here.
 */

/* ------------------------------------------------------------------ people */

export type Role =
  | 'site_administrator'
  | 'principal_investigator'
  | 'study_administrator'
  | 'study_coordinator'
  | 'clinical_staff'

export const ROLE_LABELS: Record<Role, string> = {
  site_administrator: 'Site Administrator',
  principal_investigator: 'Principal Investigator',
  study_administrator: 'Study Administrator',
  study_coordinator: 'Study Coordinator',
  clinical_staff: 'Clinical Staff',
}

/** The four sign-up paths offered on the legacy landing page. */
export type Persona = 'site_admin' | 'site_network_admin' | 'independent_nurse' | 'participant'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: Role
  siteId: string
  active: boolean
  invitedAt?: string
}

/* -------------------------------------------------------------------- site */

export interface Address {
  street: string
  city: string
  state: string
  zip: string
  country: string
}

export interface Site {
  id: string
  name: string
  number: string
  adminName: string
  /** The platform the site is hosted on — shown on the record, not editable. */
  vendor: string
  /** Where the site sits in its network, and the hierarchy it is pre-approved
   *  for. Read-only references managed by the platform. */
  siteHierarchy?: string
  preApprovedSiteHierarchy?: string
  active: boolean
  briefDescription: string
  logoName?: string
  mobileImageName?: string
  /** Optional externally-hosted mobile image, used when no file is uploaded. */
  mobileImageUrl?: string
  timeZone: string
  address: Address
  /** Facility information — the conditions, focus and capacity a sponsor weighs. */
  conditions: string[]
  keywords: string[]
  therapyArea: string
  capacity: number
  expectedEnrollment: number
  totalEnrollment: number
}

export const TRIAL_PHASES = [
  'Phase 0',
  'Phase I',
  'Phase I/II',
  'Phase IIa',
  'Phase IIb',
  'Phase II',
  'Phase II/III',
  'Phase III',
  'Phase IV',
] as const
export type TrialPhase = (typeof TRIAL_PHASES)[number]

export const TRIAL_STATUSES = [
  'Not yet recruiting',
  'Recruiting',
  'Enrolling by invitation',
  'Active, not recruiting',
  'Suspended',
  'Terminated',
  'Completed',
] as const
export type TrialStatus = (typeof TRIAL_STATUSES)[number]

export interface PastTrial {
  id: string
  siteId: string
  therapyArea: string
  fundedBy: string
  phase: TrialPhase
  status: TrialStatus
}

export interface IrbDetail {
  id: string
  siteId: string
  name: string
  registrationNumber: string
  centralIrb: boolean
  primaryContact: string
  processDetails: string
  meetingFrequency: string
  averageDaysForApproval: string
  paymentToIrb: string
  address: Address
}

export interface Lab {
  id: string
  siteId: string
  name: string
  accreditationDetails: string
  primaryContact: string
  address: Address
}

export interface Facility {
  id: string
  siteId: string
  name: string
  type: string
  active: boolean
  serviceEquipment: string
  servicesOffered: string
  address: Partial<Address>
}

/* ------------------------------------------------------------------ study */

export type StudyStatus = 'promoted' | 'active' | 'archived'

export interface StudyPromotion {
  conditions: string[]
  locations: string[]
  upcomingResearch: string[]
  minimumAge: string
}

export interface Study {
  id: string
  nctId: string
  title: string
  condition: string
  phase: TrialPhase
  sponsor: string
  status: StudyStatus
  recruitmentStatus: TrialStatus
  principalInvestigatorId?: string
  /** Plain-language summary from the registry — how staff recognise a study. */
  briefSummary: string
  consentDocuments: number
  enrollmentTarget: number
  enrolled: number
  createdAt: string
  promotedAt?: string
  /** Plain-language promotion copy, captured by the promote step. */
  promotion?: StudyPromotion
}

/** A study plus the per-study counts the studies list shows on each card. */
export interface StudyWithCounts extends Study {
  prospects: number
  subjects: number
}

export type StudyRequestStatus = 'submitted' | 'under_review' | 'site_selected' | 'declined'

export interface SiteInitiationResponse {
  interested: 'yes' | 'no'
  availableStaff: string[]
  comments: string
  attachmentName?: string
  submittedAt: string
}

export interface StudyRequest {
  id: string
  nctId: string
  title: string
  sponsor: string
  status: StudyRequestStatus
  submittedAt: string
  /** Set once the site has answered the site-selection questionnaire. */
  response?: SiteInitiationResponse
}

/* --------------------------------------------------------------- subjects */

export type SubjectStatus = 'pending' | 'validated' | 'rejected' | 'recruited'

export interface Subject {
  id: string
  studyId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  city: string
  zipcode: string
  gender: string
  dateOfBirth: string
  smokingStatus: string
  primaryLanguage: string
  ethnicity: string[]
  healthCondition: string
  status: SubjectStatus
  createdAt: string
  prescreeningAnswers: { question: string; answer: string; desired?: string }[]
}

/* ------------------------------------------- pre-screening question groups */

export type PrescreeningGroup = 'primary' | 'secondary'
export type PrescreeningResponseType = 'Single Choice' | 'Free Text' | 'Yes/No'

export interface PrescreeningQuestion {
  id: string
  studyId: string
  group: PrescreeningGroup
  question: string
  order: number
  responseType: PrescreeningResponseType
  /** Single Choice only — the options offered to the participant. */
  choices: string[]
  /** Single Choice only — the answer that keeps a participant eligible. */
  desiredAnswer?: string
  correctAnswer: boolean
}

/* ------------------------------------------------------------------- forms */

export type FormStatus = 'draft' | 'published'
export type FormCategory = 'form' | 'survey'
export type FormType = 'Intake' | 'Follow-up' | 'Screening' | 'Safety' | 'Unassigned'

export const QUESTION_TYPES = [
  'Text',
  'Choice',
  'Number',
  'Rating',
  'Date and/or Time',
  'URL',
  'Attachment',
] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]

export interface FormQuestion {
  id: string
  type: QuestionType
  prompt: string
  required: boolean
  /** Choice only. */
  options: string[]
  /** Rating only — either a named preset or custom endpoint labels. */
  rating?: { scale: number; preset: string; lowLabel: string; highLabel: string }
}

export interface FormSection {
  id: string
  title: string
  description: string
  questions: FormQuestion[]
}

export interface StudyForm {
  id: string
  title: string
  description: string
  category: FormCategory
  type: FormType
  status: FormStatus
  sections: FormSection[]
  createdAt: string
  updatedAt: string
  publishedAt?: string
  startDate?: string
  /** Studies this form has been assigned to. */
  assignedStudyIds: string[]
}

/* ------------------------------------------------------------ appointments */

export type ScheduleType = 'In person' | 'Virtual'
export type Frequency = 'One time' | 'Recurring'

export interface AppointmentTemplate {
  id: string
  studyId: string
  name: string
  assignedToId?: string
  scheduleType: ScheduleType
  frequency: Frequency
  week: string
  day: string
  hours: string
  createdAt: string
}

/* --------------------------------------------- patient notification groups */

export type NotificationCadence = 'Daily' | 'Weekly' | 'Monthly' | 'Per visit'
export type NotificationResponseType = 'Y/N' | 'Rating' | 'Free Text' | 'Number'

export interface NotificationQuestion {
  id: string
  text: string
  cadence: NotificationCadence
  responseType: NotificationResponseType
}

export interface NotificationGroup {
  id: string
  studyId: string
  title: string
  templateName: string
  questions: NotificationQuestion[]
  createdAt: string
}

/* ------------------------------------------------------ approved locations */

export interface ApprovedLocation {
  id: string
  studyId: string
  facilityType: string
  facilityName: string
  address: string
  enabled: boolean
}

/* ------------------------------------------------- public participant side */

export interface PublicTrial {
  nctId: string
  studyId: string
  title: string
  summary: string
  condition: string
  phase: TrialPhase
  recruitmentStatus: TrialStatus
  sponsor: string
  minimumAge: string
  locations: string[]
  eligibility: string[]
  estimatedDuration: string
}

export interface EnrollmentPayload {
  nctId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  city: string
  zipcode: string
  gender: string
  currentGender: string
  dateOfBirth: string
  smokingStatus: string
  primaryLanguage: string
  ethnicity: string[]
  healthCondition: string
  notificationConsent: boolean
  termsConsent: boolean
  prescreeningAnswers: { question: string; answer: string }[]
}

/* ------------------------------------------------------- generic responses */

export interface Paged<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
