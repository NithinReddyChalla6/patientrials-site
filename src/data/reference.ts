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
  '(GMT+00:00) Greenwich Mean Time',
  '(GMT+01:00) Central European Time',
  '(GMT+02:00) Eastern European Time',
  '(GMT+05:30) India Standard Time',
  '(GMT+08:00) Singapore Standard Time',
  '(GMT+09:00) Japan Standard Time',
  '(GMT+10:00) Australian Eastern Time',
]

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
