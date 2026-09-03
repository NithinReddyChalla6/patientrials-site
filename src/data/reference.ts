/**
 * Reference lists — the option sets the legacy forms offered.
 *
 * Everything here is taken from the Playwright specs or the legacy screenshots,
 * so the redesigned selects offer the same choices. Lists that the legacy loaded
 * from a lookup table are represented as searchable option arrays; the combobox
 * that consumes them is designed for lists of this size and larger.
 */

export const THERAPY_AREAS = [
  'Cardiovascular Disorders/Diseases-Acute Coronary Syndrome',
  'Cardiovascular Disorders/Diseases-Heart Failure',
  'Cardiovascular Disorders/Diseases-Hypertension',
  'Cardiovascular Disorders/Diseases-Peripheral Vascular Diseases',
  'Cardiovascular Disorders/Diseases-Arrhythmia',
  'Endocrine Disorders/Diseases-Type 1 Diabetes',
  'Endocrine Disorders/Diseases-Type 2 Diabetes',
  'Endocrine Disorders/Diseases-Obesity',
  'Immunology-Rheumatoid Arthritis',
  'Immunology-Psoriasis',
  'Infectious Diseases-Influenza',
  'Infectious Diseases-Hepatitis C',
  'Neurology-Alzheimer Disease',
  'Neurology-Migraine',
  'Neurology-Multiple Sclerosis',
  'Oncology-Breast Cancer',
  'Oncology-Non-Small Cell Lung Cancer',
  'Oncology-Colorectal Cancer',
  'Respiratory-Asthma',
  'Respiratory-COPD',
]

/** Facility types offered on the Approved Locations and Facility Services forms. */
export const FACILITY_TYPES = [
  'Clinics',
  'Hospitals',
  'Academic medical centers',
  'Diabetes education centers',
  'Imaging centers',
  'Infusion centers',
  'Dialysis centers',
  'Rehabilitation centers',
  'Research units',
  'Pharmacies',
]

export const COUNTRIES = [
  'United States of America',
  'Canada',
  'United Kingdom',
  'Ireland',
  'Germany',
  'France',
  'Spain',
  'Italy',
  'Netherlands',
  'Belgium',
  'Sweden',
  'Denmark',
  'Poland',
  'Australia',
  'New Zealand',
  'India',
  'Japan',
  'South Korea',
  'Singapore',
  'Brazil',
  'Mexico',
  'South Africa',
]

export const TIME_ZONES = [
  '(GMT-08:00) Pacific Time',
  '(GMT-07:00) Mountain Time',
  '(GMT-06:00) Central Time',
  '(GMT-05:00) Eastern Time',
  '(GMT-04:00) Atlantic Time',
  '(GMT-03:00) Brasília Time',
  '(GMT+00:00) Greenwich Mean Time',
  '(GMT+01:00) Central European Time',
  '(GMT+02:00) Eastern European Time',
  '(GMT+02:00) South Africa Standard Time',
  '(GMT+05:30) India Standard Time',
  '(GMT+08:00) Singapore Standard Time',
  '(GMT+09:00) Japan Standard Time',
  '(GMT+09:00) Korea Standard Time',
  '(GMT+10:00) Australian Eastern Time',
  '(GMT+12:00) New Zealand Time',
]

/**
 * The time zone a country most commonly uses, so selecting a country on the
 * sign-up form can pre-fill the time zone. Countries that span several zones
 * (US, Canada, Australia) get their most populous one as a starting point — the
 * field stays editable so a site can correct it. Every value is a member of
 * `TIME_ZONES`.
 */
export const COUNTRY_TIME_ZONE: Record<string, string> = {
  'United States of America': '(GMT-05:00) Eastern Time',
  Canada: '(GMT-05:00) Eastern Time',
  'United Kingdom': '(GMT+00:00) Greenwich Mean Time',
  Ireland: '(GMT+00:00) Greenwich Mean Time',
  Germany: '(GMT+01:00) Central European Time',
  France: '(GMT+01:00) Central European Time',
  Spain: '(GMT+01:00) Central European Time',
  Italy: '(GMT+01:00) Central European Time',
  Netherlands: '(GMT+01:00) Central European Time',
  Belgium: '(GMT+01:00) Central European Time',
  Sweden: '(GMT+01:00) Central European Time',
  Denmark: '(GMT+01:00) Central European Time',
  Poland: '(GMT+01:00) Central European Time',
  Australia: '(GMT+10:00) Australian Eastern Time',
  'New Zealand': '(GMT+12:00) New Zealand Time',
  India: '(GMT+05:30) India Standard Time',
  Japan: '(GMT+09:00) Japan Standard Time',
  'South Korea': '(GMT+09:00) Korea Standard Time',
  Singapore: '(GMT+08:00) Singapore Standard Time',
  Brazil: '(GMT-03:00) Brasília Time',
  Mexico: '(GMT-06:00) Central Time',
  'South Africa': '(GMT+02:00) South Africa Standard Time',
}

/** Bookable slots in the clinic day. */
export const APPOINTMENT_SLOTS = [
  '8:00 AM',
  '9:00 AM',
  '10:00 AM',
  '11:00 AM',
  '1:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
]

/** Who runs a group session. Separate from STAFF_ROLES, which are sign-in roles. */
export const SESSION_ROLES = [
  'Principal Investigator',
  'Clinical Nurse',
  'Study Coordinator',
  'Clinical Staff',
]

/** Dosing windows, as the legacy scheduler offered them. */
export const DOSE_WINDOWS = [
  '5AM to 7AM',
  '7AM to 9AM',
  '9AM to 12PM',
  '12PM to 3PM',
  '3PM to 6PM',
  '6PM to 9PM',
  '9PM to 12AM',
]

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

/** What a study asset is, so the list can be scanned by kind. */
export const ASSET_TYPES = [
  'Protocol',
  'Investigator brochure',
  'Training material',
  'Recruitment material',
  'Participant guide',
  'Regulatory document',
]

/** Who an asset is published to. */
export const ASSET_AUDIENCES = ['Participants', 'Site staff', 'Sponsor']

export const IRB_MEETING_FREQUENCIES = [
  'Weekly',
  'Every two weeks',
  'Monthly',
  'Quarterly',
  'As needed',
]

/* --------------------------------------------- participant enrollment sets */

export const GENDERS = ['Female', 'Male', 'Intersex', 'Prefer not to say']

export const SMOKING_STATUSES = ['Never smoked', 'Former smoker', 'Current smoker', 'Unknown']

export const PRIMARY_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Mandarin',
  'Hindi',
  'Arabic',
  'Portuguese',
  'Other',
]

/** Kept verbatim from the legacy enrollment form's checkbox names. */
export const ETHNICITIES = [
  'American Indian or Alaskan Native',
  'Asian or Pacific Islander',
  'Black or African American',
  'Hispanic or Latino',
  'White or Caucasian',
  'Two or more races',
  'Prefer not to say',
]

/* ---------------------------------------------------------- notifications */

export const NOTIFICATION_TEMPLATES = [
  'Daily wellbeing check-in',
  'Medication adherence',
  'Symptom diary',
  'Post-visit follow-up',
  'Adverse event screening',
]

/** Named rating presets; "Custom" unlocks the low/high label fields. */
export const RATING_PRESETS = [
  'Poor to Excellent',
  'Never to Always',
  'Strongly disagree to Strongly agree',
  'Not at all to Extremely',
  'Custom',
]

/** Roles a site can invite a collaborator into, matching the legacy select. */
export const STAFF_ROLES = [
  'Principal Investigator',
  'Clinical Staff',
  'Study Administrator',
  'Site Administrator',
  'Study Coordinator',
]
