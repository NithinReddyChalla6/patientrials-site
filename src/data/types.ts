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
  /**
   * Set when an administrator issues a password. The account cannot be used for
   * anything else until the holder chooses their own password.
   */
  mustChangePassword?: boolean
}

/** What a password must satisfy. Stated on screen so it is not guesswork. */
export const PASSWORD_RULES = [
  'At least 8 characters',
  'No more than 40 characters',
  'At least one lowercase letter',
  'At least one uppercase letter',
  'At least one number',
] as const

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

/* ----------------------------------------------------------- appointments */

/**
 * A visit booked for one participant.
 *
 * Distinct from AppointmentTemplate, which describes a recurring pattern; this
 * is a specific participant, at a specific time, in a specific place.
 */
export interface Appointment {
  id: string
  studyId: string
  subjectId: string
  /**
   * The protocol visit this booking satisfies, when it satisfies one. Without
   * it a booking is only a date, and nothing can tell whether a participant's
   * Week 4 visit happened. Absent for ad-hoc visits, which are outside the
   * protocol by definition.
   */
  templateId?: string
  description: string
  scheduleType: ScheduleType
  /** Who the participant is seeing. */
  withName: string
  /** Forms that must be completed at this visit. */
  formIds: string[]
  date: string
  timeSlot: string
  /** Where it happens. Not used for a virtual visit. */
  locationId?: string
  createdAt: string
}

/* ---------------------------------------------------------------- consent */

/**
 * A comprehension check on a consent document: what the participant is asked,
 * and the answer that shows they understood.
 */
export interface ConsentQuestion {
  question: string
  desiredAnswer: string
}

/** A consent document a participant signs electronically. */
/**
 * Something a participant watches or reads alongside the document.
 *
 * The legacy wizard called this step Interactions and offered a type and a
 * link — a consent video sits beside the PDF rather than inside it.
 */
export interface ConsentInteraction {
  type: string
  link: string
}

export interface EConsent {
  id: string
  studyId: string
  description: string
  /** Some consents must be countersigned by a witness. */
  witnessRequired: boolean
  documentName?: string
  questions: ConsentQuestion[]
  /**
   * Optional because consents saved before this field existed do not have it.
   * A stored record is older than the code reading it, and treating it as
   * required crashed the screen on exactly those rows.
   */
  interactions?: ConsentInteraction[]
  createdAt: string
}

/* -------------------------------------------------------- group sessions */

/**
 * A session several participants attend together, at an approved location.
 * Individual visits are appointments; this is the group equivalent.
 */
export interface GroupSession {
  id: string
  studyId: string
  description: string
  /** Kind of venue, matching the approved location's facility type. */
  category: string
  /** Who runs the session. */
  role: string
  startAt: string
  endAt: string
  locationId: string
  createdAt: string
}

/* --------------------------------------------------------- sponsor queries */

/** A question the site has raised with the sponsor, and the sponsor's reply. */
export interface SponsorQuery {
  id: string
  studyId: string
  question: string
  raisedByName: string
  createdAt: string
  status: 'open' | 'answered'
  response?: string
  respondedAt?: string
}

/* ------------------------------------------------------------ medications */

/** A medication a study can prescribe. Defined once, prescribed many times. */
export interface Medication {
  id: string
  studyId: string
  name: string
  description: string
  createdAt: string
}

/**
 * One participant's course of a medication: when it runs, how much, and at
 * which times on which days.
 */
export interface Prescription {
  id: string
  subjectId: string
  medicationId: string
  startDate: string
  endDate: string
  quantity: number
  /** Times of day the dose is taken. */
  doseWindows: string[]
  /** Days of the week it is taken. */
  days: string[]
  createdAt: string
}

/* ----------------------------------------------------------- study assets */

/** A published asset is visible to its audience; a draft is not. */
export type AssetStatus = 'draft' | 'published'

/**
 * Material attached to a study — a protocol, a training deck, a participant
 * guide. Assets are drafted, given an audience, then published.
 */
export interface StudyAsset {
  id: string
  studyId: string
  type: string
  title: string
  /** Optional link to where the material is hosted. */
  link: string
  description: string
  /**
   * What language the material is written in. Optional: assets stored before
   * this field existed do not carry one, and the form is the only thing that
   * can tell you.
   */
  language?: string
  /** File name only; nothing is stored in this build. */
  documentName?: string
  targetAudience?: string
  status: AssetStatus
  createdAt: string
  publishedAt?: string
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
  /**
   * Participants currently at status `recruited`, counted from the records on
   * every read. Any value sitting in storage is ignored: this was once a tally
   * kept in step by hand and it drifted badly.
   */
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

/**
 * The screening pipeline, in the order a participant moves through it. The
 * legacy portal showed these six as counts across the top of the subject list.
 */
export type SubjectStatus =
  | 'pending'
  | 'validated'
  | 'prescreened'
  | 'recruited'
  | 'rejected'
  | 'dropped'

/**
 * The three decisions a reviewer takes on a participant. The remaining stages
 * are reached by other means, so they are not offered as review actions.
 */
export type TriageAction = 'validated' | 'recruited' | 'rejected'

/** Pipeline order, for the stage counts and filters. */
export const SUBJECT_PIPELINE: SubjectStatus[] = [
  'pending',
  'validated',
  'prescreened',
  'recruited',
  'rejected',
  'dropped',
]

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
  /**
   * When the participant was recruited onto the study. Distinct from
   * `createdAt`, which is when the record was made: protocol visits are counted
   * from enrolment, so a record created during pre-screening weeks earlier would
   * put every due date wrong. Absent until the status reaches `recruited`.
   */
  recruitedAt?: string
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
  /** Week and day are counted from the participant's enrolment date. */
  week: string
  day: string
  hours: string
  /**
   * How many days either side of the due date the visit may still happen in.
   * A protocol states these as "Week 4 (+/- 3 days)"; outside the window the
   * visit is a deviation. Absent means the protocol allows no slack.
   */
  windowDays?: number
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

/* ------------------------------------------- broadcasts, notes, transfers */

/**
 * A message sent to several participants at once.
 *
 * The audience is stored as the rule that chose it, not as the list it
 * resolved to. A study's participants move between statuses constantly, and a
 * frozen list of ids would stop explaining, months later, why a given person
 * received it — "everyone recruited, on the 3rd" still does.
 */
export interface BroadcastMessage {
  id: string
  studyId: string
  /** The line participants see first. */
  subject: string
  body: string
  /** Which participants it went to: a status, or everyone on the study. */
  audience: SubjectStatus | 'all'
  /** How many it reached when sent, kept because the audience will drift. */
  recipientCount: number
  sentBy: string
  sentAt: string
}

/**
 * A note about one participant.
 *
 * Append-only by design: notes are the running account of what staff observed
 * and decided, and one that can be rewritten afterwards is worth little when a
 * monitor asks what was known and when.
 */
export interface SubjectNote {
  id: string
  studyId: string
  subjectId: string
  body: string
  author: string
  createdAt: string
}

export type TransferStatus = 'initiated' | 'accepted' | 'declined' | 'withdrawn'

/** A participant moving to another site, and how that request ended. */
export interface Transfer {
  id: string
  studyId: string
  subjectId: string
  /** Where they are going. */
  toSiteName: string
  reason: string
  status: TransferStatus
  initiatedBy: string
  initiatedAt: string
  resolvedAt?: string
  resolutionNote?: string
}
