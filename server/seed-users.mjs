/**
 * Seed accounts for the auth database — mirrors the front-end demo users so the
 * signed-in identity lines up with the (still-mock) site data. Passwords are the
 * plain values here ONLY so we can hash them on first run; they are never stored
 * in plain text. Every demo account shares one password for convenience.
 */
export const DEMO_PASSWORD = 'PatienTrials@2026'

export const SEED_USERS = [
  {
    id: 'USR-001',
    firstName: 'Nick',
    lastName: 'Wilde',
    email: 'nick.wilde@plano-research.com',
    role: 'site_administrator',
    siteId: 'SITE-MDASIT10',
    active: true,
    password: DEMO_PASSWORD,
  },
  {
    id: 'USR-002',
    firstName: 'Lilly',
    lastName: 'Joy',
    email: 'lilly.joy@plano-research.com',
    role: 'principal_investigator',
    siteId: 'SITE-MDASIT10',
    active: true,
    password: DEMO_PASSWORD,
  },
  {
    id: 'USR-003',
    firstName: 'Robert',
    lastName: 'Helsinki',
    email: 'robert@helsinki.com',
    role: 'principal_investigator',
    siteId: 'SITE-MDASIT10',
    active: true,
    password: DEMO_PASSWORD,
  },
  {
    id: 'USR-004',
    firstName: 'Judy',
    lastName: 'Hopps',
    email: 'judy@hopps.com',
    role: 'study_coordinator',
    siteId: 'SITE-MDASIT10',
    active: true,
    password: DEMO_PASSWORD,
  },
  {
    id: 'USR-005',
    firstName: 'Marcus',
    lastName: 'Bell',
    email: 'marcus.bell@plano-research.com',
    role: 'study_administrator',
    siteId: 'SITE-MDASIT10',
    active: true,
    password: DEMO_PASSWORD,
  },
  {
    id: 'USR-006',
    firstName: 'Priya',
    lastName: 'Raman',
    email: 'priya.raman@plano-research.com',
    role: 'clinical_staff',
    siteId: 'SITE-MDASIT10',
    active: false,
    password: DEMO_PASSWORD,
  },
]
