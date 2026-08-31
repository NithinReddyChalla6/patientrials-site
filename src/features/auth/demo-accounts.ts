/**
 * Seeded sign-ins, surfaced on the login screen.
 *
 * This build has no identity provider, so rather than leave a reviewer guessing
 * at credentials the demo accounts are listed with the role each one lands in.
 */
export const DEMO_ACCOUNTS = [
  { email: 'nick.wilde@plano-research.com', role: 'Site Administrator' },
  { email: 'lilly.joy@plano-research.com', role: 'Principal Investigator' },
  { email: 'marcus.bell@plano-research.com', role: 'Study Administrator' },
  { email: 'judy@hopps.com', role: 'Study Coordinator' },
  { email: 'robert@helsinki.com', role: 'Principal Investigator' },
] as const
