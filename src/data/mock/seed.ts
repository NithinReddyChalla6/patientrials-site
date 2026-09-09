import type {
  Appointment,
  BroadcastMessage,
  ApprovedLocation,
  AppointmentTemplate,
  Facility,
  IrbDetail,
  Lab,
  NotificationGroup,
  PastTrial,
  PrescreeningQuestion,
  PublicTrial,
  Site,
  Study,
  EConsent,
  GroupSession,
  Medication,
  SponsorQuery,
  Prescription,
  StudyAsset,
  StudyForm,
  StudyRequest,
  Subject,
  SubjectNote,
  Transfer,
  SubjectStatus,
  User,
} from '../types'

/**
 * Seed data for the in-memory store.
 *
 * Values are drawn from the legacy Playwright specs and screenshots wherever
 * they existed (site MDASIT10, PI "lilly joy", lab "Quest Diagnostics", facility
 * "Sunshine Medical Center", the Ayurvedic Lifestyle form) so the demo reflects
 * the real product rather than generic filler.
 */

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
/** The date part alone, which is what a booking stores. */
const dateAgo = (n: number) => daysAgo(n).slice(0, 10)
/** A datetime-local value (no seconds or zone), which is what the pickers use. */
const daysAhead = (n: number, time = '09:30') =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10) + 'T' + time

export const SITE_ID = 'SITE-MDASIT10'

export const site: Site = {
  id: SITE_ID,
  name: 'Plano Clinical Research',
  number: 'MDASIT10',
  adminName: 'Nick Wilde',
  vendor: 'PatienTrials',
  siteHierarchy: 'PatienTrials US Sites',
  preApprovedSiteHierarchy: 'Cardiometabolic Research Network',
  active: true,
  briefDescription:
    'A multi-specialty research site running cardiovascular, metabolic and respiratory trials across two campuses in the Dallas–Fort Worth metroplex.',
  timeZone: '(GMT-06:00) Central Time',
  address: {
    street: '4100 W Spring Creek Pkwy',
    city: 'Plano',
    state: 'Texas',
    zip: '75024',
    country: 'United States of America',
  },
  conditions: ['Heart Failure', 'Type 2 Diabetes', 'COPD'],
  keywords: ['cardiology', 'metabolic', 'respiratory', 'phase II', 'phase III'],
  therapyArea: 'Cardiovascular Disorders/Diseases-Heart Failure',
  capacity: 120,
  expectedEnrollment: 60,
  totalEnrollment: 19,
}

export const users: User[] = [
  {
    id: 'USR-001',
    firstName: 'Nick',
    lastName: 'Wilde',
    email: 'nick.wilde@plano-research.com',
    role: 'site_administrator',
    siteId: SITE_ID,
    active: true,
    invitedAt: daysAgo(420),
  },
  {
    id: 'USR-002',
    firstName: 'Lilly',
    lastName: 'Joy',
    email: 'lilly.joy@plano-research.com',
    role: 'principal_investigator',
    siteId: SITE_ID,
    active: true,
    invitedAt: daysAgo(380),
  },
  {
    id: 'USR-003',
    firstName: 'Robert',
    lastName: 'Helsinki',
    email: 'robert@helsinki.com',
    role: 'principal_investigator',
    siteId: SITE_ID,
    active: true,
    invitedAt: daysAgo(300),
  },
  {
    id: 'USR-004',
    firstName: 'Judy',
    lastName: 'Hopps',
    email: 'judy@hopps.com',
    role: 'study_coordinator',
    siteId: SITE_ID,
    active: true,
    invitedAt: daysAgo(210),
  },
  {
    id: 'USR-005',
    firstName: 'Marcus',
    lastName: 'Bell',
    email: 'marcus.bell@plano-research.com',
    role: 'study_administrator',
    siteId: SITE_ID,
    active: true,
    invitedAt: daysAgo(150),
  },
  {
    id: 'USR-006',
    firstName: 'Priya',
    lastName: 'Raman',
    email: 'priya.raman@plano-research.com',
    role: 'clinical_staff',
    siteId: SITE_ID,
    active: false,
    invitedAt: daysAgo(24),
  },
]

export const pastTrials: PastTrial[] = [
  {
    id: 'PT-1',
    siteId: SITE_ID,
    therapyArea: 'Cardiovascular Disorders/Diseases-Acute Coronary Syndrome',
    fundedBy: 'Johnson & Johnson',
    phase: 'Phase I',
    status: 'Completed',
  },
  {
    id: 'PT-2',
    siteId: SITE_ID,
    therapyArea: 'Endocrine Disorders/Diseases-Type 2 Diabetes',
    fundedBy: 'Novo Nordisk',
    phase: 'Phase III',
    status: 'Recruiting',
  },
  {
    id: 'PT-3',
    siteId: SITE_ID,
    therapyArea: 'Respiratory-COPD',
    fundedBy: 'AstraZeneca',
    phase: 'Phase II',
    status: 'Active, not recruiting',
  },
]

export const irbDetails: IrbDetail[] = [
  {
    id: 'IRB-1',
    siteId: SITE_ID,
    name: 'Advarra IRB',
    registrationNumber: 'IRB000987',
    centralIrb: true,
    primaryContact: 'Dr. Karen Whitfield',
    processDetails: 'Initial submission followed by full board review.',
    meetingFrequency: 'Monthly',
    averageDaysForApproval: '30',
    paymentToIrb: 'Paid by sponsor',
    address: {
      street: '6100 Merriweather Dr',
      city: 'Plano',
      state: 'Texas',
      zip: '75023',
      country: 'United States of America',
    },
  },
]

export const labs: Lab[] = [
  {
    id: 'LAB-1',
    siteId: SITE_ID,
    name: 'Quest Diagnostics',
    accreditationDetails: 'CLIA certified and CAP accredited',
    primaryContact: 'Dr. Michael Brown',
    address: {
      street: '4100 W Spring Creek Pkwy',
      city: 'Plano',
      state: 'Texas',
      zip: '75024',
      country: 'United States of America',
    },
  },
  {
    id: 'LAB-2',
    siteId: SITE_ID,
    name: 'LabCorp Central',
    accreditationDetails: 'CAP accredited, ISO 15189',
    primaryContact: 'Dr. Angela Reyes',
    address: {
      street: '1447 York Ct',
      city: 'Burlington',
      state: 'North Carolina',
      zip: '27215',
      country: 'United States of America',
    },
  },
]

export const facilities: Facility[] = [
  {
    id: 'FAC-1',
    siteId: SITE_ID,
    name: 'Plano Clinical Research',
    type: 'Research units',
    active: true,
    serviceEquipment: 'ECG, phlebotomy, sample storage',
    servicesOffered: 'Screening visits, infusion, sample processing, -80C storage',
    address: { city: 'Plano', state: 'Texas', country: 'United States of America' },
  },
  {
    id: 'FAC-2',
    siteId: SITE_ID,
    name: 'Sunshine Medical Center',
    type: 'Clinics',
    active: true,
    serviceEquipment: 'Imaging, spirometry, DEXA',
    servicesOffered: 'Imaging, pulmonary function testing, bone density',
    address: { city: 'Frisco', state: 'Texas', country: 'United States of America' },
  },
]

export const studies: Study[] = [
  {
    id: 'STU01268',
    nctId: 'NCT07764380',
    title: 'Semaglutide for Weight Management in Adults With Type 2 Diabetes',
    condition: 'Type 2 Diabetes',
    phase: 'Phase III',
    sponsor: 'Novo Nordisk',
    status: 'active',
    recruitmentStatus: 'Recruiting',
    principalInvestigatorId: 'USR-002',
    briefSummary:
      'This 52-week randomised trial evaluates whether once-weekly semaglutide improves glycaemic control and supports sustained weight loss in adults living with type 2 diabetes.',
    consentDocuments: 3,
    enrollmentTarget: 120,
    enrolled: 74,
    createdAt: daysAgo(96),
    promotedAt: daysAgo(90),
    promotion: {
      conditions: ['Adults aged 18 and over', 'Diagnosed with type 2 diabetes'],
      locations: ['Living in or near Plano, Texas'],
      upcomingResearch: ['A 52-week study of a once-weekly injectable treatment'],
      minimumAge: '18',
    },
  },
  {
    id: 'STU01360',
    nctId: 'NCT06612094',
    title: 'Inhaled Triple Therapy in Moderate to Severe COPD',
    condition: 'COPD',
    phase: 'Phase II',
    sponsor: 'AstraZeneca',
    status: 'active',
    recruitmentStatus: 'Recruiting',
    principalInvestigatorId: 'USR-003',
    briefSummary:
      'A randomised comparison of single-inhaler triple therapy against standard dual therapy on exacerbation rate and lung function in adults with moderate to severe COPD.',
    consentDocuments: 2,
    enrollmentTarget: 80,
    enrolled: 31,
    createdAt: daysAgo(64),
  },
  {
    id: 'STU01359',
    nctId: 'NCT05820117',
    title: 'Novel Anticoagulant After Acute Coronary Syndrome',
    condition: 'Acute Coronary Syndrome',
    phase: 'Phase II',
    sponsor: 'Johnson & Johnson',
    status: 'promoted',
    recruitmentStatus: 'Not yet recruiting',
    principalInvestigatorId: 'USR-002',
    briefSummary:
      'The purpose of this trial is to determine whether a novel oral anticoagulant reduces recurrent ischaemic events after acute coronary syndrome without increasing major bleeding.',
    consentDocuments: 1,
    enrollmentTarget: 60,
    enrolled: 0,
    createdAt: daysAgo(21),
    promotedAt: daysAgo(18),
    promotion: {
      conditions: ['Adults who have had a heart attack in the last 12 months'],
      locations: ['Living in the Dallas–Fort Worth area'],
      upcomingResearch: ['A 26-week study comparing two blood-thinning treatments'],
      minimumAge: '21',
    },
  },
  {
    id: 'STU01354',
    nctId: 'NCT04998311',
    title: 'Monoclonal Antibody for Moderate Plaque Psoriasis',
    condition: 'Psoriasis',
    phase: 'Phase III',
    sponsor: 'Eli Lilly',
    status: 'active',
    recruitmentStatus: 'Enrolling by invitation',
    briefSummary:
      'An open-label extension assessing the long-term safety of a monoclonal antibody in adults with moderate plaque psoriasis who completed the parent study.',
    consentDocuments: 4,
    enrollmentTarget: 45,
    enrolled: 45,
    createdAt: daysAgo(200),
  },
  {
    id: 'STU01006',
    nctId: 'NCT03771902',
    title: 'Long-Term Safety of an Antihypertensive Combination',
    condition: 'Hypertension',
    phase: 'Phase IV',
    sponsor: 'Boehringer Ingelheim',
    status: 'archived',
    recruitmentStatus: 'Completed',
    principalInvestigatorId: 'USR-003',
    briefSummary:
      'A post-marketing surveillance study of a fixed-dose antihypertensive combination, following blood pressure control and adverse events over 24 months.',
    consentDocuments: 5,
    enrollmentTarget: 150,
    enrolled: 150,
    createdAt: daysAgo(720),
  },
  {
    id: 'STU00944',
    nctId: 'NCT03220145',
    title: 'Migraine Prevention With a CGRP Inhibitor',
    condition: 'Migraine',
    phase: 'Phase II',
    sponsor: 'Teva',
    status: 'archived',
    recruitmentStatus: 'Terminated',
    briefSummary:
      'A dose-ranging study of a CGRP inhibitor for migraine prevention. Terminated early following a planned interim analysis.',
    consentDocuments: 0,
    enrollmentTarget: 90,
    enrolled: 12,
    createdAt: daysAgo(880),
  },
  {
    id: 'STU01402',
    nctId: 'NCT08115523',
    title: 'Digital Adherence Support in Heart Failure',
    condition: 'Heart Failure',
    phase: 'Phase I',
    sponsor: 'Medtronic',
    status: 'promoted',
    recruitmentStatus: 'Not yet recruiting',
    briefSummary:
      'A feasibility study of a digital adherence platform in heart failure, measuring medication adherence and unplanned admissions over 24 weeks.',
    consentDocuments: 0,
    enrollmentTarget: 40,
    enrolled: 0,
    createdAt: daysAgo(7),
    promotedAt: daysAgo(5),
  },
]

export const studyRequests: StudyRequest[] = [
  {
    id: 'SR0001448',
    nctId: 'NCT07764380',
    title: 'Semaglutide for Weight Management in Adults With Type 2 Diabetes',
    sponsor: 'Novo Nordisk',
    status: 'site_selected',
    submittedAt: daysAgo(112),
    response: {
      interested: 'yes',
      availableStaff: ['Study coordinator', 'Principal investigator'],
      comments: 'Site has prior experience with GLP-1 protocols and dedicated freezer capacity.',
      attachmentName: 'site-capability-statement.pdf',
      submittedAt: daysAgo(110),
    },
  },
  {
    id: 'SR0001512',
    nctId: 'NCT08115523',
    title: 'Digital Adherence Support in Heart Failure',
    sponsor: 'Medtronic',
    status: 'under_review',
    submittedAt: daysAgo(9),
  },
  {
    id: 'SR0001530',
    nctId: 'NCT09004471',
    title: 'Early Detection Biomarkers in Non-Small Cell Lung Cancer',
    sponsor: 'Roche',
    status: 'submitted',
    submittedAt: daysAgo(3),
  },
  {
    id: 'SR0001318',
    nctId: 'NCT03220145',
    title: 'Migraine Prevention With a CGRP Inhibitor',
    sponsor: 'Teva',
    status: 'declined',
    submittedAt: daysAgo(890),
  },
]

/* --------------------------------------------------------------- subjects */

const FIRST = [
  'Amelia', 'Noah', 'Priya', 'Mateo', 'Grace', 'Elijah', 'Zoe', 'Omar', 'Hannah', 'Lucas',
  'Ivy', 'Daniel', 'Sofia', 'Ethan', 'Maya', 'Caleb', 'Nora', 'Isaac', 'Leila', 'Owen',
  'Ruth', 'Jonas', 'Anika', 'Felix', 'Talia', 'Hugo',
]
const LAST = [
  'Whitfield', 'Ramirez', 'Nair', 'Alvarez', 'Okonkwo', 'Bennett', 'Fischer', 'Haddad',
  'Lindqvist', 'Moreau', 'Petrov', 'Sandoval', 'Tanaka', 'Underwood', 'Vargas', 'Weiss',
]
const CITIES: [string, string][] = [
  ['Plano', '75024'], ['Frisco', '75034'], ['Dallas', '75201'], ['Allen', '75002'],
  ['McKinney', '75069'], ['Richardson', '75080'],
]
const STATUS_CYCLE: SubjectStatus[] = [
  'pending', 'validated', 'pending', 'recruited', 'prescreened', 'rejected',
  'validated', 'pending', 'recruited', 'dropped', 'prescreened', 'pending',
]

/** Deterministic so the demo is stable between reloads. */
function buildSubjects(): Subject[] {
  const out: Subject[] = []
  const perStudy: Record<string, number> = {
    STU01268: 14,
    STU01360: 9,
    STU01354: 5,
    STU01359: 0,
    STU01402: 0,
    STU01006: 0,
    STU00944: 0,
  }
  let n = 240100
  Object.entries(perStudy).forEach(([studyId, count]) => {
    for (let i = 0; i < count; i += 1) {
      const first = FIRST[(n + i) % FIRST.length]
      const last = LAST[(n + i * 3) % LAST.length]
      const [city, zipcode] = CITIES[(n + i) % CITIES.length]
      out.push({
        id: `PT${String(n).padStart(6, '0')}`,
        studyId,
        firstName: first,
        lastName: last,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
        phone: `469-555-${String(1000 + ((n * 7) % 9000)).slice(0, 4)}`,
        city,
        zipcode,
        gender: i % 2 === 0 ? 'Female' : 'Male',
        dateOfBirth: `19${60 + (i % 35)}-0${(i % 9) + 1}-1${i % 9}`,
        smokingStatus: ['Never smoked', 'Former smoker', 'Current smoker'][i % 3],
        primaryLanguage: i % 5 === 0 ? 'Spanish' : 'English',
        ethnicity: [
          ['White or Caucasian'],
          ['Hispanic or Latino'],
          ['Asian or Pacific Islander'],
          ['Black or African American'],
          ['American Indian or Alaskan Native', 'Asian or Pacific Islander'],
        ][i % 5],
        healthCondition:
          i % 3 === 0
            ? 'Managed with oral medication, no hospitalisations in the last year.'
            : 'Diagnosed two years ago, currently stable on standard therapy.',
        status: STATUS_CYCLE[i % STATUS_CYCLE.length],
        createdAt: daysAgo((i % 30) + 1),
        // Only a recruited participant has enrolled, and protocol visits are
        // counted from that date rather than from when the record was made.
        recruitedAt:
          STATUS_CYCLE[i % STATUS_CYCLE.length] === 'recruited'
            ? daysAgo(20 + i)
            : undefined,
        prescreeningAnswers: [
          { question: 'Are you 18 years of age or older?', answer: 'Yes', desired: 'Yes' },
          {
            question: 'Have you been diagnosed with the condition under study?',
            answer: i % 6 === 5 ? 'No' : 'Yes',
            desired: 'Yes',
          },
          {
            question: 'Are you currently enrolled in another clinical trial?',
            answer: i % 6 === 5 ? 'Yes' : 'No',
            desired: 'No',
          },
        ],
      })
      n += 1
    }
  })
  return out
}

export const subjects: Subject[] = buildSubjects()

/* ------------------------------------------------ prescreening / questions */

export const prescreeningQuestions: PrescreeningQuestion[] = [
  {
    id: 'PSQ-1',
    studyId: 'STU01268',
    group: 'primary',
    question: 'Are you 18 years of age or older?',
    order: 1,
    responseType: 'Yes/No',
    choices: ['Yes', 'No'],
    desiredAnswer: 'Yes',
    correctAnswer: true,
  },
  {
    id: 'PSQ-2',
    studyId: 'STU01268',
    group: 'primary',
    question: 'Are you currently enrolled in another clinical trial?',
    order: 2,
    responseType: 'Single Choice',
    choices: ['Yes', 'No'],
    desiredAnswer: 'No',
    correctAnswer: true,
  },
  {
    id: 'PSQ-3',
    studyId: 'STU01268',
    group: 'secondary',
    question: 'How long ago were you diagnosed?',
    order: 1,
    responseType: 'Free Text',
    choices: [],
    correctAnswer: false,
  },
  {
    id: 'PSQ-4',
    studyId: 'STU01360',
    group: 'primary',
    question: 'Have you been diagnosed with COPD by a physician?',
    order: 1,
    responseType: 'Single Choice',
    choices: ['Yes', 'No'],
    desiredAnswer: 'Yes',
    correctAnswer: true,
  },
]

/* ------------------------------------------------------------------ forms */

export const forms: StudyForm[] = [
  {
    id: 'FRM-001',
    title: 'Ayurvedic Lifestyle',
    description:
      'This form is designed to understand your daily lifestyle, dietary habits, sleep patterns, digestion and physical activity.',
    category: 'form',
    type: 'Intake',
    status: 'published',
    createdAt: daysAgo(60),
    updatedAt: daysAgo(30),
    publishedAt: daysAgo(30),
    startDate: daysAgo(28),
    assignedStudyIds: ['STU01268'],
    sections: [
      {
        id: 'SEC-1',
        title: 'Section A',
        description: 'General lifestyle and daily routine.',
        questions: [
          {
            id: 'Q-1',
            type: 'Attachment',
            prompt: 'Please upload your latest laboratory report.',
            required: false,
            options: [],
          },
          {
            id: 'Q-2',
            type: 'Choice',
            prompt: 'What is your current smoking status?',
            required: true,
            options: ['Never', 'Former', 'Current'],
          },
          {
            id: 'Q-3',
            type: 'Number',
            prompt: 'How many hours did you sleep last night?',
            required: true,
            options: [],
          },
          {
            id: 'Q-4',
            type: 'Rating',
            prompt: 'How would you rate your overall health today?',
            required: true,
            options: [],
            rating: { scale: 5, preset: 'Custom', lowLabel: 'Very Poor', highLabel: 'Excellent' },
          },
        ],
      },
    ],
  },
  {
    id: 'FRM-002',
    title: 'Baseline Medical History',
    description: 'Captures prior conditions, surgeries and current medication.',
    category: 'form',
    type: 'Screening',
    status: 'published',
    createdAt: daysAgo(180),
    updatedAt: daysAgo(120),
    publishedAt: daysAgo(120),
    startDate: daysAgo(118),
    assignedStudyIds: ['STU01268', 'STU01360'],
    sections: [
      {
        id: 'SEC-2',
        title: 'Medical history',
        description: '',
        questions: [
          {
            id: 'Q-5',
            type: 'Text',
            prompt: 'List any surgeries in the past five years.',
            required: false,
            options: [],
          },
          {
            id: 'Q-6',
            type: 'Date and/or Time',
            prompt: 'What was the date of your most recent hospital visit?',
            required: false,
            options: [],
          },
        ],
      },
    ],
  },
  {
    id: 'FRM-003',
    title: 'Weekly Symptom Diary',
    description: 'Short weekly check-in on symptom burden.',
    category: 'survey',
    type: 'Follow-up',
    status: 'published',
    createdAt: daysAgo(90),
    updatedAt: daysAgo(45),
    publishedAt: daysAgo(45),
    startDate: daysAgo(44),
    assignedStudyIds: ['STU01268'],
    sections: [
      {
        id: 'SEC-3',
        title: 'This week',
        description: '',
        questions: [
          {
            id: 'Q-7',
            type: 'Rating',
            prompt: 'Rate your symptom severity this week.',
            required: true,
            options: [],
            rating: { scale: 5, preset: 'Not at all to Extremely', lowLabel: 'Not at all', highLabel: 'Extremely' },
          },
        ],
      },
    ],
  },
  {
    id: 'FRM-004',
    title: 'Quality of Life (SF-12)',
    description: 'Standard twelve-item quality of life instrument.',
    category: 'survey',
    type: 'Follow-up',
    status: 'published',
    createdAt: daysAgo(300),
    updatedAt: daysAgo(300),
    publishedAt: daysAgo(300),
    startDate: daysAgo(298),
    assignedStudyIds: [],
    sections: [],
  },
  {
    id: 'FRM-005',
    title: 'Site Staff Handover Checklist',
    description: '',
    category: 'form',
    type: 'Unassigned',
    status: 'draft',
    createdAt: daysAgo(4),
    updatedAt: daysAgo(2),
    assignedStudyIds: [],
    sections: [],
  },
  {
    id: 'FRM-006',
    title: 'Adverse Event Report',
    description: 'Structured capture of adverse events between scheduled visits.',
    category: 'form',
    type: 'Safety',
    status: 'draft',
    createdAt: daysAgo(11),
    updatedAt: daysAgo(1),
    assignedStudyIds: [],
    sections: [
      {
        id: 'SEC-4',
        title: 'Event details',
        description: '',
        questions: [
          { id: 'Q-8', type: 'Text', prompt: 'Describe the event.', required: true, options: [] },
        ],
      },
    ],
  },
]

/* ----------------------------------------------------------- appointments */

export const appointmentTemplates: AppointmentTemplate[] = [
  {
    id: 'APT-1',
    studyId: 'STU01268',
    name: 'Screening visit',
    assignedToId: 'USR-002',
    scheduleType: 'In person',
    frequency: 'One time',
    week: '1',
    day: '3',
    hours: '11',
    windowDays: 2,
    createdAt: daysAgo(80),
  },
  {
    id: 'APT-2',
    studyId: 'STU01268',
    name: 'Follow-up check-in',
    assignedToId: 'USR-002',
    scheduleType: 'Virtual',
    frequency: 'Recurring',
    week: '2',
    day: '6',
    hours: '12',
    windowDays: 3,
    createdAt: daysAgo(78),
  },
  {
    id: 'APT-3',
    studyId: 'STU01360',
    name: 'Spirometry visit',
    assignedToId: 'USR-003',
    scheduleType: 'In person',
    frequency: 'Recurring',
    week: '4',
    day: '2',
    hours: '09',
    windowDays: 5,
    createdAt: daysAgo(40),
  },
]

/**
 * Booked visits.
 *
 * Deliberately uneven: one visit inside its window, one outside it, and two
 * never booked at all, so Visit Compliance has each of its states to show
 * rather than a wall of green.
 */
export const bookings: Appointment[] = [
  {
    id: 'BKG-1',
    studyId: 'STU01268',
    subjectId: 'PT240103',
    templateId: 'APT-1',
    description: 'Screening visit',
    scheduleType: 'In person',
    withName: 'Judy Hopps',
    formIds: [],
    date: dateAgo(21),
    timeSlot: '11:00 AM',
    locationId: 'AL-1',
    createdAt: daysAgo(24),
  },
  {
    id: 'BKG-2',
    studyId: 'STU01268',
    subjectId: 'PT240103',
    templateId: 'APT-2',
    description: 'Follow-up check-in',
    scheduleType: 'Virtual',
    withName: 'Judy Hopps',
    formIds: [],
    date: dateAgo(6),
    timeSlot: '1:00 PM',
    createdAt: daysAgo(9),
  },
  {
    id: 'BKG-3',
    studyId: 'STU01268',
    subjectId: 'PT240108',
    templateId: 'APT-1',
    description: 'Screening visit',
    scheduleType: 'In person',
    withName: 'Judy Hopps',
    formIds: [],
    date: dateAgo(26),
    timeSlot: '11:00 AM',
    locationId: 'AL-2',
    createdAt: daysAgo(29),
  },
]

export const notificationGroups: NotificationGroup[] = [
  {
    id: 'NG-1',
    studyId: 'STU01268',
    title: 'Notifications',
    templateName: 'Daily wellbeing check-in',
    createdAt: daysAgo(50),
    questions: [
      { id: 'NQ-1', text: 'Did you do yoga every day?', cadence: 'Daily', responseType: 'Y/N' },
      {
        id: 'NQ-2',
        text: 'Did you take your study medication today?',
        cadence: 'Daily',
        responseType: 'Y/N',
      },
    ],
  },
]

export const approvedLocations: ApprovedLocation[] = [
  {
    id: 'AL-1',
    studyId: 'STU01268',
    facilityType: 'Clinics',
    facilityName: 'Sunshine Medical Center',
    address: 'Frisco, Texas, United States of America',
    enabled: true,
  },
  {
    id: 'AL-2',
    studyId: 'STU01268',
    facilityType: 'Research units',
    facilityName: 'Plano Clinical Research',
    address: 'Plano, Texas, United States of America',
    enabled: true,
  },
  {
    id: 'AL-3',
    studyId: 'STU01360',
    facilityType: 'Clinics',
    facilityName: 'Sunshine Medical Center',
    address: 'Frisco, Texas, United States of America',
    enabled: false,
  },
]

/** Public trial listings, keyed to the promoted/active studies above. */
export const eConsents: EConsent[] = [
  {
    id: 'ICF-7001',
    studyId: 'STU01268',
    description: 'Main study consent, version 4',
    witnessRequired: false,
    documentName: 'ICF_main_v4.pdf',
    questions: [
      {
        question: 'Do you understand that taking part is voluntary and you may withdraw at any time?',
        desiredAnswer: 'Yes',
      },
      {
        question: 'Do you understand that the study drug is given by infusion every three weeks?',
        desiredAnswer: 'Yes',
      },
    ],
    interactions: [
      { type: 'Video', link: 'https://example.org/consent/main-v4-overview' },
    ],
    createdAt: daysAgo(58),
  },
  {
    id: 'ICF-7002',
    studyId: 'STU01268',
    description: 'Optional genetic sub-study consent',
    witnessRequired: true,
    documentName: 'ICF_genetic_substudy.pdf',
    questions: [
      {
        question: 'Do you agree to your samples being stored for future research?',
        desiredAnswer: 'Yes',
      },
    ],
    // Not every consent has one, which is why the step is skippable.
    interactions: [],
    createdAt: daysAgo(21),
  },
]

export const groupSessions: GroupSession[] = [
  {
    id: 'GRP-5001',
    studyId: 'STU01268',
    description: 'Infusion day orientation for the March cohort',
    category: 'Clinics',
    role: 'Clinical Nurse',
    startAt: daysAhead(4, '09:30'),
    endAt: daysAhead(4, '11:00'),
    locationId: 'AL-1',
    createdAt: daysAgo(6),
  },
]

export const sponsorQueries: SponsorQuery[] = [
  {
    id: 'QRY-2001',
    studyId: 'STU01268',
    question:
      'Participant PT240100 missed the day 8 blood draw by 36 hours. Is this a protocol deviation, or within the visit window?',
    raisedByName: 'Lilly Joy',
    createdAt: daysAgo(12),
    status: 'answered',
    response:
      'Within the window. The day 8 assessment has a plus or minus 48 hour allowance, so no deviation is required.',
    respondedAt: daysAgo(10),
  },
  {
    id: 'QRY-2002',
    studyId: 'STU01268',
    question:
      'Can the anti-emetic be given prophylactically before infusion, or only on symptom onset?',
    raisedByName: 'Lilly Joy',
    createdAt: daysAgo(3),
    status: 'open',
  },
]

export const medications: Medication[] = [
  {
    id: 'MED-3001',
    studyId: 'STU01268',
    name: 'Trastuzumab deruxtecan',
    description: 'Study drug, administered by infusion on day 1 of each 21 day cycle.',
    createdAt: daysAgo(70),
  },
  {
    id: 'MED-3002',
    studyId: 'STU01268',
    name: 'Ondansetron',
    description: 'Anti-emetic, taken as needed for nausea in the 48 hours after infusion.',
    createdAt: daysAgo(66),
  },
  {
    id: 'MED-3003',
    studyId: 'STU01359',
    name: 'Sacubitril/valsartan',
    description: 'Twice daily, titrated to the tolerated dose.',
    createdAt: daysAgo(30),
  },
]

/** Prescriptions are written during the study, so none are seeded. */
export const prescriptions: Prescription[] = []

export const studyAssets: StudyAsset[] = [
  {
    id: 'AST-4001',
    studyId: 'STU01268',
    type: 'Protocol doc',
    title: 'Protocol v3.2, amended dosing schedule',
    link: 'https://assets.patientrials.com/STU01268/protocol-v3-2.pdf',
    description: 'Current protocol, including the amended dosing schedule agreed in March.',
    documentName: 'protocol-v3-2.pdf',
    targetAudience: 'Site staff',
    status: 'published',
    createdAt: daysAgo(64),
    publishedAt: daysAgo(60),
  },
  {
    id: 'AST-4002',
    studyId: 'STU01268',
    type: 'Patient Material',
    title: 'What to expect at your first visit',
    link: '',
    description: 'Plain-language walkthrough of the screening visit, given to participants at consent.',
    documentName: 'first-visit-guide.pdf',
    targetAudience: 'Participants',
    status: 'published',
    createdAt: daysAgo(41),
    publishedAt: daysAgo(38),
  },
  {
    id: 'AST-4003',
    studyId: 'STU01268',
    type: 'Patient Material',
    title: 'Infusion handling refresher',
    link: '',
    description: 'Short refresher for nursing staff on preparation and handling.',
    status: 'draft',
    createdAt: daysAgo(9),
  },
  {
    id: 'AST-4004',
    studyId: 'STU01359',
    type: 'Marketing Material',
    title: 'Clinic waiting room poster',
    link: 'https://assets.patientrials.com/STU01359/poster-a3.pdf',
    description: 'A3 poster for the cardiology waiting room.',
    documentName: 'poster-a3.pdf',
    status: 'draft',
    createdAt: daysAgo(5),
  },
]

export const publicTrials: PublicTrial[] = [
  {
    nctId: 'NCT07764380',
    studyId: 'STU01268',
    title: 'Semaglutide for Weight Management in Adults With Type 2 Diabetes',
    summary:
      'A 52-week study of a once-weekly injectable treatment for adults living with type 2 diabetes who are working on weight management.',
    condition: 'Type 2 Diabetes',
    phase: 'Phase III',
    recruitmentStatus: 'Recruiting',
    sponsor: 'Novo Nordisk',
    minimumAge: '18',
    locations: ['Plano, Texas', 'Frisco, Texas'],
    eligibility: [
      'Adults aged 18 and over',
      'Diagnosed with type 2 diabetes',
      'Not currently enrolled in another trial',
    ],
    estimatedDuration: '52 weeks, about 9 visits',
  },
  {
    nctId: 'NCT06612094',
    studyId: 'STU01360',
    title: 'Inhaled Triple Therapy in Moderate to Severe COPD',
    summary:
      'A study comparing an inhaled triple therapy with standard care for adults with moderate to severe COPD.',
    condition: 'COPD',
    phase: 'Phase II',
    recruitmentStatus: 'Recruiting',
    sponsor: 'AstraZeneca',
    minimumAge: '40',
    locations: ['Plano, Texas'],
    eligibility: [
      'Adults aged 40 and over',
      'Physician-diagnosed COPD',
      'Current or former smoker',
    ],
    estimatedDuration: '24 weeks, about 6 visits',
  },
  {
    nctId: 'NCT05820117',
    studyId: 'STU01359',
    title: 'Novel Anticoagulant After Acute Coronary Syndrome',
    summary:
      'A 26-week study comparing two blood-thinning treatments in adults who have had a heart attack in the last 12 months.',
    condition: 'Acute Coronary Syndrome',
    phase: 'Phase II',
    recruitmentStatus: 'Not yet recruiting',
    sponsor: 'Johnson & Johnson',
    minimumAge: '21',
    locations: ['Dallas, Texas', 'Plano, Texas'],
    eligibility: [
      'Adults aged 21 and over',
      'Heart attack within the last 12 months',
      'Able to attend visits in the Dallas–Fort Worth area',
    ],
    estimatedDuration: '26 weeks, about 7 visits',
  },
]

/* ------------------------------------------- broadcasts, notes, transfers */

export const broadcasts: BroadcastMessage[] = [
  {
    id: 'MSG-1',
    studyId: 'STU01268',
    subject: 'Your next visit and what to bring',
    body: 'Please bring your current medication list and arrive fifteen minutes early so we can complete your vitals before you see the study team.',
    audience: 'recruited',
    recipientCount: 3,
    sentBy: 'Lilly Joy',
    sentAt: daysAgo(9),
  },
  {
    id: 'MSG-2',
    studyId: 'STU01268',
    subject: 'Thank you for completing pre-screening',
    body: 'We have everything we need for now. The study team will be in touch within a week to let you know whether you are eligible.',
    audience: 'prescreened',
    recipientCount: 2,
    sentBy: 'Lilly Joy',
    sentAt: daysAgo(21),
  },
]

export const subjectNotes: SubjectNote[] = [
  {
    id: 'NOTE-1',
    studyId: 'STU01268',
    subjectId: 'PT240103',
    body: 'Reported mild nausea for two days after the first dose. Settled without intervention; no change to the regimen.',
    author: 'Lilly Joy',
    createdAt: daysAgo(12),
  },
  {
    id: 'NOTE-2',
    studyId: 'STU01268',
    subjectId: 'PT240103',
    body: 'Prefers morning appointments. Works nights and cannot reliably attend before 10:00.',
    author: 'Judy Hopps',
    createdAt: daysAgo(19),
  },
  {
    id: 'NOTE-3',
    studyId: 'STU01268',
    subjectId: 'PT240108',
    body: 'Partner attends every visit and helps with the diary. Confirmed they may be present during assessments.',
    author: 'Lilly Joy',
    createdAt: daysAgo(5),
  },
]

export const transfers: Transfer[] = [
  {
    id: 'TRF-1',
    studyId: 'STU01268',
    subjectId: 'PT240108',
    toSiteName: 'Frisco Clinical Partners',
    reason: 'Relocating for work and can no longer reach this site for weekly visits.',
    status: 'initiated',
    initiatedBy: 'Lilly Joy',
    initiatedAt: daysAgo(4),
  },
  {
    id: 'TRF-2',
    studyId: 'STU01268',
    subjectId: 'PT240103',
    toSiteName: 'Sunshine Medical Center',
    reason: 'Requested a site closer to home after moving within the metro area.',
    status: 'accepted',
    initiatedBy: 'Lilly Joy',
    initiatedAt: daysAgo(34),
    resolvedAt: daysAgo(27),
    resolutionNote: 'Receiving site confirmed capacity and took over from visit four.',
  },
  {
    id: 'TRF-3',
    studyId: 'STU01268',
    subjectId: 'PT240100',
    toSiteName: 'Plano Clinical Research',
    reason: 'Asked to move to the site their consultant works from.',
    status: 'declined',
    initiatedBy: 'Judy Hopps',
    initiatedAt: daysAgo(46),
    resolvedAt: daysAgo(41),
    resolutionNote: 'Receiving site is not open to recruitment on this protocol.',
  },
]
